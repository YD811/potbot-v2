# PotBot — On-chain Architecture & Privacy Model

> Canonical reference: what lives on-chain, what off-chain, and why exactly.
> Goal — maximise on-chain storage within safety and performance bounds; baseline privacy for every pot; maximum privacy as opt-in for private pots.

## Tier model — what goes where, and why

| Tier | Location | What | Why here |
|---|---|---|---|
| **0 — Trust spine** | On-chain regular accounts | Custody (vault PDA), authority, governance level/quorum/risk caps, allowed_mints, paused, defensive_only, member shares (Sprout+ via SPL mint), proposals + votes, `MemberDelegate`, Money Tree state (stage/HP/peak/is_dead), strategy triggers, treasury/fee_reserve | If any of this could be manipulated off-chain, the protocol is broken. No compromises. |
| **1 — Audit & evolution** | On-chain, but cheaper (Light Protocol Compressed Accounts / Anchor events) | Every swap/deposit/withdraw event, NAV snapshots, `proposal_description_hash`, `rules_uri_hash`, vote rationale string (≤200 chars), kill-switch invocations | Needed for audit trail and compromise detection, but the read pattern is append-only — ZK Compression cuts rent ~5000×. |
| **2 — Commitments** | On-chain hash-only | Hash of the full proposal description, hash of strategy params (private mode), hash of rules JSON, Merkle root of the member set (private mode) | Proves "this is the version" without storing heavy data on-chain. |
| **3 — Off-chain (anchored)** | IPFS/Arweave + Postgres | Full text of proposals/rationale, AI rules JSON, encrypted strategy blobs, leaderboard cache, chat, push, analytics graphs | Large/changing data. Cannot be silently replaced — Tier 2 hashes prevent forgery. |

**Classification rule:** if you would have to trust an off-chain endpoint for fund safety — it belongs in Tier 0. If only for UX — Tier 3.

---

## Concrete on-chain layout (additions to current state)

### Already on-chain ✅
`PotAccount`, `MemberAccount` (Sprout+), `ProposalAccount`, `VoterRecord`, `MemberDelegate`, vault PDA, fee_reserve.

### To add — Tier 0/1

```rust
// PotAccount additions
pub struct PotAccount {
    // ... existing fields ...
    pub privacy_mode: PrivacyMode,        // Public | AuditablePrivate | SealedPrivate
    pub member_set_root: [u8; 32],        // Merkle root, only used in private modes
    pub strategy_params_hash: [u8; 32],   // hash of encrypted strategy blob
    pub rules_uri_hash: [u8; 32],         // hash of off-chain AI rules JSON
    pub kill_switch_admin: Pubkey,        // separate from authority for safety
    pub last_health_check_slot: u64,
    pub max_drawdown_bps: u16,            // auto-pause if breached
    pub treasury_split_bps: TreasurySplit,// fee_reserve / yield / dev — on-chain config
}

// New: SwapEvent compressed account (Light Protocol)
pub struct SwapEvent {
    pub pot: Pubkey,
    pub proposal_id: Option<u64>,         // None for AdminDirect
    pub from_mint: Pubkey,
    pub to_mint: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub price_at_exec: u64,               // Pyth-verified, scaled
    pub slot: u64,
    pub mode: SwapMode,                   // Admin | Proposal | StrategyTrigger
    pub triggered_by: Option<Pubkey>,     // keeper, if StrategyTrigger
}

// New: NavSnapshot compressed account (per epoch — daily)
pub struct NavSnapshot {
    pub pot: Pubkey,
    pub epoch: u32,
    pub total_value_lamports: u64,
    pub holdings_hash: [u8; 32],          // hash of (mint, amount)[]
    pub slot: u64,
}
```

`SwapEvent` and `NavSnapshot` ride **Light Protocol ZK Compression** — cost ~$0.000005 per write instead of ~$0.002. Preserves audit trail without exponential rent burn.

### `ProposalAccount` — additions
```rust
pub description_uri: String,              // ipfs:// or ar://
pub description_hash: [u8; 32],           // verifiable
pub rationale_hash: [u8; 32],             // hash of AI's reasoning
pub commit_phase_end: Option<i64>,        // SealedPrivate only
pub reveal_phase_end: Option<i64>,        // SealedPrivate only
```

---

## Three privacy modes

