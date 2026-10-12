# Crypto World's Fair: what was built, where it is, how to check it

Colosseum Crypto World's Fair, Sept 14 to Oct 12, 2026. Entry: **PotBot POTFolio**, any basket of Solana assets as one liquid token. Judges page with the full story: [potbot.fun/worldsfair](https://potbot.fun/worldsfair). Product README: [README.md](README.md).

## In numbers

| | |
|---|---|
| Program | `pot_index`, Anchor 1.2, written from scratch during the Fair. 18 instructions. Devnet `7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV` (v1.2, Oct 13, after an independent review; [Explorer](https://explorer.solana.com/address/7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV?cluster=devnet)). v1.1, live since Oct 8, stays at `DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr` |
| Tests | 40 LiteSVM end-to-end tests (flow, guards, invariants), run twice in CI on every push: mainnet and devnet builds |
| Reviews | 3 security reviews (Oct 8, Oct 10 checklist-based; Oct 10 to 12 independent human review by a Solana engineer: 26 findings, 0 critical, 1 high in the operator, fixed). No fund-draining path. 13 findings fixed in v1.1 and v1.2. [Report](docs/potfolio/security.md), [decisions](docs/potfolio/decisions.md) |
| Live | 5 showcase POTFolios with real Pyth prices, faucet, keeper, price operator, index price history and P&L per wallet |
| Code | 86 commits, ~170 files, ~18,500 lines added across program, web app, scripts and docs |

## What is new in this period

Everything below did not exist on Sept 14.

**The protocol.** `packages/pot-index`: Pot PDAs with one vault per asset plus a USDC cash vault, an SPL index token as the single ledger of ownership, Metaplex metadata attached by the program. Deposit mints at Pyth-priced NAV (pull updates, max 60 s old, cap in code, confidence at most 2%, priced at price ± confidence against the Pot). Exit in kind is never pausable and needs no oracle. Exit to USDC sells the legs inside the same transaction and enforces a Pyth-priced minimum. Rebalancing is atomic and bounded through Instructions-sysvar introspection: toward target only, at most 25% of NAV per trade, delivery floor or everything reverts. Fee split on-chain: 0.30% entry (40% creator, 40% referrer, 20% protocol), 0.50% exit stays with remaining holders, 0.10% conversion. Creator can only pause deposits or cap size. Two-step admin, asset allowlist with mint ↔ Pyth feed pairs.

**One signature.** The holder signs one transaction for deposit, exit and exit to USDC. A price operator refreshes Pyth prices into persistent price accounts, prepares the holder transaction, verifies it after signing (HMAC token over the compiled instructions) and submits it; for deposits it then buys the basket as keeper. `apps/web/src/lib/pot-index/operator.server.ts`, `apps/web/src/app/api/pot-index/tx/{prepare,submit}`.

**The app.** `apps/web`: landing, POTFolio list and detail pages (composition, index price history, your cost basis and P&L, activity feed with Explorer links, Garden mode where every Pot grows a plant with its NAV), create-a-POTFolio flow, My Dashboard (positions with share of each Pot, created Pots and creator fees, invite links), learn, roadmap, mainnet checklist and judges pages. Wallet adapter plus email sign-in.

**Operations.** Devnet faucet (test USDC + SOL), market maker for devnet swaps, keeper loop, operator flow script that replays the exact judge run, config and metadata scripts. `apps/web/scripts/pot-index-*`.

**Docs.** `docs/potfolio/`: overview, program reference, fees and economics, keepers, garden mode, security (every finding with status), landscape, operations, FAQ.

What is older: PotBot v2 governed vaults (`packages/program`, `packages/sdk`, `apps/api`, `apps/keeper`, `apps/bot`, `apps/potbot-mcp`) come from the previous hackathon and are kept for reference. POTFolio is the product.

## Verify it in two minutes

In the browser: [potbot.fun/portfolios](https://potbot.fun/portfolios), connect any devnet wallet or sign in with email, **Get test USDC**, deposit, redeem for assets or for USDC. Every step links to Explorer.

From a terminal, against production, through the same routes the site uses:

```bash
npm install && cd apps/web
solana-keygen new -o judge.json --no-bip39-passphrase
export POT_INDEX_WALLET_KEYPAIR=judge.json POT_INDEX_BASE_URL=https://potbot.fun
MINT=Pot6gaQTW8NeMckGDWg4MRGvMaq5QNYimj1xRwQKVka          # Solana Blue Chips

npx tsx scripts/pot-index-operator-flow.ts faucet                   # 1,000 tUSDC + 0.1 SOL
npx tsx scripts/pot-index-operator-flow.ts deposit   $MINT 40       # mint at NAV, basket bought (3 trades)
npx tsx scripts/pot-index-operator-flow.ts exit      $MINT 5000000  # 5 tokens back in kind
npx tsx scripts/pot-index-operator-flow.ts exit-usdc $MINT 15000000 # 15 tokens as USDC, on-chain minimum
```

Program tests: `cd packages/pot-index && ./test.sh` (Anchor 1.2.1, Solana CLI 4.3, Rust 1.89).

## Timeline

| Date | |
|---|---|
| Sept 14 | Fair opens. Decision: wrap the vault into a token. |
| Oct 8 | `pot_index` on devnet, first POTFolio, first security review |
| Oct 10 | Second review, v1.0 upgrade, five showcase POTFolios |
| Oct 11 | Independent human review: the oracle fix was not a fix (pull oracle accepts old ticks). Window set to 60 s with a cap in code, test added |
| Oct 12 | v1.1 upgrade. One-signature flow for all holder actions. My Dashboard. Production on potbot.fun. Independent review: 26 findings, holder pays its own rent (#97) |
| Oct 13 | v1.2 at a new address after the review: upgrade-authority-only init, live-price check on listing, freezable mints refused, last holder pays no exit fee, admin events, 40 tests |

## Where to read more

- [README.md](README.md): the product, how it works, limits, path to mainnet
- [docs/potfolio/security.md](docs/potfolio/security.md): all three reviews, 14 findings, what changed and what is accepted
- [docs/potfolio/operations.md](docs/potfolio/operations.md): deploy history, one-signature flow, judge run
- [potbot.fun/worldsfair](https://potbot.fun/worldsfair): the narrative for judges
