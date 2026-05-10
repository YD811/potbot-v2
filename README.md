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
> Friends invest together.
> Communities speculate together.
> Creators build economies together.
>
> But the infrastructure is still primitive.
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
- **Onchain governance** — autocracy → advisory → majority → supermajority → consensus, plus optional risk caps
- **AI orchestration** — the BOT proposes, executes once quorum is reached, and can be delegated to vote on rules you set
- **Composable** — Jupiter v6 swaps, Squads v4 multisig authority, MCP for any AI agent, Solana Blinks for tweet-native deposits and votes
- **Identity** — every POT can claim a `<name>.potbot.sol` SNS subdomain
- **Optional privacy** — STAMPPOT mode wraps deposits in PrivacyCash ZK proofs

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

## AI orchestration layer (BOT)

POTBOT is built for the coming agent economy. Every POT exposes a programmatic surface that an AI can read, propose against, and execute through.

- **Proposal generation** — agent reads treasury state and live prices, then drafts the next move
- **Automated execution** — once quorum is reached, the BOT submits the swap with the vault PDA as signer
- **Governance coordination** — delegated votes, rule presets, weighted thresholds
- **MCP-native** — Claude, Cursor, Cline can list, propose and vote on POTs over `npx @potbot/mcp`
- **SDK + API** — TypeScript SDK and JSON RPC surface for any agent framework or backend

---

## Architecture

```
                   ┌──────────────────────────────┐
                   │     Internet community       │
                   │  (humans · agents · creators)│
                   └──────────────┬───────────────┘
                                  │
                       deposit · propose · vote
                                  │
                   ┌──────────────▼───────────────┐
                   │      POTBOT DApp + MCP       │
                   │   apps/web · apps/potbot-mcp │
                   └──────────────┬───────────────┘
                                  │
                                  │ signed tx
                                  │
                   ┌──────────────▼───────────────┐
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
| `pot_vault` Anchor program (deposit · propose · vote · execute_swap) | 🟡 Devnet live |
| Jupiter v6 swap CPI (vault PDA signer) | 🟡 Devnet live |
| MCP server `@potbot/mcp` on npm | 🟢 Live |
| Solana Blinks (deposit + vote) | 🟡 Devnet live |
| Squads v4 multisig authority (optional) | 🟡 Devnet live |
| Helius RPC + webhook indexer | 🟡 Devnet live |
| BOT — AI orchestration (proposal generation, execution) | 🟡 Devnet live |
| PWA (Saga / Seeker installable) | 🟢 Live |
| Normie mode — Privy email / Google / Twitter / LinkedIn + Solana embedded wallet | 🟢 Live |
| Light theme + plain-English copy + USD-first prices | 🟢 Live |
| Account dashboard (profile · live SOL balance · Add SOL airdrop · Quick Trade) | 🟢 Live |
| Mainnet deploy | 🔵 Post security pass |
| STAMPPOT privacy mode | 🟣 Phase 3 |

Every feature with its lifecycle chip: [potbot.fun/roadmap](https://potbot.fun/roadmap).

---

## Repository layout

```
potbot-v2/
├── apps/
│   ├── web/              Next.js 14 DApp + API routes (production surface)
│   └── potbot-mcp/       MCP server published as @potbot/mcp
├── packages/
│   ├── program/          Anchor programs (Rust) — pot_vault, pot_duel
│   ├── sdk/              TypeScript SDK
│   └── ui/               Shared React components
├── docs/                 Architecture, operations, integrations, hackathon
├── scripts/              Devnet utilities (demo pots, seeding)
└── supabase/             Off-chain index migrations
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