| Mode | Members visible | Balances visible | Votes visible | Strategy params visible | When to use |
|---|---|---|---|---|---|
| **Public** (default) | ✅ pubkeys + shares | ✅ vault balance + holdings | ✅ instant on submission | ✅ | Public clubs, leaderboard pots, marketing |
| **Auditable-Private** | ❌ stealth addrs / shielded deposit via PrivacyCash | ✅ aggregate vault still public | ✅ instant but with stealth pubkey | ✅ | Family offices, friend groups with privacy preference |
| **Sealed-Private** | ❌ Merkle set, only root on-chain | ⚠️ shielded balances via Light Protocol or PrivacyCash | 🔒 commit→reveal with timeout | 🔒 encrypted blob, hash on-chain, members share viewing key off-chain | DAOs trading sensitive theses, large funds avoiding alpha leak |

### Auditable-Private — specifics
- Deposits route through **PrivacyCash** (or an Elusiv-style shielded pool) → vault PDA. The link "wallet X deposited N SOL" cannot be traced on-chain.
- Members register via a ZK proof of "I'm in the whitelist (Merkle membership)" — the on-chain pubkey is unrelated to the real owner.
- Everything else (vault balance, swaps, proposals) stays public — that's what "auditable" means: outsiders see what the pot does, not who's in it.

### Sealed-Private — specifics
- **Commit-reveal voting:** Phase 1 — submit `H(vote || nonce)`. Phase 2 (after `commit_phase_end`) — reveal `(vote, nonce)`. Tally only after `reveal_phase_end`. Defends against vote-following whales.
- **Strategy params encrypted:** AES-256 blob with a symmetric key. The key is shared with members via a NaCl box encrypted with their public keys (in `MemberAccount.encrypted_viewing_key`). Only the hash lives on-chain → silent substitution is impossible.
- **Shielded balances:** internal accounting via ZK Compressed accounts or Light Protocol confidential transfer. Trade-off: at swap-execute time the mints still leak (Jupiter CPI requires the pubkey). Mitigation — batch route through a time-delayed mixer pool so the "member → swap" correlation gets blurred.

---

## Performance plan

| Problem | Solution |
|---|---|
| Rent burn from audit log (1000+ swaps/year per pot) | **Light Protocol ZK Compression** — `SwapEvent`, `NavSnapshot`, `VoterRecord` for large pots in private mode |
| Iterate over 10K members in one tx | Never. Member shares are stored per-account, aggregates (`total_shares`) update by delta. |
| Leaderboard read across all pots | Helius webhook → Postgres indexer. UI reads the indexer, not RPC. On-chain remains source of truth for verification. |
| Jupiter swap tx > 1232 bytes (account list) | **Address Lookup Tables (ALT)** per pot for frequently used mints |
| Compute budget for vote + delegate-check + tally update | Current ix < 60K CU, plenty of headroom. Not a problem yet. |
| Time-to-finality for UX | Optimistic UI: show "pending" right after `confirmed`, finalise on `finalized`. 400–600ms perceived. |
| Cold reads of vault holdings | Dune SIM `/svm/balances` already gives a cached aggregate, RPC fallback. |

---

## Off-chain — what and where, with on-chain anchor

| Off-chain data | Where it lives | On-chain anchor |
|---|---|---|
| AI rules JSON (delegate behaviour) | IPFS/Arweave | `MemberDelegate.rules_uri` + `rules_uri_hash` |
| Proposal description (long text) | IPFS | `ProposalAccount.description_uri` + `description_hash` |
| AI rationale per vote | Arweave (immutable) | `VoterRecord.rationale_hash` |
| Encrypted strategy params (private pot) | IPFS encrypted blob | `PotAccount.strategy_params_hash` |
| Member roster (private pot) | Off-chain Merkle tree, served via API | `PotAccount.member_set_root` |
| Chat / messages | Postgres + Redis | None — UX only |
| Historical NAV graph | Postgres timeseries (computed from on-chain `NavSnapshot`) | Source — on-chain snapshots |
| Push notifications | Workers + Web Push | None |
| Leaderboard cache | Postgres (Helius webhook fed) | Source — `getProgramAccounts` |
| User profile / display name | Postgres | None — purely cosmetic |

Principle: if the user says "I don't trust your server", they must be able to **verify** the off-chain blob is authentic from the on-chain anchor.

---

## Threat model — what each tier defends against

