# Share Token Mainnet Blockers

Status: **blocking — do not deploy the current tokenization path to mainnet**

This review records issues found while aligning POTBOT around a liquid POT share token. It does not claim to be a complete audit.

## 1. Authority-controlled unbacked mint

`mint_tokens_to_member` accepts a caller-provided `shares_amount` and authorizes the POT authority. The instruction does not prove that the recipient owns the corresponding `MemberAccount.shares`, does not escrow or consume internal shares, and does not cap cumulative SPL supply against tokenized internal shares.

Impact: a POT authority can mint SPL tokens that appear redeemable against vault assets without a matching reduction or lock in another claim.

Required redesign:

- Remove discretionary authority minting from the economic path.
- Mint shares atomically with asset deposit, using program-derived accounting.
- If converting legacy internal shares, require the canonical member account, consume/lock exactly those shares, and record conversion state.
- Enforce a supply invariant between circulating SPL shares and the sole canonical ownership ledger.

## 2. Dual ownership / double-claim path

`redeem_tokens` burns SPL tokens and decreases `pot.total_shares`, but it does not decrease or close the corresponding `MemberAccount.shares`. The same member can retain an internal balance usable by the legacy `withdraw` instruction.

Impact: tokenization can create two representations of the same economic claim. Redemption through one path may leave the other claim intact.

Required redesign:

Choose exactly one canonical model:

1. **SPL-native shares (recommended):** the SPL mint supply is the ownership ledger; deposit mints and redemption burns atomically. Legacy member shares are migrated and then no longer withdrawable.
2. **Non-transferable internal shares:** remove claims that the SPL token is a freely redeemable share token.

Do not keep two independently redeemable ledgers.

## 3. Idle-SOL-only pricing

Current deposit, withdraw, and token redemption calculations use the SystemAccount vault lamport balance. Strategy assets and token legs are not atomically included in those execution paths.

Impact: once capital is routed to yield, mint and redemption prices can diverge from economic NAV.

Required redesign:

- Introduce one conservative `total_assets` source shared by preview, mint, and redeem.
- Include only program-owned, withdrawable strategy assets.
- Enforce oracle freshness and confidence bounds when conversion is needed.
- Define behavior when strategy liquidity is insufficient.

## 4. Missing user slippage bounds

Current deposit/redeem entrypoints do not take `minimum_shares_out` or `minimum_assets_out`.

Impact: a user cannot constrain an unfavorable NAV change between transaction construction and execution.

Required redesign:

- Add explicit minimum-out parameters.
- Calculate with checked `u128` fixed-point arithmetic.
- Fail atomically when bounds are not met.

## 5. First-depositor and donation safety

The current share calculation is based on raw vault balance and total internal shares. A complete inflation/donation attack analysis and mitigation is not documented in the instruction.

Required redesign:

- Use virtual shares/assets or locked minimum liquidity.
- Separate rent reserve from managed assets.
- Add adversarial tests for direct vault donations and rounding boundaries.

## Release gate

The share-token path remains **prototype / mainnet blocked** until:

- a single canonical ownership ledger is implemented;
- migration behavior is defined;
- total-assets accounting includes the selected yield adapter;
- mint/redeem slippage bounds exist;
- property and adversarial tests pass;
- an independent security review covers the final design.
