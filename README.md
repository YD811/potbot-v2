<div align="center">

# PotBot POTFolio

### Any basket of Solana assets. One liquid token.

Pick up to 5 assets and weights. Holders deposit USDC and get a token that mirrors the whole basket. They can hold it, send it, trade it, and redeem it any time for every asset inside or for USDC. Nobody can withdraw the assets, because the program has no instruction for that.

[potbot.fun](https://potbot.fun) · [Live POTFolios](https://potbot.fun/portfolios) · [How it works](https://potbot.fun/learn) · [Roadmap](https://potbot.fun/roadmap) · [Docs](docs/potfolio)

[![CI](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://explorer.solana.com/address/7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV?cluster=devnet)
[![Anchor](https://img.shields.io/badge/Anchor-1.2-blue?style=flat-square)](https://anchor-lang.com)
[![Pyth](https://img.shields.io/badge/Oracle-Pyth%20pull-7142CF?style=flat-square)](https://pyth.network)
[![Tests](https://img.shields.io/badge/LiteSVM-12%2F12-14F195?style=flat-square)](packages/pot-index/tests)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Colosseum Crypto World's Fair entry (Sept 14 to Oct 12, 2026).** What was built during the Fair, where it lives and how to verify it in two minutes: **[HACKATHON.md](HACKATHON.md)** · [judges page](https://potbot.fun/worldsfair)

</div>

---

## Contents

1. [What it is](#what-it-is)
2. [Try it in two minutes](#try-it-in-two-minutes)
3. [How it works](#how-it-works)
4. [Live on devnet](#live-on-devnet)
5. [Security](#security)
6. [Limits today and the path to mainnet](#limits-today-and-the-path-to-mainnet)
7. [Repository map](#repository-map)
8. [Build, test, run](#build-test-run)
9. [Documentation](#documentation)
10. [History](#history)

## What it is

A POTFolio is an on-chain basket with a token on top.

| Role | What they do | What they cannot do |
|---|---|---|
| **Creator** | Picks 2 to 5 assets and weights, names the token, earns 40% of the entry fee forever. | Touch the assets. Can only pause deposits or cap the size. |
| **Holder** | Deposits USDC, receives tokens at the basket's current value (NAV). Redeems any time for every asset in kind or for USDC in one transaction. | Be locked in. Exit needs no oracle, no keeper, and cannot be paused. |
| **Keeper** | Buys and rebalances the basket toward target weights. Anyone can run one. | Trade past target, trade more than 25% of NAV at once, or deliver less than the Pyth-priced minimum. The whole transaction reverts. |
| **PotBot** | Runs the site, the keeper and the price operator; takes 20% of the entry fee. | Withdraw. There is no such instruction. Upgrades and asset listing go behind a multisig before mainnet. |

Fees: 0.30% on entry (40% creator, 40% referrer, 20% protocol), 0.50% on exit stays in the Pot for remaining holders, 0.10% on conversion to USDC. Details in [fees and economics](docs/potfolio/fees-and-economics.md).

## Try it in two minutes

On [potbot.fun/portfolios](https://potbot.fun/portfolios), devnet, with any Solana wallet or an email sign-in:

1. Open a POTFolio and click **Get test USDC**. An empty wallet also receives a little SOL for fees.
2. **Deposit.** One wallet prompt. The program mints your tokens at NAV; the basket is bought leg by leg right after, visible in the activity feed.
3. **Redeem** for the assets or for USDC. One wallet prompt again.
4. Open **My Dashboard** for your positions, share of each Pot, P&L, created Pots and invite links.

Every step is a real devnet transaction with an Explorer link. The same flow from a terminal, through the same server routes the site uses:

```bash
cd apps/web
POT_INDEX_WALLET_KEYPAIR=judge.json POT_INDEX_BASE_URL=https://potbot.fun \
  npx tsx scripts/pot-index-operator-flow.ts faucet                 # 1,000 tUSDC + 0.1 SOL
npx tsx scripts/pot-index-operator-flow.ts deposit   <mint> 40      # mint at NAV, basket bought
npx tsx scripts/pot-index-operator-flow.ts exit      <mint> 5000000 # 5 tokens back in kind (base units)
npx tsx scripts/pot-index-operator-flow.ts exit-usdc <mint> 15000000 # 15 tokens as USDC, on-chain minimum
```

## How it works

```text
creator   create_pot → add_leg ×2..5 → finalize_pot → set_index_metadata     one tx, token exists (Pot… mint, name, logo)
holder    deposit(usdc)             → fee split → mint at Pyth NAV             one signature
keeper    rebalance_open … swap … rebalance_close                               bounded, atomic, toward target only
holder    exit(shares)              → every asset pro-rata, in kind            never pausable, no oracle
holder    exit_usdc_open … sell legs … exit_usdc_close                        USDC in one tx, program-enforced minimum
nobody    withdraw                                                              no such instruction
```

**Single ledger.** The SPL token supply is the only record of ownership. Mint on deposit, burn on exit, no internal balances to drift.

**Honest price.** Deposits are priced from Pyth pull updates no older than 60 seconds (cap enforced in code), confidence at most 2%, priced at price ± confidence against the Pot. Stale prices block deposits, never exits.

**One signature.** The price operator refreshes Pyth prices into persistent price accounts, prepares the single holder transaction and hands it to the wallet. After the holder signs, the operator submits it and, for deposits, buys the basket as keeper. The holder signs once; the program checks everything. Details in [operations](docs/potfolio/operations.md).

**Bounded keepers.** `rebalance_open` reads the transaction through the Instructions sysvar and refuses unless a matching `rebalance_close` follows. Trades move toward target weights only, at most 25% of NAV per trade, and must deliver at least the Pyth value minus the slippage band, or everything reverts.

**Metadata on-chain.** Metaplex metadata is attached by the program, so the token shows its name and logo in every wallet.

Program reference with every instruction, account, limit and error code: [program.md](docs/potfolio/program.md).

## Live on devnet

Program `7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV` ([Explorer](https://explorer.solana.com/address/7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV?cluster=devnet)), 18 instructions, v1.2 since Oct 13 (v1.1 stays live at `7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV`). Five showcase POTFolios with live Pyth prices and test tokens:

| POTFolio | Basket | Mint |
|---|---|---|
| Solana Blue Chips `$SBC` | SOL 50 / BTC 30 / ETH 20 | [`Pot6gaQ…`](https://potbot.fun/portfolios/Pot6gaQTW8NeMckGDWg4MRGvMaq5QNYimj1xRwQKVka) |
| Solana Native `$SOLN` | SOL 50 / JitoSOL 30 / PYTH 20 | [`PotzuWS…`](https://potbot.fun/portfolios/PotzuWSUkEkJg4u8dSTPG9dZVmdydPoiuD5W3TWGDYH) |
| Majors 5 `$MJR5` | BTC 35 / ETH 25 / SOL 20 / BNB 10 / XRP 10 | [`PotdDQX…`](https://potbot.fun/portfolios/PotdDQXTGbL1x3ZyKXJY4ktZkR26idc8fk7kAwtd7yy) |
| Wall St on Solana `$WSTS` | TSLAx 40 / QQQx 40 / SOL 20 | [`Potqvh3…`](https://potbot.fun/portfolios/Potqvh3mnU3TfiKRqQg93D6xTqA24NFpFape2Wf4TBP) |
| Doge & Sol `$DGSL` | DOGE 60 / SOL 40 | [`PotaoNk…`](https://potbot.fun/portfolios/PotaoNkiqtR4m9g5v63veF9X1NrbNEH6i6LERtR7NPf) |

Anyone can create their own at [potbot.fun/portfolios/new](https://potbot.fun/portfolios/new). Devnet legs are test mints priced from real Pyth feeds; swaps run against a PotBot market maker. On mainnet the legs are the real tokens and the swaps go through Jupiter.

## Security

Three reviews before the Fair closed: Oct 8 and Oct 10 against the Solana Foundation program-security checklist (the second by a reviewer that had not seen the code being written), and Oct 11 an independent human review by a Solana engineer. Result: no fund-draining path from an unprivileged account, no critical or high findings.

The Oct 11 review showed that the Oct 10 oracle fix was not one: a pull oracle accepts old signed ticks posted now, so a slot check does not bound price age. The fix is the age window itself: 60 seconds, hard cap in code, with a test that rejects a 45-second-old tick 10% below market.

What the program enforces: oracle age cap and conservative confidence pricing, rebalance deadband and cooldown, per-trade cap and slippage floor, two-step admin, exit safety valve against a stale rebalance flag, USDC cannot be registered as a leg, 1 USDC minimum deposit.

Known and accepted on devnet: a depositor can self-refer from a second wallet (registered referrers later); the slippage band is a floor a keeper can take in full; upgrade authority and admin are one key until the Squads multisig lands. Every finding, with status, is in [security.md](docs/potfolio/security.md). Report issues per [SECURITY.md](SECURITY.md).

## Limits today and the path to mainnet

Fixed weights. Up to 5 assets. Devnet swaps through a PotBot market maker, not Jupiter. One operator key.

Before the first mainnet deposit: Squads 2-of-3 multisig with a timelock on upgrade authority, admin and asset registration; deploy and `init_config` in one transaction; verified build on Explorer; external audit of the final version; Jupiter for exits to USDC; a capped flagship POTFolio. Then: Managed POTFolios (creator adjusts inside a public mandate with a timelock), Community POTFolios (holders vote with the token), 10 assets, a POTFolio/USDC pool on Meteora, Creator POTFolios built from a public profile. Live roadmap: [potbot.fun/roadmap](https://potbot.fun/roadmap) · [mainnet checklist](https://potbot.fun/mainnet).

## Repository map

```text
packages/pot-index/            pot_index Anchor program (the POTFolio protocol) + LiteSVM tests      ← start here
  programs/pot_index/src/      lib.rs (18 instructions), instructions/, state/, oracle.rs, constants.rs
  tests/                       40 end-to-end tests: pot_flow, guards, invariants
apps/web/                      Next.js app: landing, /portfolios, /portfolios/new, /portfolios/[mint], /dashboard, /learn, /roadmap, /mainnet
  src/lib/pot-index/           client builders, Pyth helpers, registry, operator (server), garden levels
  src/app/api/pot-index/       tx/prepare + tx/submit (one-signature flow), faucet, NAV history, token metadata
  src/hooks/usePotIndex.ts     deposit / exit / exit-usdc from the browser
  scripts/                     devnet init, keeper, operator flow, metadata, config
docs/potfolio/                 overview, program, fees, keepers, garden mode, security, landscape, operations, FAQ
packages/program/              pot_vault: PotBot v2 governed vaults (previous hackathon, kept for reference)
packages/sdk/  apps/api/  apps/keeper/  apps/bot/  apps/potbot-mcp/      PotBot v2 supporting services
```

## Build, test, run

```bash
# program (Anchor 1.2.1, Solana CLI 4.3, Rust 1.89)
cd packages/pot-index
./test.sh                                  # SBPF build + LiteSVM suite, 40 tests, mainnet and devnet builds
anchor build                               # deployable artifact + IDL

# web
cd apps/web
cp .env.example .env.local                 # PYTH_API_KEY, POT_INDEX_FAUCET_KEYPAIR (devnet operator), NEXT_PUBLIC_SOLANA_RPC_URL
npm install && npx next dev

# devnet operations (docs/potfolio/operations.md)
npm run pot-index:init                     # assets, inventory, showcase Pots
npm run pot-index:keeper -- --loop 300     # keeper over all showcase Pots
npx tsx scripts/pot-index-set-config.ts show
```

CI runs the program tests and the web build on every push.

## Documentation

| Doc | What it covers |
|---|---|
| [overview.md](docs/potfolio/overview.md) | The product, the pivot from governed vaults to the token, who it is for |
| [program.md](docs/potfolio/program.md) | Every instruction, account, limit and error code |
| [fees-and-economics.md](docs/potfolio/fees-and-economics.md) | Fee split, creator and referrer economics, revenue model |
| [keepers.md](docs/potfolio/keepers.md) | Rebalance bounds, keeper incentives, price operator |
| [security.md](docs/potfolio/security.md) | Three reviews, every finding and its status, trust model |
| [operations.md](docs/potfolio/operations.md) | Deploy history, one-signature flow, judge run |
| [landscape.md](docs/potfolio/landscape.md) | Symmetry, Cesto, DiversiFi, GLAM, Ondo and what POTFolio adds |
| [faq.md](docs/potfolio/faq.md) | Questions holders and creators ask |

## History

PotBot started as a Telegram group that wanted to trade from one wallet. Three Colosseum hackathons, one idea:

1. **Group trading** (v1): a shared pot, votes on trades, one treasury for the group.
2. **Governed vaults** (v2, Solana Frontier): non-custodial vaults with strategies, capital in program-owned accounts, the group governs. Program `pot_vault`, MCP server for AI agents. Kept in this repo under `packages/program` and `apps/`.
3. **The token** (POTFolio, Crypto World's Fair): the vault wrapped into a single liquid token anyone can hold. This is the product PotBot keeps building after the Fair.

Founder: Yehor (YD), Amsterdam. Y-DAO Amsterdam · Superteam NL. MIT license.
