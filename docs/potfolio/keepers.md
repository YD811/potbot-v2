# Keepers

A keeper is any bot that moves a Pot toward its target weights. The program, not the keeper, sets the rules.

## What a keeper does
1. Reads the Pot, prices every leg (Pyth Hermes), computes current vs target weights.
2. Picks the most overweight leg (cash counts as overweight whenever it is non-zero) and the most underweight leg.
3. Sends one transaction: post Pyth updates -> `rebalance_open(leg_out, leg_in, amount_out)` -> swap -> `rebalance_close` -> close Pyth accounts.

## What the program enforces
- Only overweight -> underweight, never past target on either side (`NotOverweight`, `OvershootOut`, `OvershootIn`).
- At most 25% of NAV per transaction (`TradeTooLarge`), 0.5% deadband, 150-slot cooldown.
- The in-vault must receive at least Pyth value x (1 - slippage_bps), slippage capped at 1% (`RebalanceSlippage`).
- `open` without a `close` later in the same transaction fails (`MissingClose`); CPI is refused (`CpiNotAllowed`).

## Devnet keeper
`apps/web/scripts/pot-index-devnet-keeper.ts`: serves every showcase Pot from `assets.devnet.json`, `--loop 300` to run continuously, `--dry` to print the plan. The "swap" on devnet is an SPL transfer from the keeper's test inventory (minted by the init script) at the Hermes mid price. Keeper keypair: `POT_INDEX_KEEPER_KEYPAIR` (defaults to the admin key).

## Mainnet keeper
Same instruction pair; the swap step becomes a Jupiter route. Anyone can run one. Partner rebalancing engines (for example DiversiFi) can fill the same instruction. Keepers earn the spread inside the slippage band.
