# Index keeper — runbook

The index keeper is a crank identity, not a custodian: it writes NAV snapshots
(deviation-capped by the program), moves capital between vault-owned accounts inside
config caps, and settles the redemption queue. It has **no instruction that can pay any
wallet except a requester's own ATA**. Fund it with gas SOL only.

Code: `apps/keeper/src/index-crank.ts` (starts with the keeper service, see `index.ts`).

## Configuration (`apps/keeper/.env` — gitignored)

```bash
SOLANA_RPC_URL=            # Helius (primary) / Triton — NOT the public endpoint in prod
POTBOT_PROGRAM_ID=GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK

# Keeper signing key — file path OR raw JSON array from a secret manager. Never in git.
KEEPER_KEYPAIR_PATH=/run/secrets/keeper.json
KEEPER_KEYPAIR_JSON=

KEEPER_ENABLE_INDEX_CRANK=true
KEEPER_NAV_INTERVAL_MS=60000       # NAV cadence
KEEPER_MAX_SETTLES_PER_TICK=5      # queue settle rate limit
```

The key must match `StrategyConfig.keeper` (rotate with `update_strategy_config`).

## What a tick does

1. `getProgramAccounts` → all `StrategyConfig`s whose `keeper` == our key.
2. Per pot: **NAV** = idle base buffer + Σ `StrategyPosition.deployed_base`
   (book value — exact while routes escrow base; swap in Kamino/Meteora SDK pricing +
   Jupiter Price API v2 when the CPI adapters land).
3. `update_nav_snapshot` — the program enforces slot monotonicity + the deviation cap.
4. Scan `RedeemRequest`s in `Pending`; settle up to the per-tick cap. Settles that fail
   on liquidity or a stale snapshot simply retry next tick.

Properties: idempotent (ticks never overlap), exponential-backoff retries, per-tick
settle cap, structured logs per crank, `indexCrankMetrics` exported to `/metrics`.

## Operations

- **Health**: `GET :8787/health`, `GET :8787/metrics`.
- **NAV rejected with `NavDeviationTooHigh`**: the basket really moved more than the cap
  (or pricing is wrong). Verify pricing; if the move is real, the pot authority walks the
  snapshot in steps or temporarily raises the cap via `update_strategy_config`.
- **Queue not draining**: check idle buffer vs queue size; the keeper may need to
  `withdraw_from_strategy` first (rebalance is Phase-2 automation; manual via SDK today).
- **Key rotation**: generate a new keypair → `update_strategy_config { keeper }` (pot
  authority) → swap the secret → restart. Old key instantly loses crank rights.
- **Kill switch**: `set_strategy_paused(true)` (authority or sentinel) stops deposits and
  deploys; redemptions and `withdraw_from_strategy` keep working by design.

## Hosting

Railway (same as `apps/api`) or any Node 20 host. `npm run build && npm start` in
`apps/keeper`. One instance per cluster — the cranks are idempotent, but two instances
just waste fees fighting over the same settles.
