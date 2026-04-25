# 🪴 PotBot v2

**Group Treasury. AI execution. Money tree that grows.**

**POT** = on-chain group treasury · **BOT** = AI execution through MCP · **🪴** = your wealth expanding.

PotBot is a Solana protocol for groups who prefer on-chain votes over chat-based arguments. It combines group governance, AI automation, creator monetization, and DeFi yield into a single primitive — the *pot*.

Built for [Solana Frontier 2026](https://colosseum.com/frontier) · [@PotBot_sol](https://twitter.com/PotBot_sol) · [@CryptoYDao](https://twitter.com/CryptoYDao) · Y-DAO Amsterdam

[![Build](https://img.shields.io/badge/build-passing-00ff88?style=flat-square)](https://github.com/YD811/potbot-v2)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square)](https://anchor-lang.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)](https://nextjs.org)
[![MCP](https://img.shields.io/badge/MCP-native-14F195?style=flat-square)](https://github.com/YD811/potbot-v2/tree/main/apps/potbot-mcp)

---

## Links 🏠

| | |
|---|---|
| 🌐 **DApp** | [potbot.fun](https://potbot.fun) |
| 🔌 **MCP Server** | `apps/potbot-mcp` |
| 📖 **Full Docs** | [docs/OVERVIEW.md](docs/OVERVIEW.md) |
| 🤖 **Telegram** | separate v1 product |
| 🌿 **SNS** | potbot.sol |

---

## 🧑‍⚖️ For Judges — Try It in 60 Seconds

**No wallet needed** — the DApp runs in demo mode with seeded vaults, proposals, and AI agent activity.

```bash
# 1. Open the live DApp (demo mode, no wallet)
open https://potbot.fun

# 2. Connect to MCP server (Claude / any AI agent)
npx @potbot/mcp

# 3. Clone and run locally
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install
cd apps/web && npx next dev
# → http://localhost:3000
```

**On-chain (devnet):**
- Program ID: `2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL`
- - Connect Phantom → switch to devnet → interact live
 
  - **Test MCP with Claude:**
  - ```
    list_vaults → get_vault_analytics → create_swap_proposal → vote_on_proposal
    ```

    ---

    ## Quick Start

    ```bash
    git clone https://github.com/YD811/potbot-v2.git
    cd potbot-v2
    npm install
    cd apps/web && npx next dev   # → http://localhost:3000
    ```

    For full setup (Anchor, devnet deploy, API server): see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

    ---

    ## What is PotBot?

    PotBot is infrastructure for group capital management on Solana — one primitive that works the same for a 3-friend investment club and a $100M family office.

    Governance, AI execution, best-of-breed DEX routing and DeFi yield, all inside a single programmable vault. Think on-chain copy-trading meets tokenized ETF meets Money Tree — configurable from autocratic solo vault up to timelocked institutional-grade treasury.

    ### For different users

    | User | What PotBot does for them |
    |------|--------------------------|
    | 👥 Group of friends | Trade together with shared governance — no one person holds the keys |
    | 👨‍💻 Trader | Create a Strategy Vault, monetize knowledge via entry/performance fees, no custody needed |
    | 📣 Influencer | Open a public vault, subscribers invest in your strategy, earn performance fees |
    | 🤖 AI Agent developer | Build autonomous trading agents via MCP server — 60+ on-chain actions |
    | 🏦 Investor | Browse Strategy Vaults, filter by PnL/APY/risk, join with one click |

    ---

    ## What is a POT?

    A POT is a shared on-chain vault on Solana, governed by its members. Every SOL and SPL token lives in a program-owned PDA from day one — no custodian, no bot-held keys, no multisig operator. Only the PotBot program can move the funds, and only after a successful on-chain vote.

    - **Collective ownership** — deposit SOL/USDC, receive proportional shares (NAV-based, like an ETF)
    - - **On-chain governance** — every trade, withdrawal or strategy change requires a vote (L0–L4 configurable)
      - - **Personal AI Voters** — each member can delegate voting to their own AI agent, revocable and auditable on-chain
        - - **AI Agent (BOT)** — set rules like "if SOL < $120, propose buying 10% more" — agent creates proposals, humans (or their personal voters) vote
          - - **DeFi yield** — idle capital deployed via Kamino / Drift / MarginFi / JLP strategies
            - - **Money Tree mascot** — evolves 🌱→🌿→🌳→🌺→🌸→🌴 through 6 stages based on AUM, members and trading volume
              - - **SNS subdomain** — each POT gets `<name>.potbot.sol`
                - - **Optional privacy (STAMPPOT)** — ZK proofs via PrivacyCash
                 
                  - ---

                  ## Strategy Vaults — Creator Economy

                  Any trader, influencer, or AI agent can launch a Strategy Vault — a tokenized DeFi strategy open to external investors.

                  1. Creator launches vault → sets entry/performance/management fees
                  2. 2. Investors buy in → receive Strategy Shares (SPL tokens, NAV-priced)
                     3. 3. AI Agent runs the strategy → proposes swaps based on rules
                        4. 4. Group votes → executes only if quorum reached
                           5. 5. Money Tree evolves → unlock perks (lower fees, Jupiter Limit Orders, NFT shares)
                             
                              6. ### Fee model
                             
                              7. | Fee | Who gets it | Range |
                              8. |-----|------------|-------|
                              9. | Entry fee | 70% creator · 20% PotBot · 10% referrer | 0 – any |
                              10. | Performance fee | Creator + PotBot (only on profit at exit) | 0–20% |
                              11. | Management fee | Creator (annual on AUM) | 0–2% |
                              12. | Protocol swap fee | PotBot | 0.30% (Money Tree-discounted) |
                             
                              13. **Referral system (on-chain, automatic)**
                              14. - Level 1 referrer: 20% of entry fee at transaction time
                                  - - Level 2 referrer: 5% of entry fee
                                    - - No claiming needed — paid in the same transaction
                                     
                                      - ---

                                      ## AI Agent — Autonomous Proposals

                                      Every POT can have an AI Agent that monitors prices and creates governance proposals automatically.

                                      You set the rules:
                                      - `"If SOL drops below $120 → propose buying 10% more"`
                                      - - `"Every Monday 9am → DCA 5% into $JUP"`
                                        - - `"If portfolio PnL > +20% → propose taking 30% profit"`
                                         
                                          - **AI suggests. Humans decide. Nothing executes without votes.**
                                         
                                          - Supported triggers: `price_above`, `price_below`, `time_interval` (cron), `balance_above`, `balance_below`, `pnl_above`, `pnl_below`
                                         
                                          - Supported actions: `propose_swap`, `propose_dca`, `propose_yield_deposit`, `vote_yes`, `alert`
                                         
                                          - ---

                                          ## MCP Server — AI-Native Infrastructure

                                          PotBot is MCP-native. Any AI agent (Claude, GPT, custom LLM) can interact with every vault via the PotBot MCP server.

                                          ```typescript
                                          // Any AI agent can:
                                          await mcp.call('list_pots')                          // browse all public vaults
                                          await mcp.call('get_pot_analytics', { pubkey })      // PnL, NAV, APY, Sharpe
                                          await mcp.call('create_proposal', { pot, swap })     // propose a trade
                                          await mcp.call('vote_on_proposal', { proposal, approve: true })
                                          await mcp.call('get_yield_rates')                    // Kamino/Drift/JLP live APY
                                          await mcp.call('join_vault', { vault, referrer })    // enter a Strategy Vault
                                          ```

                                          Built on [solana-agent-kit](https://github.com/sendaifun/solana-agent-kit) — extends 60+ native Solana actions with PotBot-specific vault management.

                                          Integrates **x402 micropayments** — agents pay per API call (0.001 USDC/request), enabling fully autonomous fee-based agent economies.

                                          ---

                                          ## DeFi Integrations

                                          | Protocol | What we use it for |
                                          |----------|-------------------|
                                          | Jupiter v6 | All swaps (best route, min slippage), Limit Orders (Bud+), DCA (Bloom+) |
                                          | Kamino | Yield strategies (lending APY up to 15%), RWA-backed vaults |
                                          | Drift | Perps exposure + lending rates |
                                          | MarginFi | Lending/borrowing yield |
                                          | Metaplex Core | NFT Strategy Shares for Full Bloom+ vaults |
                                          | MagicBlock | Private USDC referral payouts (confidential transfers via MCP) |
                                          | Privy | Embedded wallet — join vaults by email, no Phantom needed |
                                          | MoonPay | Fiat on-ramp on vault join page |
                                          | Pyth / Switchboard | Price oracle fallback |

                                          ---

                                          ## Backend & Analytics

                                          The `apps/api` service provides real-time analytics powering all PnL/ROI/APY calculations:

                                          - **Price Oracle** → Jupiter Price API v2 (5-second polling, Redis cache)
                                          - - **PnL Engine** → entry_price × current_price × shares → unrealized/realized PnL
                                            - - **APY Engine** → annualized from 30d performance: `(1 + pnl_30d)^(365/30) - 1`
                                              - - **Yield Aggreg.** → Kamino + Drift + JLP APY pulled every 15 minutes
                                                - - **Agent Cron** → evaluates all AI rules every 60s, creates on-chain proposals
                                                  - - **Crank Service** → management fees, AUM snapshots, Money Tree evolution, NFT burns on death
                                                   
                                                    - Per-vault metrics: NAV, PnL 24h/7d/30d/all-time, APY estimated, Sharpe ratio, max drawdown, win rate, total volume USD.
                                                   
                                                    - ---

                                                    ## Monorepo Structure

                                                    ```
                                                    potbot-v2/
                                                    ├── apps/
                                                    │   ├── web/          # Next.js 14 DApp — main product
                                                    │   ├── api/          # Hono.js backend API
                                                    │   ├── potbot-mcp/   # MCP Server (solana-agent-kit based)
                                                    │   ├── bot/          # Telegram bot (grammy)
                                                    │   ├── keeper/       # Executor / crank service
                                                    │   └── landing/      # Marketing landing page
                                                    ├── packages/
                                                    │   ├── program/      # Anchor programs (Rust)
                                                    │   │   └── programs/
                                                    │   │       ├── pot_vault/   # Core: vault, governance, strategy, referral
                                                    │   │       └── pot_duel/    # 1v1 duel vaults (Bloom+ unlock)
                                                    │   ├── sdk/          # TypeScript SDK
                                                    │   └── ui/           # Shared React components
                                                    └── docs/
                                                        ├── OVERVIEW.md
                                                        ├── ARCHITECTURE.md
                                                        ├── DEVELOPMENT.md
                                                        ├── PROGRAM.md
                                                        ├── GOVERNANCE.md
                                                        ├── MOCK_MODE.md
                                                        └── MCP.md
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
                                                    | `update_tamagotchi` | Permissionless crank to evolve Money Tree |
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
                                                    | TypeScript SDK | ✅ Complete | PDAs, IDL, client helpers |
                                                    | Next.js DApp | ✅ Complete | Full UI — demo mode + on-chain |
                                                    | `/vaults` discovery page | ✅ Complete | Live analytics, USD TVL, sort/filter |
                                                    | `/vaults/create` wizard | ✅ Complete | 5-step wizard |
                                                    | AI Agent UI + API sync | ✅ Complete | Rules engine, server sync, 24/7 cron |
                                                    | Governance + proposals | ✅ Complete | Shares-weighted voting |
                                                    | Leaderboard | ✅ Complete | USD TVL, PnL%, APY30d |
                                                    | Backend API (`apps/api`) | ✅ Complete | Price oracle, PnL, analytics, agent cron |
                                                    | MCP Server (`apps/potbot-mcp`) | ✅ Complete | 15+ tools, solana-agent-kit based |
                                                    | Devnet deploy | ✅ Complete | Program live on devnet |
                                                    | x402 micropayments | ✅ Complete | USDC gate on `/analytics/*` |
                                                    | Pitch deck | ✅ Complete | 11 slides — Solana Frontier 2026 |
                                                    | Jupiter swap CPI | 🔴 Blocker | Executor wallet needs funding + deploy |
                                                    | E2E test on devnet | 🟡 Next | Script ready — needs live program |
                                                    | Kamino/Drift yield (live) | 🟢 Planned | Post-hackathon |
                                                    | pot_duel program | 🟢 Planned | 1v1 duels post-MVP |
                                                    | Demo video | 🟢 Planned | May 6–8 |
                                                    | **Hackathon submission** | 📅 May 11 | [colosseum.com/frontier](https://colosseum.com/frontier) |

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
                                                    | [OVERVIEW.md](docs/OVERVIEW.md) | Full project documentation — start here |
                                                    | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, key decisions |
                                                    | [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, commands, troubleshooting |
                                                    | [PROGRAM.md](docs/PROGRAM.md) | Solana program: accounts, instructions, PDAs |
                                                    | [GOVERNANCE.md](docs/GOVERNANCE.md) | Governance levels, voting mechanics |
                                                    | [MOCK_MODE.md](docs/MOCK_MODE.md) | Demo mode architecture |
                                                    | [MCP.md](docs/MCP.md) | MCP server guide for AI agent developers |
                                                    | [DEPLOY.md](docs/DEPLOY.md) | Devnet → mainnet deployment procedure |

                                                    ---

                                                    ## Hackathon

                                                    **Solana Frontier 2026 · Colosseum · April 6 – May 11, 2026**

                                                    > "PotBot Strategy Vaults: tokenized DeFi strategies for everyone. Any trader, influencer, or AI agent creates their Strategy Vault on Solana. Investors buy shares — and participate in the strategy without trading themselves. Tamagotchi mechanics gamify growth: the bigger the AUM and members, the cheaper to trade. Everything on-chain, everything transparent, everything on Solana."
                                                    >
                                                    > ---
                                                    >
                                                    > ## License
                                                    >
                                                    > MIT © 2026 Y-DAO Amsterdam — Built with ❤️ for Solana Frontier
                                                    >
                                                    > 📖 **Full Documentation** → [docs/OVERVIEW.md](docs/OVERVIEW.md)
