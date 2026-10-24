# Audit scope: pot_index

Prepared Oct 19, 2026 for audit firms quoting on PotBot POTFolio. Everything referenced is public in this repository.

## What the program does

`pot_index` turns a basket of up to 5 Solana assets into one SPL index token. A creator defines the basket (assets and fixed weights) and can never touch the funds afterwards. Holders deposit USDC and receive index tokens at NAV (Pyth-priced); they redeem any time, in kind for every asset or to USDC, and redemptions cannot be paused. Permissionless keepers rebalance within bounds the program enforces (toward target only, capped per trade, inside the Pyth price band, atomic open and close). Fees are split inside the deposit instruction between creator, referrer and protocol.

Full description: `docs/potfolio/overview.md`, `docs/potfolio/program.md`.

## In scope

| Component | Where | Size |
|---|---|---|
| Anchor program `pot_index` | `packages/pot-index/programs/pot_index/src` | about 2,100 lines of Rust, 18 instructions, 3 account types (`Config`, `AssetConfig`, `Pot`), Anchor 1.2.1, `pyth-solana-receiver-sdk` 2.0.0, Rust 1.89 |
| Tests | `packages/pot-index/programs/pot_index/tests` (`pot_flow.rs`, `guards.rs`, `invariants.rs`) | 40 end-to-end tests on LiteSVM, run with `packages/pot-index/test.sh` in both devnet and mainnet feature builds |
| Operator submit path (short review) | `apps/web/src/app/api/pot-index/tx/{prepare,submit}` | TypeScript. The operator posts Pyth prices into persistent accounts, builds the holder's transaction, verifies the holder's signature against an HMAC-bound token, co-signs and submits. Three findings on this path are already documented as open in `security.md` (O1 to O3) |

The commit under audit will be tagged `pot-index-v1.3-audit`. v1.3 adds configurable fees (per-Pot entry fee within a protocol maximum, Garden-tier discounts, a split that pays the protocol as index tokens on exit, an optional integrator fee). The scope freezes at that tag; nothing else is added before mainnet.

## Out of scope

Keeper bot (`apps/keeper`), the web app beyond the two routes above, the legacy `pot_vault` program (not deployed to mainnet), Metaplex and Pyth programs themselves.

## Threat model

Assets we protect: USDC and asset balances in Pot-owned vaults; the index mint; fee flows.

Actors: holders (untrusted), creators (untrusted; can only pause deposits and set a cap on their own Pot), keepers (untrusted; bounded by the program), the operator key (semi-trusted: posts prices and submits transactions, cannot move funds), the admin (trusted, multisig on mainnet; cannot withdraw), the upgrade authority (multisig).

Invariants we claim:

1. No instruction transfers Pot assets to any party other than a holder redeeming pro rata, or a keeper within an open rebalance window that must close in the same transaction with at least `min_in` delivered.
2. `exit` needs no oracle, no keeper and no admin, and is never paused.
3. Index tokens are minted only in `deposit`, at NAV computed from Pyth prices no older than `max_price_age_secs` (hard cap 60 s), with confidence under 2%.
4. After every instruction, total supply times NAV equals the value of the vaults (within rounding), with the virtual-share offset against inflation attacks.
5. Fee shares sum to the fee; no fee can round to zero (minimum deposit 1 USDC).
6. A finalized Pot's assets, weights and (v1.3) entry fee cannot change.
7. The admin role is two-step with a one-hour acceptance window; `init_config` is callable only by the upgrade authority with the build-pinned USDC mint.

Known accepted risks are listed in `security.md` with reasons (for example, the conversion fee can be avoided by calling `exit` and swapping elsewhere).

## Previous reviews

Three passes before this audit, all in `docs/potfolio/security.md`: two against the Solana Foundation program-security checklist (Oct 8 and 10), one independent review by a Solana engineer (Oct 11, 14 findings, none critical or high, all fixed or documented). Of note: the first fix for oracle tick shopping was wrong and was replaced by a hard price-age cap; the reviewer caught it.

## What we ask for

- Fixed-price quote and earliest start date for the program plus the short operator-path review.
- Expected duration and the format of the report (we publish it in full).
- A re-review of fixes included, or priced separately.
- Any questions answered the same day: contact YD, @CryptoYDao, or open an issue in this repository.

## How to build and test

```
cd packages/pot-index
./test.sh
```

Verified build will be produced with `solana-verify` before deployment; the mainnet program will be deployed and initialised in one transaction by a Squads multisig (see `operations.md`).
