# PotBot — Program Phase 1 Spec (post-hackathon)

> Implements the **Phase 1** row of [docs/ARCHITECTURE_ONCHAIN.md](ARCHITECTURE_ONCHAIN.md):
> hash commitments + auto-pause + kill-switch + health-check + Tier-1 events
> on Light Protocol Compressed Accounts.
>
> **Target start:** post-hackathon (after 2026-05-11), so we don't risk the live
> devnet program before judging. Spec is PR-ready — another contributor can pick it up.
>
> **Live program:** `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK` (devnet).
> Migration is **append-only** to `PotAccount` so existing PDAs keep decoding.

---

## Goals

1. **Commit-and-verify off-chain blobs** — `description_hash`, `rules_uri_hash`, `strategy_params_hash` so backend can't silently mutate AI rules / proposal text / strategy params.
2. **Auto-pause on max drawdown** — protect members from runaway loss without requiring multisig.
3. **Kill-switch separation** — operational pause authority distinct from `authority` (cannot drain).
4. **Health crank** — observable, on-chain Money Tree HP from anyone.
5. **Cheap audit log** — every swap / NAV snapshot to Light Protocol compressed accounts (~$0.000005/write).

Out of scope for Phase 1: privacy modes, share mint init, ZK shielded balances. Those are Phase 2/3.

---

## 1. PotAccount — additive fields

Append to end of struct (Borsh decoders read prefix; existing PDAs keep working). All new fields default to zero/None on first migration via `migrate_pot_v1_to_phase1` ix.

