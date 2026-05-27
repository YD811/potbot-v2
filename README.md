<div align="center">

# POTBOT

### Tokenize any internet community.

**POTBOT is AI-native infrastructure for programmable onchain treasuries on Solana.**

`POT` = Programmable On-chain Treasury  ·  `BOT` = Blockchain Orchestration Tool

[potbot.fun](https://potbot.fun) · [@PotBot_sol](https://twitter.com/PotBot_sol) · [Solana Frontier 2026](https://colosseum.com/frontier)

[![CI](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square)](https://anchor-lang.com)
[![MCP](https://img.shields.io/badge/MCP-native-14F195?style=flat-square)](https://www.npmjs.com/package/@potbot/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Manifesto

> The internet already coordinates capital.
>
> POTBOT gives every internet community:
> **programmable ownership · liquid coordination · AI-native execution · onchain governance.**

---

## What is POTBOT

POTBOT is a Solana-native protocol for tokenized internet communities. Any group can launch a programmable treasury (a **POT**), pool capital, receive tokenized shares, coordinate on-chain governance, and delegate execution to an AI agent (the **BOT**).

The vault is a Solana program account from day one — no custodian, no operator, no shared seed phrase. Every move is signed onchain.

**Two front doors:**
- **Crypto mode** — Phantom or Solflare via `@solana/wallet-adapter`, full DeFi terminology
- **Normie mode** — sign in with email, Google, Twitter or LinkedIn (Privy-backed embedded Solana wallet); plain-English copy, USD-first prices. No Phantom required

---

## What is a POT

A POT is a program-controlled treasury on Solana. Members deposit SOL, USDC, LSTs, LP positions or any tokenized asset, and receive proportional shares (NAV-priced). Every change to the treasury — swap, withdrawal, settings update — is a proposal that members vote on. The vault PDA signs the execution.

- **Programmable ownership** — SPL-tokenized shares, redeemable any time
- **Onchain governance** — five levels from Autocracy (L0) to Consensus (L4), plus optional risk caps (`max_swap_pct`, `max_budget_grant_pct`, `require_admin_cosign`, `timelock_seconds`)
- **AI orchestration** — the BOT proposes, executes once quorum is reached, and can be delegated to vote on rules you set
- **Composable** — Jupiter v6 / Ultra swaps, Squads v4 multisig authority, MCP for any AI agent, Solana Blinks for tweet-native deposits and votes
- **Identity** — every POT can claim a `<name>.potbot.sol` SNS subdomain
- **Optional privacy** — STAMPPOT mode wraps deposits in PrivacyCash ZK proofs (Phase 3)

---

## What can a POT become?

| | |
|---|---|
| 🎨 **Creator Fund** | Fans co-own the next drop and split the upside. |
| 🧠 **AI Vault** | An agent runs a strategy, the community sets the rules. |
| 🚀 **Startup Syndicate** | Angel checks pooled, deployed, and tracked onchain. |
| 🎟 **Event Treasury** | Conference floats, hackathon prizes, festival cash — transparent. |
| 👥 **Friend Group ETF** | A shared basket your group actually agrees on. |
| 🎲 **Meme Treasury** | Communities betting together, governed together. |
| 💼 **Investment Club** | Quarterly proposals, monthly votes, zero spreadsheets. |

---

## POT Lifecycle — Money Tree 🌱

Every POT is a living organism. As AUM grows, members join, and trades execute, the pot advances through six stages — each unlocking new capabilities.

| Stage | Emoji | Unlock |
|---|---|---|
| Seedling | 🌱 | Launch, deposit, governance |
| Sprout | 🌿 | Strategy slots, keeper automation |
| Bud | 🌳 | Pot Duels (1v1 vault challenges) |
| Bloom | 🌺 | NFT Strategy Shares mint |
| Full Bloom | 🌸 | SNS subdomain, share tokenization |
| Mature Tree | 🌴 | Squads multisig authority, mainnet prereq |

**Health (HP):** every pot has 0–100 HP, computed as `clamp(0, 100, 100 × current_balance / peak_balance)`. At 0 HP a pot dies — trading locks, Strategy Share NFTs burn, and a `resurrect_pot` call with a fresh deposit is required (stage resets). Low HP automatically triggers defensive-only mode at the program level.

---

## AI orchestration layer (BOT)

POTBOT is built for the coming agent economy. Every POT exposes a programmatic surface that an AI can read, propose against, and execute through.

**Two-tier AI architecture:**
- **Base BOT** — reads treasury state and live prices, surfaces candidate swap proposals as decision-support for the community
- **Personal AI Voter** — every member can register an AI agent wallet as their voting delegate (`MemberDelegate` + `vote_as_delegate`). Delegation is per-pot, revocable onchain; every delegated vote is signed with a reason string. Rules live in `rules_uri` (IPFS / Arweave / HTTPS)

**Keeper automation:**
- Anchored worker evaluates stop-loss, take-profit, and trailing-stop strategy slots on-chain
- Once a trigger fires, the keeper submits `execute_swap` with `StrategyTrigger` mode — no member needs to be online
- DLQ retries on exponential backoff (2s / 5s / 13s / 34s / 89s)

**MCP-native:**
- `@potbot/mcp@0.2.0` on npm — 18 tools (free + paid via x402 protocol)
- Claude, Cursor, Cline can list, propose and vote on POTs over `npx @potbot/mcp`
- HTTP/SSE and stdio transports both supported

---

## Solana Blinks

Every POT proposal becomes a shareable Blink — a vote-able URL that renders directly in X (Twitter), Farcaster, or any Blinks-compatible client. No wallet app required to act on it.

```
https://potbot.fun/api/actions/<potPubkey>/deposit
https://potbot.fun/api/actions/<potPubkey>/vote
```

"Share as Blink" button lives on every pot detail page.

---

## Revenue model

| Stream | Rate | Status |
|---|---|---|
| Swap fee | 0.30% on every trade routed through a pot | 🟢 Live |
| Performance fee | 10% on Strategy Vault returns, split with strategy creator | 🟡 Devnet |

No token, no airdrop farming.

---

## Architecture

```
                   ┌──────────────────────────────┐
                   │     Internet community       │
                   │  (humans · agents · creators)│
                   └──────────────┬───────────────┘
                                  │
                       deposit · propose · vote · blink
                                  │
                   ┌──────────────▼───────────────┐
                   │      POTBOT DApp + MCP       │
                   │  apps/web · apps/potbot-mcp  │
                   └──────┬───────────────┬───────┘
                          │               │
                    keeper cron      agent delegate
                          │               │
                   ┌──────▼───────────────▼───────┐
                   │   pot_vault Anchor program   │
                   │     (PDA-signed treasury)    │
                   └──────┬───────────────┬───────┘
                          │               │
                  Jupiter v6 CPI    Squads v4 (opt.)
                          │
                   onchain settlement
```

Three layers: an Anchor program that owns the funds, a Next.js + MCP surface that any human or agent can drive, and Solana-native composability (Jupiter, Squads, Blinks, Helius, Pyth).

Detailed system design: [`docs/architecture/architecture.md`](docs/architecture/architecture.md).

---

## What makes POTBOT different

Three things only POTBOT ships together:

1. **Onchain group governance baked into the swap instruction** — not a generic multisig queue. `execute_swap` enforces `AdminDirect`, `Proposal`, or `StrategyTrigger` mode at the program level with strict mode-source matching.
2. **MCP-native treasury** — `@potbot/mcp` exposes 18 tools so any LLM can list, propose, vote on, and execute swaps in a pot over a single `npx` command.
3. **Solana Blinks** — a governance proposal becomes a vote-able tweet. Anyone can act on it without leaving X.

---

## Quick start

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install

# Copy env template and fill in your own keys
cp .env.example apps/web/.env.local

# Run the DApp locally
cd apps/web && npx next dev   # → http://localhost:3000

# Or talk to the live MCP server from any AI client
npx @potbot/mcp
```

Set `NEXT_PUBLIC_PRIVY_APP_ID` to enable email / Google / Twitter / LinkedIn login (Normie mode). Without it the app still boots — Crypto-mode Phantom flow always works. Full local-dev setup (Anchor, devnet deploy, all env vars): [`docs/operations/development.md`](docs/operations/development.md).

---

## Current status

| Layer | Status |
|---|---|
| `pot_vault` Anchor program (30+ instructions: deposit · propose · vote · execute_swap) | 🟡 Devnet live |
| Jupiter v6 / Ultra swap CPI (vault PDA signer) | 🟡 Devnet live |
| Solana Blinks (deposit + vote endpoints) | 🟢 Live |
| MCP server `@potbot/mcp@0.2.0` on npm (18 tools, x402 paid tier) | 🟢 Live |
| Squads v4 multisig authority (optional, UI + lib) | 🟢 Live |
| Helius RPC + webhook indexer | 🟢 Live |
| Keeper — stop-loss / take-profit / trailing-stop cranks | 🟡 Devnet live |
| BOT base layer — AI proposal suggestions | 🟡 Devnet live |
| Personal AI Voters (`MemberDelegate` + `vote_as_delegate`) | 🟡 Devnet live |
| Money Tree lifecycle (6 stages, HP health system) | 🟡 Devnet live |
| Strategy slot accounts (`create_strategy` / `close_strategy`) | 🟡 Devnet live |
| PWA (Saga / Seeker installable) | 🟢 Live |
| Normie mode — Privy email / Google / Twitter / LinkedIn + embedded Solana wallet | 🟢 Live |
| Light theme + plain-English copy + USD-first prices | 🟢 Live |
| Account dashboard (profile · live SOL balance · Add SOL airdrop · Quick Trade) | 🟢 Live |
| `pot_duel` program — 1v1 vault challenges (unlocks at Bud stage) | 🟡 Devnet live |
| Pyth in-program oracle guard (re-reads price feeds inside `execute_swap`) | 🔵 Phase 2 |
| Meteora DLMM + Kamino yield strategies | 🔵 Phase 2 |
| Light Protocol ZK-compressed audit log | 🔵 Phase 2 |
| Tamagotchi NFT mint (Bloom unlock, Metaplex) | 🟣 Phase 3 |
| STAMPPOT privacy mode (PrivacyCash ZK proofs) | 🟣 Phase 3 |
| Mainnet deploy | 🔵 Post security pass |

Every feature with its lifecycle chip: [potbot.fun/roadmap](https://potbot.fun/roadmap)

---

## Repository layout

```
potbot-v2/
├── apps/
│   ├── web/              Next.js 14 DApp + API routes + Vercel Functions
│   └── potbot-mcp/       MCP server published as @potbot/mcp
├── packages/
│   ├── program/          Anchor programs (Rust) — pot_vault, pot_duel
│   ├── sdk/              TypeScript SDK (@potbot/sdk)
│   └── ui/               Shared React components (@potbot/ui)
├── docs/                 Architecture, operations, integrations, hackathon
├── scripts/              Devnet utilities (demo pots, seeding)
└── supabase/             Off-chain index migrations (NAV snapshots, swap metadata)
```

---

## Documentation

| | |
|---|---|
| [Architecture overview](docs/architecture/overview.md) | System design, on-chain accounts, data flow |
| [Program reference](docs/architecture/program.md) | Instructions, PDAs, governance accounts |
| [Governance model](docs/architecture/governance.md) | L0–L4 levels, quorum, risk caps |
| [Local development](docs/operations/development.md) | Setup, commands, troubleshooting |
| [Deployment](docs/operations/deploy.md) | Devnet → mainnet procedure |
| [MCP integration](docs/integrations/mcp.md) | AI-agent integration guide |
| [Hackathon submission](docs/hackathon/README.md) | Solana Frontier 2026 judge sheet |
| [Security policy](SECURITY.md) | Responsible disclosure |
| [Contributing](CONTRIBUTING.md) | How to propose changes |

---

## License

MIT © 2026 Y-DAO Amsterdam.
