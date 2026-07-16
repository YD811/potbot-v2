# POT Share Accounting

This document defines the accounting contract for the focused POTBOT mainnet MVP. It is a specification; a feature is not considered live merely because it appears here.

## Definitions

- `total_assets`: conservative value of idle underlying plus withdrawable strategy assets, denominated in the underlying asset's smallest unit.
- `total_shares`: circulating supply of the POT share mint.
- `nav_per_share`: `total_assets / total_shares`, represented with checked fixed-point arithmetic.
- `managed_assets`: assets the program can prove are owned by the vault or its allowlisted strategy position.

Unrealized rewards that cannot be safely valued or withdrawn must not be counted in `total_assets`.

## Minting

For a non-empty vault:

```text
shares_out = floor(deposit_assets * total_shares / total_assets_before)
```

For initialization, the program must use a documented virtual-shares/virtual-assets offset or permanently locked minimum liquidity. A raw one-to-one first mint without an inflation-attack mitigation is not mainnet-ready.

The caller supplies `minimum_shares_out`; the instruction fails if the result is lower.

## Redemption

```text
assets_out = floor(shares_burned * total_assets / total_shares_before)
```

Shares are burned atomically with redemption. The caller supplies `minimum_assets_out`. If strategy liquidity is insufficient, the instruction must either fail atomically or follow a separately documented withdrawal-queue design; it must never silently issue an under-collateralized promise.

## Required invariants

1. Shares cannot be minted without a corresponding increase in managed assets, except documented virtual/locked initialization shares.
2. Redemption always burns shares.
3. No user can redeem more than their pro-rata claim on conservative total assets.
4. Direct donations cannot let an attacker steal a later depositor's assets.
5. Decimal conversion and rounding cannot increase protocol liabilities.
6. Adapter instructions can move funds only between the POT vault and allowlisted program-owned strategy accounts.
7. Stale, invalid, or confidence-out-of-bounds oracle data cannot update NAV or authorize a mint/redeem that depends on it.
8. Pausing risk-increasing actions does not give an administrator custody over user exits.
9. Strategy losses reduce NAV; they are never hidden by cached values.
10. Fees are included explicitly in preview and execution calculations.

## Required tests

- First deposit and initialization attack cases.
- Deposit before and after yield accrual.
- Multiple users entering and exiting in different orders.
- Partial and full redemption.
- Strategy gain and loss.
- Donation/inflation attacks.
- Decimal mismatch and rounding boundaries.
- Stale oracle and invalid confidence interval.
- Insufficient strategy liquidity.
- Unauthorized mint, adapter, destination, and fee recipient.
- Pause deposits while keeping emergency redemption available.
- Property test: across arbitrary valid deposit/yield/redeem sequences, no account extracts more than its economic pro-rata claim.