```rust
// packages/program/programs/pot_vault/src/state/pot.rs — PotAccount additions
pub rules_uri_hash: [u8; 32],          // hash of off-chain delegate rules JSON aggregate
pub strategy_params_hash: [u8; 32],    // hash of encrypted strategy blob (private mode)
pub kill_switch_admin: Pubkey,         // separate from authority — pause-only
pub kill_switch_paused: bool,          // distinct from `paused` (which is authority's lever)
pub max_drawdown_bps: u16,             // 0 = disabled. e.g. 2000 = auto-pause if NAV ≤ 80% of peak
pub last_health_check_slot: u64,       // crank freshness
pub last_health_hp: u8,                // 0..=100, computed at last crank
pub treasury_split_bps: TreasurySplit, // on-chain config replacing magic numbers
```

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct TreasurySplit {
    pub fee_reserve_bps: u16,   // share of protocol_fee that funds keeper gas
    pub yield_bps: u16,         // share routed to yield strategy
    pub dev_bps: u16,           // platform fee
}
// Invariant: fee_reserve_bps + yield_bps + dev_bps == 10_000
```

### Migration

```rust
// new ix: migrate_pot_v1_to_phase1(ctx)
// Anyone can call (idempotent). Sets new fields to defaults if zeroed.
// Defaults:
//   rules_uri_hash, strategy_params_hash = [0; 32]
//   kill_switch_admin = pot.authority (owner can opt-in to delegate later)
//   kill_switch_paused = false
//   max_drawdown_bps = 0 (disabled until owner enables)
//   last_health_check_slot = current slot
//   last_health_hp = 100
//   treasury_split_bps = { fee_reserve: 2000, yield: 7000, dev: 1000 }
```

The migration ix uses `realloc` to grow the account by exactly the sum of new field widths and rent-exempt-tops up from `payer`.

---

## 2. ProposalAccount — additive fields

```rust
// packages/program/programs/pot_vault/src/state/proposal.rs additions
pub description_uri: String,      // ipfs:// or ar://, max_len 200
pub description_hash: [u8; 32],   // SHA256 of fetched bytes
pub rationale_hash: [u8; 32],     // SHA256 of AI's reasoning text (off-chain)
```

`create_proposal` ix gains optional `description_uri`/`description_hash`/`rationale_hash` params (zero arrays = absent). Already-deployed proposals are unaffected.

---

## 3. New instructions

### 3.1 `set_kill_switch_admin(new_admin: Pubkey)`
- **Signer:** current `authority` (only; one-shot transfer).
- **Effect:** `pot.kill_switch_admin = new_admin`.
- **Why:** lets owner promote a Squads multisig (mainnet) or operational EOA to the pause role without granting custody.

### 3.2 `kill_switch_pause(paused: bool)`
- **Signer:** `pot.kill_switch_admin`.
- **Effect:** sets `pot.kill_switch_paused = paused`.
- **Effect on `execute_swap` / `deposit` / `withdraw`:** rejects with `KillSwitchActive` when `kill_switch_paused`.
- **Cannot:** drain, change authority, or change governance — pause-only.
- **Event:** `KillSwitchToggled { pot, by, paused, slot }`.

### 3.3 `update_health()`
- **Signer:** anyone (permissionless crank).
- **Reads:** vault PDA balance + `pot.high_water_mark`.
- **Writes:**
  - `last_health_hp = clamp(0, 100, 100 * vault_lamports / high_water_mark)` (saturate to 0 if HWM=0)
  - `last_health_check_slot = clock.slot`
- **Auto-pause check:** if `max_drawdown_bps > 0` AND `last_health_hp < (100 - max_drawdown_bps / 100)`, set `pot.paused = true` and emit `AutoPaused { reason: "max_drawdown" }`. Owner unpauses via existing `pot_admin`.
- **Cooldown:** rejects if called within 60 slots of `last_health_check_slot` (prevents spam).
- **Event:** `HealthCheckCranked { pot, hp, vault_lamports, high_water_mark, slot }`.

### 3.4 `set_max_drawdown(bps: u16)`
- **Signer:** `pot.authority`.
- **Constraint:** `bps <= 5000` (50% max — sanity bound).
- **Effect:** `pot.max_drawdown_bps = bps`.

### 3.5 `commit_rules_uri_hash(hash: [u8; 32])`
- **Signer:** `pot.authority`.
- **Effect:** `pot.rules_uri_hash = hash`.
- **Use:** owner publishes the canonical hash of the aggregate `MemberDelegate.rules_uri` set; off-chain backend serving rules can be verified against it.

### 3.6 `commit_strategy_params_hash(hash: [u8; 32])`
- **Signer:** `pot.authority`.
- **Effect:** `pot.strategy_params_hash = hash`.

### 3.7 `set_treasury_split(split: TreasurySplit)`
- **Signer:** `pot.authority`.
- **Constraint:** sum == 10_000.
- **Effect:** writes split.
- **Note:** does not redistribute already-collected fees — applies to new collections.

### 3.8 `migrate_pot_v1_to_phase1()`
- **Signer:** `payer` (rent funder, anyone). Idempotent.
- **Effect:** described above. Verifies `pot.kill_switch_admin == Pubkey::default()` to prevent re-migration.

---

## 4. Tier-1 events on Light Protocol Compressed Accounts

Spec only — implementation in a follow-up PR after Light Protocol SDK pin lands.

### 4.1 `SwapEvent` (compressed)
```rust
pub struct SwapEvent {
    pub pot: Pubkey,
    pub proposal_id: Option<u64>,
    pub from_mint: Pubkey,
    pub to_mint: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub price_at_exec: u64,    // Pyth-verified, scaled 1e8
    pub slot: u64,
    pub mode: SwapMode,
    pub triggered_by: Option<Pubkey>,
}
```
Written from inside `execute_swap` after Jupiter CPI succeeds. Cost: ~$0.000005/write vs ~$0.002 for a regular account.

### 4.2 `NavSnapshot` (compressed, per-day)
```rust
pub struct NavSnapshot {
    pub pot: Pubkey,
    pub epoch: u32,             // unix_day
    pub total_value_lamports: u64,
    pub holdings_hash: [u8; 32], // SHA256(sorted (mint, amount)[])
    pub slot: u64,
}
```
Written by a permissionless `snapshot_nav()` crank ix once per UTC day per pot.

### 4.3 Adoption path
Add `light-system-program` CPI dependency. Compressed account writes happen inside existing ix (no separate tx). Indexers (Helius webhook → Postgres) reconstruct the timeseries; UI reads from indexer.

---

## 5. Security checks (apply across all new ix)

- `require!(!pot.kill_switch_paused, KillSwitchActive)` — added to `execute_swap`, `deposit`, `withdraw`, `create_proposal`.
- `require!(pot.authority != Pubkey::default())` everywhere (defense against zeroed account).
- `require!(treasury_split.fee_reserve_bps + yield_bps + dev_bps == 10_000)` on `set_treasury_split`.
- `require!(bps <= 5000)` on `set_max_drawdown`.
- `update_health` cooldown enforced via `clock.slot - last_health_check_slot >= 60`.
- All hash-commit ix accept zero hash to "clear" the commitment (explicit, not silent).

---

## 6. Test plan

Anchor-test (`packages/program/tests/`):

1. **migrate_pot_v1_to_phase1** — pre-migration `PotAccount` reallocs, defaults populate, second call rejects.
2. **kill_switch path** — owner sets admin, admin pauses, `execute_swap` rejects, admin unpauses, swap succeeds. Admin tries to drain → fails.
3. **update_health** — HWM=10 SOL, vault=4 SOL → HP=40. With `max_drawdown_bps=5000`, pot auto-pauses. Cooldown rejects rapid second call.
4. **commit hashes** — write/read round-trip on `rules_uri_hash`, `strategy_params_hash`, `description_hash`.
5. **treasury_split** — invalid sum rejected; valid sum stored.
6. **back-compat** — load a pre-migration `PotAccount` with current SDK Borsh decoder. Decode succeeds for prefix; new fields read as defaults.

Devnet smoke test script: `apps/potbot-mcp/scripts/phase1-smoke.mjs` — full flow on fresh test pot.

---

## 7. SDK + MCP updates

### `@potbot/sdk`
- Extend `decodePotAccount` to read new fields (lazy: returns `null` if buffer too short → pre-migration pot).
- Add ix builders: `migratePotV1ToPhase1Ix`, `killSwitchPauseIx`, `updateHealthIx`, `commitRulesUriHashIx`, etc.

### `@potbot/mcp`
- Add tools: `update_health(pot)`, `kill_switch_pause(pot, paused)`, `commit_rules_uri_hash(pot, hash)`.
- `get_vault_analytics` — surface `last_health_hp` + `last_health_check_slot` + `kill_switch_paused`.
- `get_proposals` — surface `description_uri` + verify `description_hash` matches fetched IPFS bytes (tool flags mismatches as `description_hash_invalid`).

### DApp (`apps/web`)
- Pot detail page — health bar reads `last_health_hp`, badge "Stale" when slot delta > 1000.
- Settings tab — UI for setting `max_drawdown_bps`, `kill_switch_admin`, `treasury_split`.
- AI Agent tab — display `rules_uri_hash` next to delegate, color-code "verified" / "drift" against off-chain rules.

---

## 8. Rollout order

1. **PR-A (program)**: append fields to `PotAccount` + `ProposalAccount`, add `migrate_pot_v1_to_phase1`, `set_kill_switch_admin`, `kill_switch_pause`, `update_health`, `set_max_drawdown`, `commit_rules_uri_hash`, `commit_strategy_params_hash`, `set_treasury_split`. Anchor tests. CI green.
2. **PR-B (deploy)**: build + buffer-deploy upgrade to devnet. Run `migrate_pot_v1_to_phase1` against existing demo pot. Verify on Explorer.
3. **PR-C (SDK + MCP)**: decoder + ix builders + new MCP tools. Publish `@potbot/mcp@0.7.0`.
4. **PR-D (DApp)**: health bar, settings UI, hash-verification badges.
5. **PR-E (Light Protocol events)**: separate, larger PR — compressed `SwapEvent` + `NavSnapshot` + `snapshot_nav` crank. Indexer (Helius webhook → Postgres) for read-side.

Each PR is independently shippable. PR-A is the only one that touches the program.

---

## 9. Risk / mitigation

| Risk | Mitigation |
|---|---|
| Migration ix reentrancy / partial state | Reject if `kill_switch_admin != Pubkey::default()` (post-migration sentinel) |
| Owner forgets to set `kill_switch_admin` distinct from authority | Default keeps it = authority (no protection delta), but pause-vs-drain split is documented; owner gets nag on dApp until explicit `set_kill_switch_admin` call |
| `update_health` spam | 60-slot cooldown |
| Auto-pause griefing (HWM was set artificially high) | HWM is monotonic (only goes up on positive NAV). Cannot be set manually. |
| Light Protocol SDK churn | Spec only — compressed events deferred until SDK pin lands. Regular Anchor events as fallback. |
| Backwards-compat with already-deployed program | Append-only struct + lazy decoder. Pre-migration pots keep working until owner calls `migrate_pot_v1_to_phase1`. |

---

## 10. What this unlocks (Phase 2 prerequisites)

- `member_set_root` for Auditable-Private mode → reuse `[u8; 32]` field pattern.
- Commit-reveal voting → reuses `description_hash` precedent.
- ZK shielded balances → reuses Light Protocol integration from `SwapEvent`.

Phase 1 is the trust scaffolding privacy modes will build on.
