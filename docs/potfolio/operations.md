# Operations (devnet)

## Environment
Web (`apps/web/.env.example`): `NEXT_PUBLIC_SOLANA_NETWORK=devnet`, `PYTH_API_KEY` (Hermes requires a key; the web app proxies Hermes at `/api/pot-index/hermes/*` and adds the key server-side), `POT_INDEX_FAUCET_KEYPAIR` (mints test USDC from `/api/pot-index/faucet`).

Scripts need `NODE_OPTIONS=--require=./scripts/_no-jito.cjs` (stubs `jito-ts`) and, from a machine that cannot reach Hermes directly, `NEXT_PUBLIC_PYTH_HERMES_URL=https://<deployment>/api/pot-index/hermes`.

## Registry
`apps/web/src/lib/pot-index/assets.devnet.json`: USDC mint, treasury/admin, registered assets (mint, decimals, feed id, category), flagship and showcase `pots`. Produced by `scripts/pot-index-devnet-init.ts` (idempotent: mints, registers, inventories, creates missing showcase Pots with vanity `Pot...` mints from `$POT_INDEX_VANITY_DIR`).

## Scripts (`apps/web`)
- `npm run pot-index:init`: assets, inventory, showcase Pots.
- `npm run pot-index:keeper -- --loop 300`: keeper over all showcase Pots.
- `npm run pot-index:flow -- deposit <usdc> [mint] [--ref <pubkey>] | exit all|<shares> [mint] | mint-usdc <wallet> [amount] | status [mint]`.
- `npm run pot-index:metadata`: attach Metaplex metadata to index mints and test mints (JSON + logos in `public/token-meta`).

## Upgrade procedure
1. Change the program, add or adjust LiteSVM tests, `cd packages/pot-index && ./test.sh` green.
2. `anchor build` (SBPF v3 artifact + IDL).
3. `solana program deploy target/deploy/pot_index.so --program-id <keypair> --use-rpc` (QUIC/TPU may be blocked; `--use-rpc` is reliable). Same program id, existing Pots untouched unless account layouts change (then a migration is needed: flag it first).
4. Copy `target/idl/pot_index.json` to `apps/web/src/lib/pot-index/idl.json`, update `client.ts` builders, run `npx tsc --noEmit`, deploy the web app.
5. Verify on Explorer, run `pot-index:flow status`, one deposit, one exit.

Deployer balance and keys stay out of git. Mainnet: see `apps/web/src/app/mainnet` and `docs/operations/deploy.md`.

## Known devnet limits
Free Pyth tier: SOL, BTC, ETH, BNB, XRP, DOGE, JitoSOL, PYTH, USDC, TSLA, QQQ only. Equity feeds stop on weekends: deposits into stock Pots fail with `StalePrice` until market open; exits work. Public devnet RPC rate-limits: activity fetch is chunked and refetched every 45 to 90 s.
