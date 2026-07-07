# Index Vault — architecture & math

> **PotBot is infrastructure for on-chain vaults — think S&P 500, but on the blockchain.**
> Drop in USDC → receive a liquid index token (iPOT) → stay liquid while your capital works.

A POT is a container for tokenized assets. The index layer turns that container into a
diversified, income-generating basket whose ownership is a single composable SPL token.
This document covers the on-chain design, the pricing math, the yield/looping economics,
and the security model. Program source: `packages/program/programs/pot_vault/src/`
(`state/strategy_config.rs`, `instructions/index_*.rs`).

---

## 1. System shape

```
Investor                        Program (vault PDA)                     Keeper
   │ deposit_base(USDC) ─────▶ mint iPOT at NAV ◀──── update_nav_snapshot (60s)
   │ receive iPOT               USDC → idle buffer (5–10% of NAV)         │ guarded:
   │                            │                                         │ staleness (slots)
   │                            ▼ deploy_to_strategy (keeper, capped)     │ deviation (bps)
   │                            index legs per StrategyConfig weights
   │                            → Kamino lend / Meteora DLMM (Phase 2 CPI)
   │
   │ redeem ────────────────▶ instant from buffer, else queue ──────▶ keeper unwinds
   │                            (escrow now, priced at settlement NAV)    & settles
```

Four accounts run the show:

| Account | PDA seeds | Role |
|---|---|---|
| `StrategyConfig` | `["strategy", pot]` | weights (≤10 legs, Σ=100%), caps, idle buffer, NAV guards, keeper identity |
| `TokenAllowlist` | `["allowlist"]` | global mint allowlist (≤100, classes: Stable / StakedSol / RwaStock) |
| `StrategyPosition` | `["position", pot, mint, route]` | per-leg cost basis + route receipts |
| `RedeemRequest` | `["redeem", pot, member, id]` | queued redemption escrow ticket |

The pot itself carries `index_mint`, `is_flagship`, and `Option<NavSnapshot>` (carved from
the reserved tail — old accounts stay readable).

## 2. How the index token is priced

All accounting is in base units of `StrategyConfig.base_mint` (USDC, 1e6).

**NAV** is written by the keeper as one number — total basket value in base units:

```
NAV = idle_base + Σ leg_value(position)
```

Per-share price is never stored; it is derived at use time from the live iPOT supply, so
mints between snapshots cannot be gamed:

```
price/share = NAV / supply
```

**Mint (deposit):**

```
shares = deposit × supply / NAV          (bootstrap: first deposit mints 1:1)
```

**Redeem (burn):**

```
payout = shares × NAV / supply
```

Two invariants make this fair:

1. **Flows move NAV and supply proportionally.** The program adds every deposit to the
   snapshot value and subtracts every payout — so deposits/redemptions never move
   price/share. Only the keeper repricing legs does.
2. **Both directions carry user-set slippage floors** (`min_shares_out`, `min_out_base`),
   checked on-chain.

**Snapshot guards** (the circuit breaker against a fat-fingered or hijacked keeper):

- *Staleness*: mint/redeem refuse a snapshot older than `nav_staleness_slots`.
- *Deviation*: a new snapshot may not move NAV by more than `max_nav_deviation_bps`
  vs the previous one. A compromised keeper can neither mint itself cheap shares nor
  drain via redeem in one shot; the pot authority is the break-glass override.

Current pricing phase: **book value** — routes hold base units in escrow, so
`leg_value = cost basis` exactly. When the Kamino/Meteora CPI adapters land, the keeper
prices receipts via their SDKs + Jupiter Price API v2 and nothing else changes.

## 3. Redemptions: buffer, then queue

- `idle_buffer_bps` of NAV (5–10%) always stays as liquid USDC — `deploy_to_strategy`
  cannot breach it (`InsufficientIdleBuffer`).
- `redeem_instant` pays from that buffer in the same transaction.
- If the buffer can't cover it, the client falls back to `request_redeem`: iPOT is
  escrowed immediately (no double-spend), the keeper unwinds positions and settles.
  **Queue holders are priced at settlement NAV**, like an ETF redemption — they bear
  market risk until settled. `cancel_redeem` returns the escrow any time before that.
