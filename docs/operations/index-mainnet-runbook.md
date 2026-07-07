# Index vault — mainnet runbook (flagship POT-1)

Gate: **devnet must show the full cycle green** — `deposit_base → deploy_to_strategy →
update_nav_snapshot → redeem (instant + queued)` — before any mainnet step. Every step
below that moves real money or upgrades mainnet requires YD's explicit OK.

## 0. Preconditions

- [ ] Devnet program upgraded to the index-vault build; e2e cycle green (see §4).
- [ ] `anchor keys list` matches `declare_id!` (GJap9…).
- [ ] Deployer wallet holds ~5 SOL (`solana balance`).
- [ ] Keeper key provisioned in the secret manager; funded with gas only.
- [ ] Squads multisig created; members confirmed.

## 1. Program

```bash
cd packages/program
anchor build --no-idl
python3 scripts/patch_idl.py packages/sdk/src/idl/pot_vault.json   # only if IDL changed
python3 scripts/patch_idl_index.py packages/sdk/src/idl/pot_vault.json
anchor deploy --provider.cluster mainnet-beta          # ⚠️ YD OK required
solana program show GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK   # verify on Explorer
# Upgrade authority → multisig BEFORE public deposits:
solana program set-upgrade-authority GJap9… --new-upgrade-authority <SQUADS_VAULT>
```

## 2. Protocol bootstrap (once)

```bash
# 1. init_allowlist with the curated mint list (client registry must stay a subset)
# 2. create flagship pot; init_index_mint + init_strategy_config with LAUNCH GUARDS:
#      weights: 45% USDC (kaminoLend) / 35% JitoSOL (kaminoLiquidity) / 20% RWA-or-SOL   ← YD decision
#      idle_buffer_bps: 500–1000                                                          ← YD decision
#      tvl_cap: 50_000e6, deposit_min: 10e6, deposit_max: 5_000e6 (week one)              ← YD decision
#      nav_staleness_slots: ~450 (≈3 min), max_nav_deviation_bps: 300–500
#      keeper: <keeper pubkey>, is_flagship: true
# 3. create vault ATAs (SDK buildInitIndexTx does all of the above in order)
# 4. init_position / init_position_vault for each leg
```

## 3. Seed & verify

- [ ] Small self-deposit (e.g. 100 USDC) → check iPOT minted 1:1, snapshot seeded.
- [ ] Keeper NAV tick lands; price/share = 1.0000 on the site.
- [ ] `redeem_instant` a fraction → USDC back at NAV.
- [ ] `deploy_to_strategy` a small tranche → buffer floor enforced.
- [ ] Queue path: request → settle → payout + rent refund.
- [ ] `NEXT_PUBLIC_FLAGSHIP_POT=<pot pubkey>` in Vercel env → flagship pins on / and
      /leaderboard. (`NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_PROGRAM_ID` already set.)

## 4. Devnet status (as of 2026-07-07)

Devnet still runs the pre-index build. Upgrade authority is the local deployer
(`9HCK3…NWs`); the program account is already extended (+100KB). Blocked only on
faucet SOL (~0.61 short of the deploy buffer):

```bash
solana program deploy target/deploy/pot_vault.so \
  --program-id GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK --url devnet
```

## Open decisions (YD)

1. Flagship weights — default 45/35/20; RWA sleeve day-1 or SOL spot until RWA mints verified?
2. Launch caps — proposed 50k TVL / 5k per deposit.
3. Squads multisig as authority + upgrade authority before public deposits.
4. Idle buffer % (5–10).
5. Keeper hosting (Railway?) + RPC (Helius primary / Triton backup).
6. Looping layer: separate enable decision, only after borrow-rate telemetry.
