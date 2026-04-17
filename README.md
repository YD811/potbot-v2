# 🪴 PotBot v2

**Tokenized DeFi strategy vaults on Solana.** Group governance, AI-powered trading agents, creator monetization, and Tamagotchi mascots that evolve with your vault.

Built for [Solana Frontier 2026](https://colosseum.com/frontier) · [@CryptoYDao](https://twitter.com/CryptoYDao) · Y-DAO Amsterdam

[![Build](https://img.shields.io/badge/build-passing-00ff88?style=flat-square)](https://github.com/YD811/potbot-v2)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square)](https://anchor-lang.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)](https://nextjs.org)
[![MCP](https://img.shields.io/badge/MCP-native-14F195?style=flat-square)](https://github.com/YD811/potbot-v2/tree/main/apps/potbot-mcp)

---

## Links

| | |
|---|---|
| 🏠 Landing | [potbot.fun](https://potbot.fun) |
| 📱 DApp | [app.potbot.fun](https://app.potbot.fun) |
| ⚡ Vaults | [app.potbot.fun/vaults](https://app.potbot.fun/vaults) |
| 🤖 Telegram Bot | [t.me/PotBot](https://t.me/PotBot) |
| 🔌 MCP Server | [app.potbot.fun/for-agents](https://app.potbot.fun/for-agents) |
| 🌐 SNS | potbot.sol |

---

## Quick Start

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install
cd apps/web && npx next dev
# Open http://localhost:3000
```

> **No wallet needed to explore.** The DApp boots in demo mode with pre-seeded vaults,
> proposals, and AI agent activity. Connect Phantom to interact on-chain.

For full setup including Anchor, devnet deploy and API server: see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

---

## What is PotBot?

PotBot is a **DeFi strategy marketplace** — think on-chain copy-trading meets tokenized ETF meets Tamagotchi.

### For different users:

| User | What PotBot does for them |
|------|---------------------------|
| 👨‍💻 **Trader** | Create a Strategy Vault, monetize knowledge via entry/performance fees, no custody needed |
| 👥 **Group of friends** | Trade together with shared governance — no one person holds the keys |
| 📣 **Influencer** | Open a public Vault, subscribers invest in your strategy, earn performance fees |
| 🤖 **AI Agent developer** | Build autonomous trading agents via MCP server — 60+ on-chain actions |
| 🏦 **Investor** | Browse Strategy Vaults, filter by PnL/APY/risk, join with one click |

---

## What is a POT?

A **POT** is a shared on-chain vault governed by its members:

- **Collective ownership** — deposit SOL/USDC, receive proportional shares (NAV-based, like an ETF)
- **On-chain governance** — every trade, withdrawal or strategy change requires a vote (L0–L4 configurable)
- **AI Agent** — set rules like *"if SOL < $120, propose buying 10% more"* — agent creates proposals, humans vote
- **DeFi yield** — idle capital deployed via Kamino / Drift / MarginFi strategies
- **Tamagotchi mascot** — evolves 🥚→🐣→🐥→🦅→🐉→⚡ based on AUM, members and trading volume
- **SNS subdomain** — each POT gets `<name>.potbot.site`

---

## Strategy Vaults — Creator Economy

Any trader, influencer, or AI agent can launch a **Strategy Vault** — a tokenized DeFi strategy open to external investors.

```
Creator launches vault → sets entry/performance/management fees
Investors buy in → receive Strategy Shares (SPL tokens, NAV-priced)
AI Agent runs the strategy → proposes swaps based on rules
Group votes → executes only if quorum reached
Tamagotchi evolves → unlock perks (lower fees, Jupiter Limit Orders, NFT shares)
```

### Fee model

| Fee | Who gets it | Range |
|-----|-------------|-------|
| Entry fee | 70% creator · 20% PotBot · 10% referrer | 0 – any |
| Performance fee | Creator (on profit at exit) | 0–20% |
| Management fee | Creator (annual on AUM) | 0–2% |
| Swap fee | PotBot protocol | 0.1–0.5% (Tamagotchi-discounted) |

### Referral system (on-chain, automatic)
- Level 1 referrer: 20% of entry fee at transaction time
- Level 2 referrer: 5% of entry fee
- No claiming needed — paid in the same transaction

---

## AI Agent — Autonomous Proposals

Every POT can have an **AI Agent** that monitors prices and creates governance proposals automatically.

```
You set the rules:
  "If SOL drops below $120 → propose buying 10% more"
  "Every Monday 9am → DCA 5% into $JUP"
  "If portfolio PnL > +20% → propose taking 30% profit"

Agent runs 24/7 → evaluates rules every 60 seconds
Rule triggers → Agent creates proposal on-chain
Group votes → Quorum required before any execution

AI suggests. Humans decide. Nothing executes without votes.
```

**Supported triggers:** `price_above`, `price_below`, `time_interval` (cron), `balance_above`, `balance_below`, `pnl_above`, `pnl_below`

**Supported actions:** `propose_swap`, `propose_dca`, `propose_yield_deposit`, `vote_yes`, `alert`

---

## MCP Server — AI-Native Infrastructure

PotBot is **MCP-native**. Any AI agent (Claude, GPT, custom LLM) can interact with every vault via the PotBot MCP server.

```typescript
// Any AI agent can:
await mcp.call('list_pots')            // browse all public vaults
await mcp.call('get_pot_analytics', { pubkey })  // PnL, NAV, APY, Sharpe
await mcp.call('create_proposal', { pot, swap }) // propose a trade
await mcp.call('vote_on_proposal', { proposal, approve: true })
await mcp.call('get_yield_rates')       // Kamino/Drift/JLP live APY
await mcp.call('join_vault', { vault, referrer }) // enter a Strategy Vault
```

Built on [solana-agent-kit](https://github.com/sendaifun/solana-agent-kit) — extends 60+ native Solana actions with PotBot-specific vault management.

Integrates **x402 micropayments** — agents pay per API call (0.001 USDC/request), enabling fully autonomous fee-based agent economies.

---

## DeFi Integrations

| Protocol | What we use it for |
|----------|--------------------||
| **Jupiter v6** | All swaps (best route, min slippage), Limit Orders (Eagle+), DCA (Dragon+) |
| **Kamino** | Yield strategies (lending APY up to 15%), RWA-backed vaults |
| **Drift** | Perps exposure + lending rates |
| **MarginFi** | Lending/borrowing yield |
| **Metaplex Core** | NFT Strategy Shares for Titan-level vaults |
| **MagicBlock** | Private USDC referral payouts (confidential transfers via MCP) |
| **Privy** | Embedded wallet — join vaults by email, no Phantom needed |
| **MoonPay** | Fiat on-ramp on vault join page |
| **Pyth / Switchboard** | Price oracle fallback |

---

## Backend & Analytics

The `apps/api` service provides real-time analytics powering all PnL/ROI/APY calculations:

```
Price Oracle   → Jupiter Price API v2 (5-second polling, Redis cache)
PnL Engine     → entry_price × current_price × shares → unrealized/realized PnL
APY Engine     → annualized from 30d performance: (1 + pnl_30d)^(365/30) - 1
Yield Aggreg.  → Kamino + Drift + JLP APY pulled every 15 minutes
Agent Cron     → evaluates all AI rules every 60s, creates on-chain proposals
Crank Service  → management fees, AUM snapshots, Tamagotchi evolution
```

**Per-vault metrics exposed via API:**
- NAV (Net Asset Value = vault_balance / total_shares)
- PnL 24h / 7d / 30d / all-time
- APY estimated (annualized)
- Sharpe ratio, max drawdown
- Win rate (% profitable trades)
- Total volume USD

---

## Monorepo Structure

```
potbot-v2/
├── apps/
│   ├── web/              # Next.js 14 DApp — main product
│   │   └── src/app/
│   │       ├── /              # Homepage
│   │       ├── /vaults        # Strategy Vault discovery
│   │       ├── /vaults/create # Create vault wizard (5 steps)
│   │       ├── /pots/[pubkey] # Pot detail (7+ tabs incl. AI Agent)
│   │       ├── /leaderboard   # Public vault rankings
│   │       ├── /my-pots       # Your vaults
│   │       └── /for-agents    # MCP documentation for developers
│   ├── api/              # Hono.js backend API
│   │   └── src/
│   │       ├── routes/   # price, pots, vaults, analytics, agent
│   │       ├── services/ # price.ts, pnl.ts, agent.ts, yield.ts
│   │       └── jobs/     # agent-cron.ts, price-poller.ts, crank.ts
│   ├── potbot-mcp/       # MCP Server (solana-agent-kit based)
│   ├── bot/              # Telegram bot (grammy)
│   └── landing/          # Marketing landing page
├── packages/
│   ├── program/          # Anchor programs (Rust)
│   │   └── programs/
│   │       ├── pot_vault/     # Core: vault, governance, strategy, referral
│   │       └── pot_duel/      # 1v1 duel vaults (Dragon+ unlock)
│   ├── sdk/              # TypeScript SDK
│   └── ui/               # Shared React components
└── docs/
    ├── ARCHITECTURE.md
    ├── GOVERNANCE.md
    ├── PROGRAM.md
    ├── MOCK_MODE.md
    └── MCP.md            # MCP server guide for AI agent developers
```

---

## On-chain Program — Instructions

### Core Vault
| Instruction | Description |
|-------------|-------------|
| `create_pot` | Create a group vault with governance settings |
| `deposit` | Deposit SOL → receive proportional shares |
| `withdraw` | Burn shares → receive proportional SOL |
| `create_proposal` | Create governance proposal (swap/withdraw/settings) |
| `vote` | Vote yes/no weighted by shares |
| `execute_proposal` | Execute passed proposal |
| `execute_swap` | Execute Jupiter swap from vault |
| `update_tamagotchi` | Permissionless crank to evolve mascot |
| `init_token_mint` | Initialize SPL mint for strategy shares |

### Strategy Vault
| Instruction | Description |
|-------------|-------------|
| `create_strategy_vault` | Create tokenized strategy vault with fee config |
| `join_strategy_vault` | Join vault, pay entry fee, register referral |
| `exit_strategy_vault` | Exit vault, pay performance fee on profit |
| `evolve_tamagotchi` | Permissionless: evolve if thresholds met |

---

## Current Status (April 2026)

| Component | Status | Notes |
|-----------|--------|-------|
| Anchor `pot_vault` core | ✅ Complete | All instructions written |
| Strategy Vault on-chain | ✅ Complete | create/join/exit/evolve + referral |
| TypeScript SDK | ✅ Complete | PDAs, IDL, client helpers, StrategyVault methods |
| Next.js DApp | ✅ Complete | Full UI — demo mode + on-chain |
| `/vaults` discovery page | ✅ Complete | Live analytics, USD TVL, sort/filter |
| `/vaults/create` wizard | ✅ Complete | 5-step wizard |
| AI Agent UI + API sync | ✅ Complete | Rules engine, server sync, 24/7 cron |
| Governance + proposals | ✅ Complete | Shares-weighted voting |
| Leaderboard | ✅ Complete | USD TVL, PnL%, APY30d, batch analytics |
| Live price ticker | ✅ Complete | SOL/USD in navbar, API health dot |
| **Backend API** (`apps/api`) | ✅ Complete | Price oracle, PnL engine, analytics, agent cron |
| **MCP Server** (`apps/potbot-mcp`) | ✅ Complete | solana-agent-kit based, 15+ tools |
| **Devnet deploy** | ✅ Complete | Program live on devnet |
| Production analytics data layer | ✅ Complete | useVaultAnalyticsBatch, VaultAnalyticsStrip |
| Pitch deck | ✅ Complete | 11 slides — Solana Frontier 2026 |
| **Jupiter swap CPI** | 🔴 Blocker | Real swap (not mock) needs executor wallet |
| E2E test on devnet | 🟡 Next | After executor wallet funded |
| Kamino/Drift yield aggregation | 🟢 Planned | Post-hackathon |
| Demo video | 🟢 Planned | May 6–8 |
| Hackathon submission | 📅 May 11 | colosseum.com/frontier |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Blockchain | Solana · Anchor 0.30.1 · SPL Token |
| Smart Contracts | Rust · Anchor · CPI (Jupiter, SPL) |
| Price Oracle | Jupiter Price API v2 · Pyth Network |
| DEX / Swaps | Jupiter v6 (Swap + Limit Orders + DCA) |
| DeFi Yield | Kamino · Drift · MarginFi |
| NFT | Metaplex Core (Strategy Shares) |
| Frontend | Next.js 14 · TypeScript · Tailwind CSS |
| State | Zustand · TanStack Query v5 |
| Wallets | Phantom · Privy (embedded) · WalletConnect |
| Backend | Hono.js · Node.js · PostgreSQL · Redis |
| MCP | solana-agent-kit · @modelcontextprotocol/sdk |
| Payments | x402 (AI micropayments) · MagicBlock (private) |
| Fiat On-ramp | MoonPay |
| Monorepo | Turborepo · npm workspaces |
| Deploy | Vercel (web + api) · GitHub Actions |

---

## Documentation

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, key decisions |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, commands, troubleshooting |
| [PROGRAM.md](docs/PROGRAM.md) | Solana program: accounts, instructions, PDAs |
| [GOVERNANCE.md](docs/GOVERNANCE.md) | Governance levels, voting mechanics |
| [MOCK_MODE.md](docs/MOCK_MODE.md) | Demo mode architecture |
| [MCP.md](docs/MCP.md) | MCP server guide for AI agent developers |

---

## Hackathon

**Solana Frontier 2026** · Colosseum · April 6 – May 11, 2026

> *"PotBot Strategy Vaults: tokenized DeFi strategies for everyone.*
> *Any trader, influencer, or AI agent creates their Strategy Vault on Solana.*
> *Investors buy shares — and participate in the strategy without trading themselves.*
> *Tamagotchi mechanics gamify growth: the bigger the AUM and members, the cheaper to trade.*
> *Everything on-chain, everything transparent, everything on Solana."*

---

## License

MIT © 2026 Y-DAO Amsterdam — Built with ❤️ for Solana Frontier
