<div align="center">

# PotBot POTfolio

### Any basket of Solana assets. One liquid token.

**Create a portfolio, hold the token.** Deposit USDC, receive a token that mirrors the whole basket, hold it anywhere a token works, redeem it any time for every asset inside or for USDC. Nobody can withdraw the assets: not the creator, not PotBot.

[potbot.fun](https://potbot.fun) · [Live POTfolios](https://potbot.fun/portfolios) · [How it works](https://potbot.fun/learn) · [For the judges](https://potbot.fun/worldsfair) · [@PotBot_sol](https://x.com/PotBot_sol)

[![CI](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://explorer.solana.com/address/DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr?cluster=devnet)
[![Anchor](https://img.shields.io/badge/Anchor-1.2-blue?style=flat-square)](https://anchor-lang.com)
[![Pyth](https://img.shields.io/badge/Oracle-Pyth%20pull-7142CF?style=flat-square)](https://pyth.network)
[![MCP](https://img.shields.io/badge/MCP-native-14F195?style=flat-square)](https://www.npmjs.com/package/@potbot/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Built for Colosseum **Crypto World's Fair** (Sept 14 to Oct 12, 2026). Third PotBot hackathon: v1 group trading in Telegram, v2 governed vaults, v3 the vault wrapped into a single liquid token.

</div>

---

## 30 seconds

```text
creator:  pick up to 5 assets + weights  ──►  one transaction  ──►  POTfolio token exists (Pot… mint, name, logo)
holder:   deposit USDC  ──►  Pyth prices posted in the same tx  ──►  tokens minted at NAV  ──►  basket bought in the same wallet prompt
holder:   redeem any time  ──►  every asset in kind  or  USDC in one transaction (on-chain minimum, 0.10% conversion fee)
nobody:   withdraw. There is no such instruction.
```

| Promise | How the program keeps it |
|---|---|
| No rug | Assets sit in Pot-owned PDAs. No withdraw instruction. Creator can only pause deposits or cap size. |
| No exit liquidity games | Exit burns tokens for a pro-rata share of every vault, needs no oracle, no keeper, cannot be paused. 0.50% stays with remaining holders. |
| Honest price | Mint at NAV from Pyth pull updates posted in the same transaction; max 5 min old, confidence ≤ 2%, priced at price ± conf against the Pot. |
| Bounded keepers | `rebalance_open` / `rebalance_close` in one transaction (Instructions-sysvar introspection): toward target only, never past it, ≤ 25% of NAV per trade, ≥ Pyth value × (1 − slippage) or everything reverts. |
| Creators earn | 0.30% entry fee split in the deposit tx: 40% creator, 40% referrer, 20% protocol. No custody, no liability. |

## Live on devnet

Program `DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr` ([Explorer](https://explorer.solana.com/address/DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr?cluster=devnet)). Five showcase POTfolios with real Pyth prices and test tokens:

| POTfolio | Basket | Mint |
|---|---|---|
| Solana Blue Chips `$SBC` | SOL 50 / BTC 30 / ETH 20 | [`PotSvA4…`](https://potbot.fun/portfolios/PotSvA4ynuxbMFUA8SJSbULHhuTY1JcL5RaxnQz5FmM) |
| Solana Native `$SOLN` | SOL 50 / JitoSOL 30 / PYTH 20 | [`Potgd4g…`](https://potbot.fun/portfolios/Potgd4gqWzJgiNZXxE5Avx3TB7fQyjd6gQMeqjL92vb) |
| Majors 5 `$MJR5` | BTC 35 / ETH 25 / SOL 20 / BNB 10 / XRP 10 | [`PotgdAt…`](https://potbot.fun/portfolios/PotgdAtLnYS28VpCnRdAsbtjprYWKhMYCDj2SE5erAE) |
| Wall St on Solana `$WSTS` | TSLAx 40 / QQQx 40 / SOL 20 | [`Potsmds…`](https://potbot.fun/portfolios/PotsmdsvLcZGToyYs9XKcL9vVpGMbSV3UaFaA9EUZHH) |
| Doge & Sol `$DGSL` | DOGE 60 / SOL 40 | [`Potsts7…`](https://potbot.fun/portfolios/Potsts7jB8dQPUN1MLU4TfqCPGkJTfwtrAVcHRBdp1q) |

Try it: connect a devnet wallet (or sign in with email), click **Get test USDC** on any POTfolio (it also sends a little SOL for fees to an empty wallet), deposit, watch the basket get bought, redeem for the assets or for USDC. Every step shows up in the activity feed and on Explorer; the page keeps index price history and your cost basis and P&L.

A clean "judge run" from a wallet that had nothing, through the same server routes the UI calls, is scripted in `apps/web/scripts/pot-index-route-flow.ts`:

```bash
cd apps/web
POT_INDEX_WALLET_KEYPAIR=judge.json POT_INDEX_BASE_URL=https://potbot.fun \
  npx tsx scripts/pot-index-route-flow.ts faucet                      # 1,000 tUSDC + 0.1 SOL
npm run pot-index:flow -- deposit 100 --ref <referrer>                 # mint at NAV, fee split
npx tsx scripts/pot-index-route-flow.ts allocate  <mint>               # buy the basket leg by leg
npm run pot-index:flow -- exit 50                                      # half back in kind
npx tsx scripts/pot-index-route-flow.ts exit-usdc <mint> <shares>      # the rest as USDC, on-chain minimum
```

## Repository map

```text
packages/pot-index/        pot_index Anchor program (the POTfolio protocol) + LiteSVM tests      ← start here
apps/web/                  Next.js app: landing, /portfolios, /portfolios/new, /portfolios/[mint], /learn, /roadmap, /worldsfair, /mainnet
  src/lib/pot-index/       client builders, Pyth helpers, registry, garden levels
  src/app/api/pot-index/   Hermes proxy, faucet, devnet market maker (exit to USDC, allocate), NAV history, token metadata
  scripts/                 devnet init, keeper, flow (deposit / exit / exit-usdc / allocate), metadata
docs/potfolio/             overview, program reference, fees, keepers, garden mode, security review, landscape, operations, FAQ
packages/program/          pot_vault (PotBot v2 vaults, previous hackathon)      apps/potbot-mcp/  MCP server for AI agents
packages/sdk/  apps/api/  apps/keeper/  apps/bot/                               PotBot v2 supporting services
```

Hackathon work (Sept 14 to Oct 12, 2026) lives in `packages/pot-index`, `apps/web/src/{app/portfolios,lib/pot-index,hooks/usePotIndex.ts,components/pot-index,app/api/pot-index}`, `apps/web/scripts/pot-index-*`, `docs/potfolio`.

## Program in one table

| Instruction | Who | What |
|---|---|---|
| `create_pot` → `add_leg` × 2..5 → `finalize_pot` → `set_index_metadata` | creator | Pot PDA, one vault per asset + USDC cash vault, index mint (6 dec), Metaplex metadata. Weights lock at finalize. |
| `deposit(amount, min_shares_out)` | anyone | 0.30% fee split, mint at NAV. Remaining accounts: `[vault_i, pyth_update_i]` per leg. |
| `exit(shares, min_usdc_out)` | holder | Burn, receive every leg pro-rata in kind. Never pausable, no oracle. |
| `exit_usdc_open` / `exit_usdc_close` | holder | Same, then sell the legs in the same tx (Jupiter on mainnet); `close` enforces the on-chain minimum and takes the 0.10% conversion fee. |
| `rebalance_open` / `rebalance_close` | any keeper | Bounded flash trade, see table above. Cash deployment has no cooldown so a deposit can be allocated leg by leg in one prompt. |
| `set_pot_params` | creator | Pause deposits, cap size. Nothing else. |
| `init_config`, `set_config`, `transfer_admin` / `accept_admin`, `register_asset`, `set_asset_enabled` | admin | Protocol settings, two-step admin, asset allowlist (mint + Pyth feed). |

Full reference, limits and all error codes: [`docs/potfolio/program.md`](docs/potfolio/program.md).

## Build and test

```bash
# program (Anchor 1.2.1, Solana CLI 4.3, Rust 1.89)
cd packages/pot-index
./test.sh            # SBPF v0 build + LiteSVM suite: full flow, bounded rebalance, exit to USDC, referral paths, stale oracle, admin
anchor build         # deployable artifact + IDL

# web
cd apps/web
cp .env.example .env.local   # PYTH_API_KEY (Hermes), POT_INDEX_FAUCET_KEYPAIR (devnet faucet + market maker)
npm install && npx next dev

# devnet operations (see docs/potfolio/operations.md)
npm run pot-index:init                     # assets, inventory, showcase Pots
npm run pot-index:keeper -- --loop 300     # keeper over all showcase Pots
npm run pot-index:flow -- deposit 100      # deposit / exit / exit-usdc / allocate / status
```

Tests cover: fee split with and without referrer, self-referral rejection, missing `close` and under-delivery reverting a rebalance, overshoot and oversized trades, stale prices blocking deposits but not exits, exit to USDC with minimum and conversion fee, cash deployment without cooldown, two-step admin and weight validation.

## Security

Reviewed against the Solana Foundation program-security checklist (Oct 8, and Oct 10 by an independent reviewer agent after exit-to-USDC): no criticals or highs; the two mediums (oracle tick shopping, keeper margin on cash deploys) are fixed, see [docs/potfolio/security.md](docs/potfolio/security.md). Oracle age cap and conservative confidence pricing, rebalance deadband and cooldown, two-step admin, exit safety valve against a stale rebalance flag, `init_if_needed` ATAs, 1 USDC minimum deposit. Known and accepted for the devnet build: a depositor can self-refer from a second wallet (registered referrers later); keeper slippage up to 1% is the implicit rebalance cost. Third-party audit, Squads multisig for upgrade authority and a capped flagship are on the [mainnet path](https://potbot.fun/mainnet). Report issues per [SECURITY.md](SECURITY.md).

## What is next

Fixed weights today. Next: exit to USDC through Jupiter on mainnet, Managed POTfolios (creator adjusts inside a public mandate with a timelock), Community POTfolios (holders vote with the token), 10 assets, a POTfolio/USDC pool on Meteora, Bot digest for holders. Roadmap: [potbot.fun/roadmap](https://potbot.fun/roadmap).

## PotBot v2 (previous hackathon)

Governed group vaults (`pot_vault`, devnet `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`): members deposit, propose trades, vote, the program executes through Jupiter. MCP server `@potbot/mcp` exposes vaults to AI agents. Docs under [`docs/architecture`](docs/architecture). The vault UI is kept for reference while it is reworked; POTfolio is the live product.

---

Founder: Yehor (YD), Amsterdam. [@CryptoYDao](https://x.com/CryptoYDao) · Y-DAO Amsterdam · Superteam NL. MIT license.
