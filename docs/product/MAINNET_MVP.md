# POTBOT Mainnet MVP

## Product contract

The first mainnet release turns one supported Solana-native asset into a liquid POT share token backed by one allowlisted yield strategy.

The complete user flow is:

1. Deposit the supported underlying asset.
2. Receive POT shares at the current NAV per share.
3. The vault deploys assets through one allowlisted yield adapter.
4. Strategy yield increases total assets and therefore NAV per share.
5. Burn POT shares to redeem the proportional amount of underlying assets.

The POT share token represents pro-rata ownership. It is not equity in POTBOT, a stablecoin, a guaranteed-return product, or a lending position.

## P0 scope

- One underlying asset.
- One independently reviewed yield adapter.
- Deposit and proportional share minting.
- Conservative total-assets/NAV accounting with freshness checks.
- Share burning and underlying redemption.
- Minimum-shares-out and minimum-assets-out protection.
- Deposit pause and permissionless emergency redemption.
- Transparent contract, adapter, oracle, fee, and liquidity information in the UI.

## Explicitly out of scope

- Multi-asset baskets.
- Tokenized equities and other RWAs.
- Treating POT shares as collateral in third-party lending protocols.
- Apple Pay funding until a real on-ramp is integrated.
- Automatic leverage or recursive borrowing.
- Multiple simultaneous strategies.
- Guaranteed APY.

These are roadmap items, not mainnet-MVP claims.

## Product terminology

For the single-asset MVP use **POT share token**, **liquid vault token**, or **yield index token**. Use **basket index token** only after a deployed POT holds and accounts for multiple underlying assets.

## Mainnet exit criteria

- Share-accounting invariants have property and adversarial test coverage.
- The adapter cannot transfer assets to arbitrary destinations.
- Oracle and NAV freshness are enforced.
- First-depositor inflation and donation attacks are mitigated.
- Decimal normalization and rounding behavior are documented and tested.
- Redemptions remain available when deposits and strategy actions are paused.
- Losses and low strategy liquidity are reflected honestly; no fixed-return language is used.
- Independent security-review findings are resolved or explicitly accepted.

## Roadmap

1. Single-asset yield POT on mainnet.
2. Blue-chip crypto baskets with deterministic rebalancing.
3. Secondary liquidity and selected lending integrations for POT shares.
4. Tokenized equities and RWAs subject to issuer, oracle, compliance, market-hours, and jurisdiction requirements.
