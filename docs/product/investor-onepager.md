# PotBot — Investor One-Pager

*June 2026 · potbot.fun · @PotBot_sol · Solana Frontier 2026*

**Non-custodial group trading vaults on Solana. AI proposes, members vote, the program executes — no one holds the keys.**

---

## Problem

Groups already trade together — in Telegram chats, friend circles, KOL communities. Today they do it through custodial bots and "trusted" wallet holders, and it keeps ending badly: the 2026 Axiom insider front-running scandal, $40M+ in agent/vault drains, and the daily quiet rug of "the guy with the keys disappeared." There is no safe primitive for *a group* to pool capital, decide together, and let software execute — without trusting a person.

## Solution

A **POT**: a program-owned vault (PDA) on Solana. Members deposit and receive shares; every trade is a proposal; share-weighted votes (5 governance levels, L0 Autocracy → L4 Consensus) gate execution; Jupiter executes swaps inside on-chain risk caps. A bounded **AI agent can only propose** — it has no key that moves funds. Security model borrowed from Morpho Vault V2: **sentinel/guardian role** (can freeze, can never withdraw), **timelocks on loosening risk parameters**, per-protocol and per-asset exposure caps. Member exit is never blockable — even in a frozen pot.

Consumer-grade onboarding: email login (Privy), no seed phrase, join a pot in under 2 minutes.

## Why now

- Custodial trading bots keep burning users → trust-by-architecture is a timely wedge.
- The category is funded and proven adjacent: Morpho ($10B+ TVL), Squads ($18M raised, $10B+ secured), Midas ($50M raised). **None of them do social + group governance + bounded AI + consumer onboarding.** PotBot owns that gap.
- Solana agents/MCP ecosystem is exploding — PotBot ships an MCP server (`@potbot/mcp`, 60+ actions) so any AI agent can operate pots within governance bounds.

## Traction

- **Live on devnet** end-to-end: create → deposit → propose → vote → execute, DApp at potbot.fun (mock demo mode works without a wallet).
- **Security hardening shipped**: sentinel role, risk-param timelocks, exposure caps; 14 program tests green; adversarial AI security review passed (0 critical open); formal audit planned.
- `@potbot/mcp` published on npm; 2-tier on-chain referral system built; SNS subdomain identity (`name.potbot.sol`) live.
- Superteam grant recipient; building in public ahead of Solana Frontier 2026.

## Market

Solana DEX volume routinely exceeds $3–5B/day; trading bots/terminals (Axiom, Trojan, Photon, BullX) capture hundreds of millions in annualized fees from *single-player* flows. PotBot targets the unserved multiplayer slice: trading group chats, KOL communities, DAOs/Superteam circles, and AI-agent operators — plus the next cohort that needs email-grade onboarding.

## Business model (gross protocol revenue — fee switch ships with mainnet)

| Stream | Take |
|---|---|
| Protocol swap fee on pot volume | 0.30% |
| Strategy Vault entry fees | 20% of entry fee (70% creator / 10% referrer) |
| Performance fee share | 25% of creator perf fee (on profit) |
| Premium subscriptions (Pro $29 / Pro+ $99) | 100% |
| Pot creation fee | 0.01 SOL flat |

*Today only the 0.01 SOL creation fee is collected onchain; the swap/entry/perf protocol shares below are the designed fee switch, activating with the mainnet program iteration.*

**Scenarios (monthly run-rate):** Conservative — 50 pots, $150k TVL → ~$0.4k/mo. **Base — 250 pots, $2M TVL → ~$8k/mo (~$95k/yr).** Aggressive — 1,200 pots, $24M TVL → ~$170k/mo (~$2M/yr). Lean cost base: ~$430/mo opex (solo founder + AI tooling).

## Roadmap

- **Now:** mainnet deploy (gated only on wallet funding, ~5 SOL), flagship pot with public live TVL.
- **Q3'26:** Strategy Vaults creator economy (founding-creator program), Kamino/Meteora yield routing, Blinks share cards (deposit/vote in X/TG).
- **Q4'26:** multi-asset pots, NFT strategy shares, Squads-secured institutional pots, privacy mode (Light Protocol ZK).

## Ask

Pre-seed conversation: capital + distribution partners (wallets for Blinks placement, KOLs to seed founding Strategy Vaults). The protocol is mainnet-ready; the next dollar goes to launch, audit, and creator acquisition — not to figuring out what to build.

*Detail: `docs/product/competitive-analysis.md` (landscape), `docs/product/economics.xlsx` (model), `docs/operations/READINESS.md` (mainnet gate).*
