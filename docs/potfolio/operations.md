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
| Oct 12 | v1.2 | 510340077 | new address `7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV` (v1.1 stays at `DfKK…` as a backup); review follow-ups (#96): upgrade-authority `init_config`, pinned USDC, admin expiry and events, feed checks, `update_asset`, freezable mints refused, last holder fee-free, `total_exits_usd` removed; upgrade authority handed to `JHV4qhTEhEKMkugYXuPURzwunYBiCUVji9ZrRiA5rvG`; binary sha256 `4b8f79b03b6a0aedf670ad88086a082c1120dc93691ceb999d3077d5c729ad43`; sig `5oovzxQvkUKSHgx93f7JBAbUs3CBL5UV4Jgx9sbehHX2uZKAqrMiauSXKowXJtM2z8xtJrJgXesYuzm4D2bYJuah` |

Deployer balance and keys stay out of git. Mainnet: see `apps/web/src/app/mainnet` and `docs/operations/deploy.md`.

## Mainnet deploy checklist (from the Oct 11 review)
- `init_config` accepts only the program's upgrade authority as signer (F4). Deploying and initializing in one transaction is not possible: a program is callable only from the slot after its deployment.
- Build with `anchor build -- --features mainnet`: `init_config` accepts only the USDC mint compiled in (`USDC_MINT`), and the default build pins the devnet test USDC, so a default build fails `init_config` on mainnet.
- `max_price_age_secs = 30` at init (cap 60 in code).
- Verified build published on Explorer before the first deposit.
- Upgrade authority, protocol admin and `register_asset` on a Squads 2-of-3 with a timelock (F2, F3) before the first deposit.
- Publish the allowlist with mint ↔ Pyth feed pairs so anyone can verify registrations.
- Mints with a freeze authority cannot be registered (F8, enforced in `register_asset`); freezable assets need a separate product (see security.md).
- Token metadata JSON and images on the production domain or Arweave; Token-2022 metadata at the migration (F14).

## Deploying v1.2 on devnet
v1.2 changes two account layouts: `Config` gains `pending_admin_expiry_slot` (154 → 162 bytes) and `Pot` loses `total_exits_usd` (see decisions.md). The binary also grows from ~501 KB to ~578 KB. Devnet has no real users, so v1.2 goes live now rather than after a migration period; the choice is only where.

### Recommended: a new program address, v1.1 kept as a backup
`DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr` keeps running v1.1 untouched, with its Pots and their funds, so the build that was judged stays verifiable and nothing has to be migrated.

1. Back up `packages/pot-index/target/deploy/pot_index-keypair.json`, then create a new program keypair in its place (`solana-keygen new -o target/deploy/pot_index-keypair.json`) and run `anchor keys sync` (updates `declare_id!` and `Anchor.toml`).
2. `anchor build` (devnet: default features), then copy `target/idl/pot_index.json` to `apps/web/src/lib/pot-index/idl.json`: the IDL carries the program address, and the web app reads it from there unless `NEXT_PUBLIC_POT_INDEX_PROGRAM_ID` is set.
3. `anchor deploy --provider.cluster devnet`. The program is ~578 KB: the deployer needs about 8 SOL at the peak (~4 for the program account, ~4 for the deploy buffer, refunded). The deployer becomes the upgrade authority, and only it can call `init_config`.
4. While US markets are open: `cd apps/web && npx tsx scripts/pot-index-devnet-init.ts` with `POT_INDEX_ADMIN_KEYPAIR` set to the deployer key. It initializes `Config` with the pinned devnet USDC and a 30 s price window, registers the assets, creates the showcase Pots and rewrites `assets.devnet.json`; test mints are reused from the existing `assets.devnet.json`. `register_asset` now needs a live price, and the TSLA and QQQ feeds only update in market hours: outside them, leave the stock assets out, run the script, and add them back in a later run (it skips what already exists).
5. Replace the old address wherever it is written: `README.md`, `HACKATHON.md`, `SECURITY.md`, `docs/potfolio/README.md`, `apps/web/src/app/roadmap/page.tsx`, the deploy history above, `NEXT_PUBLIC_POT_INDEX_PROGRAM_ID` in Vercel if it is set, and any submission text.
6. Do not run `price-age 30` afterwards: init already set it, and `set_config` refuses an update that changes nothing. `migrate_config` is not needed on a fresh address.

### Alternative: upgrade `DfKK…` in place
1. Exit every Pot first (operator and test wallets): `Pot` lost a field, so after the upgrade the program can no longer read any existing Pot, and whatever is still inside stays there.
2. `anchor build`; the committed `idl.json` already matches this address.
3. Extend the program account, which holds 503,416 bytes: `solana program extend DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr 80000` (~0.56 SOL of rent), unless your CLI extends automatically. Then upgrade (`anchor upgrade` or `solana program deploy --program-id …`).
4. Immediately: `npx tsx scripts/pot-index-set-config.ts migrate` with the admin keypair. `migrate_config` checks the account's owner, discriminator, old size and admin, tops up rent and grows `Config` in place; the old fields keep their offsets and the new one reads 0. Until it runs, every instruction that loads `Config` fails.
5. Check: `pot-index-set-config.ts show` prints the same admin, treasury and price age; a second `migrate` fails with `ConfigAlreadyMigrated`. An admin proposal made before the upgrade is void (its expiry reads 0).
6. Re-create the showcase Pots (`pot-index-devnet-init.ts`).

Either way, client changes in this release: `set_asset_enabled` is now `update_asset({ enabled, feedId })`; `register_asset` and a feed change in `update_asset` take a `priceUpdate` account. Once no deployment needs it, delete `migrate_config`.

## Known devnet limits
Free Pyth tier: SOL, BTC, ETH, BNB, XRP, DOGE, JitoSOL, PYTH, USDC, TSLA, QQQ only. Equity feeds stop on weekends: deposits into stock Pots fail with `StalePrice` until market open; exits work. Public devnet RPC rate-limits: activity fetch is chunked and refetched every 45 to 90 s.