- Settlement is a permissionless crank: whoever calls it, the payout can only reach the
  requester's own ATA.
- **Exits are never blockable.** Neither `pause` (strategy) nor `freeze` (pot) gates
  redemption paths, and `withdraw_from_strategy` works while paused — pausing must never
  trap capital outside the buffer.

## 4. Yield routing & the looping economy

**Propose/crank, never custody.** Deposits land as idle USDC. The keeper computes the
target allocation from `StrategyConfig.weights` (flagship POT-1: 45% Stable · 35% Staked
SOL · 20% RWA basket, ±band) and cranks `deploy_to_strategy` — the *program* signs the
movement from the vault PDA, only into allowlisted legs, only above the buffer floor.
The keeper has no instruction that can pay an external wallet. Assembly order for the
adapters: (1) Kamino klend USDC supply/withdraw → (2) Meteora DLMM stable LP →
(3) Kamino kliquidity SOL/LST → (4) rebalance loop.

**Looping: when leverage is free.** iPOT is a plain SPL token, so it is collateral-grade
by construction. The Phase-2 loop:

```
deposit SOL/LST collateral → borrow stables (Kamino/MarginFi)
  → deposit borrowed USDC into the POT → receive more iPOT
  → (optionally re-collateralize) … unwind: repay → release collateral
```

The loop is self-funding while the basket out-earns the debt:

```
loop is profitable  ⟺  yield_basket ≥ borrow_rate + fees

net APY ≈ y + L·(y − b)        y = basket yield, b = borrow rate,
                               L = borrowed/equity (leverage from LTV)
```

At `y = 8%`, `b = 5%`, `L = 1.5×`: net ≈ 12.5%. At `b > y` the loop bleeds — which is why
the looping layer ships behind a flag, with the borrow-rate check in the keeper and a
separate mainnet enable decision. Interfaces (routes, positions) are already shaped for it.

## 5. Security model

| Layer | Mechanism |
|---|---|
| Custody | funds only in vault-PDA-owned token accounts; outbound transfers only to the redeeming member's ATA |
| Keeper | allowlisted pubkey, crank-only; NAV writes deviation-capped; gas wallet only |
| Assets | global on-chain allowlist (client registry must be a subset) |
| Caps | TVL cap, per-deposit min/max, idle-buffer floor, max slippage ≤ program-wide 5% |
| Pause | authority or sentinel pauses deposits+deploys; only authority unpauses; exits stay open |
| Authority | flagship on mainnet: Squads multisig before public deposits (see runbook) |
| Launch | week-one caps low (proposed: 50k USDC TVL / 5k per deposit) |

Known TODO before public mainnet deposits: wire `update_strategy_config` loosening
changes into the existing `PendingRiskParams` timelock machinery (tightening stays
instant).

## 6. Instruction reference

| Instruction | Signer | Notes |
|---|---|---|
| `init_allowlist` / `set_allowlist` | protocol authority | replace-whole-list semantics |
| `init_index_mint` → `init_strategy_config` | pot authority | two-step bootstrap (one `init` per ix — 4KB BPF stack); vault ATAs created client-side |
| `init_position` → `init_position_vault` | keeper/authority | one-time per leg |
| `deposit_base(amount, min_shares)` | anyone | caps + fresh NAV + slippage floor |
| `redeem_instant(amount, min_out)` | holder | buffer-served, never pause-gated |
| `request_redeem` / `settle_redeem` / `cancel_redeem` | holder / anyone / holder | queue with escrow; settle is permissionless |
| `deploy_to_strategy` / `withdraw_from_strategy` | keeper/authority | route+mint must match config; buffer floor on deploy; withdraw works while paused |
| `update_nav_snapshot(value)` | keeper/authority | monotonic slot + deviation cap |
| `set_strategy_paused` / `update_strategy_config` | authority (sentinel may pause) | launch-guard tuning |

SDK mirror: `packages/sdk/src/index-vault.ts` (builders for everything above),
`pda.ts` (all PDAs). Keeper: `apps/keeper/src/index-crank.ts`.
