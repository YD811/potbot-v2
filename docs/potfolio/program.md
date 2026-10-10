# Program reference: `pot_index`

Anchor 1.2.1, Solana CLI 4.3. Source: `packages/pot-index/programs/pot_index/src`. Tests: `packages/pot-index/tests` (LiteSVM, run with `./test.sh`).

## Accounts (PDAs)
| Account | Seeds | Holds |
|---|---|---|
| `Config` | `["config"]` | admin, pending admin, treasury, USDC mint, `max_price_age_secs`, protocol pause flag |
| `Asset` | `["asset", mint]` | mint, decimals, Pyth feed id, enabled flag |
| `Pot` | `["pot", index_mint]` | creator, name, symbol, legs (mint, weight_bps, vault, feed_id, decimals), cash vault, deposit cap, paused, finalized, rebalance state, created_at |
| Vaults | ATAs owned by the Pot PDA | one per leg + one USDC cash vault |
| Index mint | keypair supplied by the creator (vanity `Pot...`) | mint authority = Pot PDA, 6 decimals |

## Instructions
| Instruction | Signer | Effect |
|---|---|---|
| `init_config`, `set_config`, `transfer_admin`, `accept_admin` | admin | protocol settings; admin change is two-step |
| `register_asset`, `set_asset_enabled` | admin | allowlist of (mint, Pyth feed id) |
| `create_pot(name, symbol, deposit_cap_usd, slippage_bps, max_trade_bps)` | creator | creates Pot + index mint |
| `add_leg(weight_bps)` x 2..5 | creator | adds an asset with its vault |
| `finalize_pot` | creator | checks weights sum to 10,000 bps, locks the basket |
| `set_index_metadata(uri)` | creator | Metaplex metadata (name, symbol, uri) via CPI |
| `set_pot_params(paused, deposit_cap_usd)` | creator | the only two things a creator can change |
| `deposit(amount, min_shares_out)` + remaining accounts: Pyth price updates per leg | anyone | fee split, mint at NAV |
| `exit(shares, min_usdc_out)` | holder | burn, pro-rata transfer of cash + every leg |
| `rebalance_open(leg_out, leg_in, amount_out)` | keeper | moves `amount_out` from the out-vault to the keeper, records expected `min_in`, requires a matching `rebalance_close` later in the same transaction (Instructions sysvar introspection) |
| `rebalance_close` | keeper | verifies the in-vault received at least `min_in`, closes the window |

## Limits (constants.rs)
- Entry fee 30 bps: 40% referrer, 40% creator, 20% protocol. No referrer: referrer share goes to the creator.
- Exit fee 50 bps, stays in the Pot.
- 2 to 5 legs. Index decimals 6. Minimum deposit 1 USDC.
- Virtual shares/assets 1 token / $1 against first-depositor inflation.
- Oracle: max confidence 2%, max age `max_price_age_secs` capped at 300 s. Pot values what it holds or gives at `price + conf`, what it receives at `price - conf`.
- Rebalance: deadband 0.5% of NAV, cooldown 150 slots, max slippage 1%, max trade 25% of NAV per transaction; only from an overweight leg (or cash) toward an underweight leg, never past target on either side.

## Errors
`Unauthorized, ProtocolPaused, PotPaused, PotNotFinalized, PotAlreadyFinalized, TooManyLegs, TooFewLegs, WeightsDoNotSum, InvalidWeight, DuplicateLeg, AssetDisabled, NameTooLong, InvalidParams, RemainingAccountsMismatch, VaultMismatch, BadOracleOwner, StalePrice, OracleConfidence, NonPositivePrice, MathOverflow, DepositTooSmall, DepositCapExceeded, SlippageShares, SlippageAssets, ZeroShares, SelfReferral, TokenOwnerMismatch, TokenMintMismatch, RebalanceOpen, RebalanceNotOpen, RebalanceWrongSlot, CpiNotAllowed, MissingClose, InvalidLeg, NotOverweight, OvershootOut, OvershootIn, TradeTooLarge, RebalanceSlippage, ZeroAmount`.

Common ones in the UI: `StalePrice` (stock feeds stop on weekends: deposits wait, exits work), `DepositTooSmall` (< 1 USDC), `SlippageShares` (price moved between quote and execution; retry).

## Events
`Deposited`, `Exited`, `RebalanceOpened`, `RebalanceClosed` (camelCase in the Anchor event parser). The activity feed on each POTfolio page reads them.

## Security notes
No withdraw instruction. Exit cannot be paused and does not read the oracle. Keeper trades are atomic: an `open` without a `close` in the same transaction fails; under-delivery reverts both. Admin is two-step and will be a Squads multisig on mainnet. Known, accepted: a depositor can self-refer from a second wallet (mitigated later with registered referrers); keeper slippage up to 1% is the implicit rebalance cost.
