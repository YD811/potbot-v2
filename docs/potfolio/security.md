# Security review: pot_index

Two passes against the Solana Foundation program-security checklist and the repo's `solana-security-review` skill: Oct 8 (initial program) and Oct 10 (after exit-to-USDC, deposit-and-allocate, cash-deploy cooldown change). The Oct 10 pass was run by an independent reviewer agent that had not seen the code being written. Result: **no Critical or High findings.** Everything below is fixed in code unless marked accepted.

## Oct 10 findings and what changed

| # | Severity | Finding | Fix |
|---|---|---|---|
| M1 | Medium | A caller could pick the most favourable Pyth tick of the last `max_price_age_secs` (300 s) by posting an older VAA: deposit at a low NAV, or rebalance at a flattering price. | `oracle::read_price` now also requires the update account to have been **posted within 150 slots** (`MAX_POSTED_SLOT_AGE`, about a minute), on top of the publish-time age check. Mainnet config will also lower `max_price_age_secs`. |
| M2 | Medium | Cash deployment (buying a fresh deposit into the basket) is permissionless and, since Oct 10, uncooled; a keeper's margin was slippage band + Pyth confidence on every deposited dollar. | Cash deploys are now priced at the **mid price** (`price`, not `price − conf`): the keeper's margin is the slippage band alone. Asset→asset rotations keep the conservative `price − conf`. |
| L1 | Low | Cash deploys reset `last_rebalance_slot`, so tiny fair-value deploys could keep rotations blocked forever. | Cash deploys no longer touch `last_rebalance_slot`. Test asserts it. |
| L2 | Low | The holder's own `min_usdc_out` on exit-to-USDC was checked against the pre-trade floor, not the actual proceeds. | `exit_usdc_close` enforces `max(Pot floor, holder floor)`. Test: a floor above the sale reverts the whole transaction, tokens stay with the holder. |
| L3 | Low | Conversion fee is charged on the floor, not actual proceeds, and avoidable by exiting in kind and swapping yourself. | Accepted: the fee pays for the one-click path; in-kind exit stays free of it by design. |
| I1 | Info | `total_exits_usd` can be inflated by self-transferring USDC between open and close. | Accepted; it is a display counter, not used in any decision. |
| I2 | Info | Some u128 arithmetic relies on `overflow-checks = true` rather than `checked_*`. | Accepted for the Fair; a panic is a failed transaction. Will be normalised before audit. |
| I3 | Info | Index mint had `freeze_authority = pot`. | Removed: new index mints have **no freeze authority**. (The five showcase mints keep theirs; the program has no freeze instruction.) |
| I4 | Info | `rebalance_open` / `exit_usdc_open` used the strict `!open` check while deposit/exit used the self-healing same-slot form. | All four now use the same-slot form, so a window can never brick a Pot. |
| I5 | Info | A depositor can self-refer from a second wallet (recovers 0.12% of their own deposit). | Accepted; registered referrers planned. |

## Adversarial scenarios that pass (Oct 10)

- Exit to USDC cannot pay more than a plain in-kind exit: the Pot's outflow is the same `exit_amount` math; the minimum only protects the holder. `in_vault_before` is the balance after the cash transfer, so only the sale counts. Wrong-owner or wrong-mint holder accounts are rejected. `close` is bound to the same user, Pot and USDC account through instruction introspection; double close, a stale window, `rebalance_close` against an exit window and `exit_usdc_open` inside a rebalance window are all refused. CPI entry is blocked on all four window instructions.
- Griefing: vaults are PDA-owned and unclosable; creator/treasury USDC ATAs are recreatable by anyone; pauses never touch `exit`; donations to vaults only benefit holders.
- Repeated bounded trades: cash can never be bought back, in-leg cannot exceed target, out-leg cannot drop below target, trade ≤ 25% of NAV; total leakage is bounded by the per-dollar margin in M2, not by repetition.
- Crafted Pyth accounts: owner, discriminator, `VerificationLevel::Full`, feed id, age, posted slot, confidence ≤ 2%, `price − conf > 0` all checked.
- Fee math: floors in favour of the Pot, split sums exactly, 1 USDC minimum prevents zero fees, creator/referrer/treasury duplicate-account cases handled and tested.
- First-depositor inflation: virtual 1 token / $1 offset, 6-decimal shares, `shares > 0`.

## Oct 8 findings (all fixed in code)

Oracle age cap + conservative confidence pricing (H1), rebalance deadband/cooldown and 1% max slippage (M1), two-step admin transfer and USDC-decimals check (M2), exit safety valve against a stale rebalance flag (L1), `init_if_needed` ATAs against pre-creation griefing (L2), 1 USDC minimum deposit (L5).

## Test coverage (LiteSVM, `./test.sh`)

Full flow create → deposit (fee split) → bounded rebalance (missing close, oversized trade, under-delivery revert, honest fill, cooldown) → deposit at NAV → in-kind exit → pause. Overshoot bounds. Stale price blocks deposit but not exit. Weights must sum; admin-only config. Exit to USDC: missing close, close bound to another USDC account, under-delivery revert, honest fill with exact fee, holder floor enforced, double close, cross-window close. Cash deploys without cooldown, rotation cooldown untouched. Referral: exact 0.12/0.12/0.06 split, self-referral rejected, referrer = creator, no referrer, wrong-mint referrer account.

## Before mainnet

Third-party audit; `max_price_age_secs` lowered; keeper allowlist with permissionless fallback (optional, see M2); upgrade authority and protocol admin on a Squads 2-of-3; capped flagship Pot.
