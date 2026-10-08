# pot_index — PotBot Portfolios program

Built during Colosseum **Crypto World's Fair** (Sept 14 – Oct 12, 2026). This is a new, standalone
Anchor 1.2 workspace; the legacy `pot_vault` program in `packages/program` is untouched.

## What it does

A **Pot** is a non-custodial basket of Solana assets with fixed target weights.

| Action | Who | What happens |
| --- | --- | --- |
| `create_pot` → `add_leg` × 2–5 → `finalize_pot` | creator | Pot PDA, index mint (6 dec), one vault ATA per asset + a USDC cash vault. Weights lock at finalize. |
| `deposit(amount, min_shares_out)` | anyone | USDC in; 0.30% fee split 40/40/20 referrer/creator/protocol (no referrer → creator 80%); index tokens minted at NAV. |
| `exit(shares, min_usdc_out)` | holder | Burn index tokens, receive a pro-rata share of **every** leg in kind. 0.50% stays in the Pot. Never pausable, needs no oracle. |
| `rebalance_open` + `rebalance_close` | anyone (keeper) | Same-transaction "flash trade" bounded on-chain: only overweight → underweight, never past target, ≤ `max_trade_bps` of NAV, received ≥ Pyth value × (1 − `slippage_bps`). `rebalance_open` introspects the transaction and refuses unless a matching `rebalance_close` follows. |
| `set_pot_params` | creator | Pause deposits, change the deposit cap. Weights are immutable. |
| `init_config`, `set_config`, `register_asset`, `set_asset_enabled` | admin | Protocol settings and the asset allowlist (mint + Pyth feed id). |

There is **no withdraw instruction**. Assets leave a Pot only as a proportional share.

NAV = USDC cash + Σ (vault balance × Pyth price), with staleness (`max_price_age_secs`, hard-capped at
300 s) and confidence (≤ 2%) checks. Pricing is conservative for the Pot: what the Pot holds or gives
away is valued at `price + conf`, what it receives at `price − conf`. First-depositor inflation is
blunted by a phantom $1 / 1 share. Rebalances need a 0.5%-of-NAV deadband and ~1 minute cooldown.

## Security review (Oct 8)

Independent checklist review (Solana Foundation + repo `solana-security-review` skill): no criticals.
Fixed in-code: oracle age cap + conservative confidence pricing (H1), rebalance deadband/cooldown and
1% max slippage (M1), two-step admin transfer and USDC-decimals check (M2), exit safety valve against a
stale rebalance flag (L1), ATA `init_if_needed` against pre-creation griefing (L2), 1 USDC minimum
deposit (L5). Open by design / policy: referral share can be self-rebated by a second wallet (M3 —
mitigated later with registered referrers); keeper slippage is the implicit rebalance fee (M1);
admin should be a Squads multisig on mainnet.

## Build & test

```bash
anchor build          # deployable artifact (SBPF v3) + IDL at target/idl/pot_index.json
./test.sh             # SBPF v0 build + LiteSVM tests (unit + end-to-end)
```

Tests cover: create/finalize/auth, deposit fee split, bounded rebalance (missing close, trade too
large, slippage revert, overshoot, not-overweight), NAV-priced second deposit, in-kind exit with
exit fee, pause semantics, stale and wrong-feed oracle rejection, weights-must-sum.

## Layout

```
programs/pot_index/src/
  lib.rs            instruction entrypoints
  state.rs          Config, AssetConfig, Pot, Leg, RebalanceState
  oracle.rs         Pyth reads, NAV, share math
  instructions/     admin.rs, pot.rs, deposit.rs, exit.rs, rebalance.rs
  constants.rs      fees, limits, seeds
  errors.rs         PotError (6000+)
programs/pot_index/tests/pot_flow.rs   LiteSVM end-to-end tests
```
