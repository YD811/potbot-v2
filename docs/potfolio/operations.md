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
6. Admin config after an upgrade if needed: `npx tsx scripts/pot-index-set-config.ts show | price-age 30`. Metadata: `npm run pot-index:metadata update` repoints every showcase Pot's URI to `potbot.fun`.

Judge run against the deployment (fresh keypair, nothing admin-signed): `pot-index-route-flow.ts faucet` → `pot-index:flow deposit 100 <mint>` → `route-flow allocate <mint>` → `pot-index:flow exit 20 <mint>` → `route-flow exit-usdc <mint> 30000000` (base units), then `status` and check the supply reconciles.

## How a holder's transaction flows (Oct 12)
One signature per action, and the signature never expires:
1. `POST /api/pot-index/tx/prepare` {kind: deposit | exit | exit-usdc, wallet, mint, amount}. The operator (devnet: the market maker key) creates any missing token accounts, refreshes the Pyth prices into its **persistent price-update accounts** (one per feed, derived from the operator key), builds the holder's transaction on a recent `confirmed` blockhash (the holder has the blockhash lifetime, about a minute, to sign) and returns it with an HMAC token over its instructions; instructions a wallet adds around them (ComputeBudget, Phantom's Lighthouse guard) are ignored. Durable nonces were tried first and dropped: Phantom flags them as high risk.
2. The holder signs it. However long that takes.
3. `POST /api/pot-index/tx/submit` {tx, token}. The operator verifies the token, refreshes the prices again, adds its own signature when the transaction needs it (devnet market maker), sends and confirms. After a deposit it deploys the cash into the basket as keeper (permissionless `rebalance_open/close`), so the holder signs nothing else.
Scripts: `scripts/pot-index-operator-flow.ts deposit|exit|exit-usdc|faucet` drives exactly this; `SIGN_DELAY_SECS=90` imitates a slow wallet. The older multi-transaction routes (`/allocate`, `/exit-usdc`, `/prices`, `/cleanup`) stay for the CLI judge run.

## Deploy history (devnet)
| Date | Version | Slot | What |
|---|---|---|---|
| Oct 8 | v1.0 | 509477021 (last of several same-day upgrades) | 14 instructions, first security pass |
| Oct 10 | v1.0.x | | exit to USDC, deposit-and-allocate, second review fixes |
| Oct 12 | v1.1 | 510076099 | review F1/F5/F7/F14; `max_price_age_secs` set to 30, then 60 after a browser-wallet test (the holder has to sign a 7-tx bundle inside the window); showcase metadata repointed to potbot.fun; sig `3f5ucfuXJSUwtWMR24La9XtAKznpCWvRZ9gMuGJhNonNJ6KUXPVfowhZQ72ShjDFKfX5k6u42ryerAeFTLX889kZ` |

Deployer balance and keys stay out of git. Mainnet: see `apps/web/src/app/mainnet` and `docs/operations/deploy.md`.

## Mainnet deploy checklist (from the Oct 11 review)
- Deploy and `init_config` in **one transaction** (F4): the first caller becomes admin.
- `max_price_age_secs = 30` at init (cap 60 in code).
- Verified build published on Explorer before the first deposit.
- Upgrade authority, protocol admin and `register_asset` on a Squads 2-of-3 with a timelock (F2, F3) before the first deposit.
- Publish the allowlist with mint ↔ Pyth feed pairs so anyone can verify registrations.
- Only allowlist mints without a freeze authority, or document the exposure per asset (F8).
- Token metadata JSON and images on the production domain or Arweave; Token-2022 metadata at the migration (F14).

## Known devnet limits
Free Pyth tier: SOL, BTC, ETH, BNB, XRP, DOGE, JitoSOL, PYTH, USDC, TSLA, QQQ only. Equity feeds stop on weekends: deposits into stock Pots fail with `StalePrice` until market open; exits work. Public devnet RPC rate-limits: activity fetch is chunked and refetched every 45 to 90 s.