| Threat | Defence |
|---|---|
| Backend drains pot | Impossible — authority = vault PDA, signs only when program rules pass |
| Backend silently changes governance quorum | Impossible — Tier 0 on chain, only the authority writes |
| Backend swaps AI rules | Tier 2: `rules_uri_hash` is fixed on-chain; any change breaks the link, visible immediately |
| Backend forges proposal description | Tier 2: `description_hash` |
| Frontend lies about proposal status | Impossible — UI reads RPC directly; backend is out of the trust path for core flows |
| Backend goes dark | Pot keeps working through any Solana RPC + raw ix builders from MCP. Backend = UX layer, not a required path. |
| Single member withdraws whale-size → vote manipulation | Quorum + timelock + commit-reveal in private mode |
| AI delegate makes a rogue proposal | Risk caps on-chain (`max_swap_pct`, `max_budget_grant_pct`), defensive_only mode, `revoke_delegate` one ix away |
| Public pot → MEV/sandwich on swap | Jupiter with slippage enforced on-chain + Helius priority fee + private mempool (Jito) |
| Whale sees other votes and copy-trades | Sealed-Private mode commit-reveal |
| Competitors see strategy and copy it | Sealed-Private mode encrypted strategy blob |
| Regulator wants to see who's in the pot | Auditable-Private mode shielded deposits |

---

## Phasing — implementation sequence

| Phase | What | When | Risk |
|---|---|---|---|
| **0 — Hackathon (now)** | All Tier 0 already on-chain. Anchor events for Tier 1. Public mode only. | ✅ done | low |
| **1 — Q2 2026** | `init_share_mint` (member shares in SPL), Tier 1 on Light Protocol Compressed Accounts (`SwapEvent`, `NavSnapshot`), `description_hash`/`rules_uri_hash` commitments, `max_drawdown_bps` auto-pause | post-hackathon | low — additive |
| **2 — Q3 2026** | Auditable-Private mode: PrivacyCash integration for deposits, Merkle membership proofs, stealth addresses in `MemberAccount` | Q3 | medium — needs ZK circuit audit |
| **3 — Q4 2026** | Sealed-Private mode: commit-reveal voting, encrypted strategy params, shielded balances via Light Protocol confidential transfer | Q4 | high — UX complexity, key management |
| **4 — 2027** | Cross-pot composability (one member, many pots, single view), DAO meta-governance, Squads v4 as `kill_switch_admin` for all Sealed pots | 2027 | medium |

---

## PotBot-specifics — why this is the right architecture for the business

1. **Money Tree state lives entirely on-chain**, already does. Never move it off-chain — it's part of the game theory; putting it at risk would kill the core mechanic.
2. **Referral / Money Tree splits** — keep as an **on-chain config struct** in `PotAccount` (`treasury_split_bps`), not as backend magic numbers. Otherwise users cannot prove the split is fair.
3. **Health check as a separate ix** — keeper crank `update_health()` writes `health_hp` and `last_health_check_slot` on-chain. If the slot is stale > N, the UI shows "stale, kicking keeper". This is both safety and UX.
4. **AI rules versioning:** `rules_uri` = `ar://<arweave-tx>` (immutable). Member wants to update → new ar tx → `register_delegate` again with the new URI. The old version remains forever auditable. Differentiator vs competitors that allow silently mutating rules.
5. **Kill switch separate from authority** — `kill_switch_admin` (operational wallet or Squads on mainnet). Can pause the pot but **cannot drain**. Insurance against "AI delegate gone wrong" — users trust an operational pause without trusting custody.
6. **Private pots = premium tier** — Auditable-Private and Sealed-Private are a monetisation hook. Public pots free, private = subscription or per-pot one-time fee. Tech debt is paid back by revenue.

---

## Migration safety

For any on-chain layout change via upgrade:

- **Append-only to `PotAccount`** — never reorder/remove fields. Borsh decoders in MCP/SDK decode **the prefix**, so new fields don't break old clients.
- **Discriminator-stable** — `sha256("account:PotAccount")[..8]` does not change; existing PDAs read without migration.
- **Default-on-init** for new fields via an `init_if_needed`-style migration ix (`migrate_pot_v2`) applied on the first write after upgrade.
- All breaking changes — via a **new account type** (`PotAccountV2`) with dual-read in the SDK during the grace window.
