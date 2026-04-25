# PotBot v2 — Solana Frontier 2026 Submission

**Project:** PotBot v2  
**Category:** DeFi / Group Coordination  
**Team:** Yehor Dolinskiy (YD) — BD @ Binance ecosystem & Trust Wallet, co-founder Y-DAO Amsterdam, Superteam Netherlands  
**Repo:** https://github.com/YD811/potbot-v2  
**Live:** https://potbot.fun  

---

## Problem

On-chain trading is built for individuals. When a group of friends, a DAO, or an investment club wants to trade together, they hit an immediate wall: whose wallet holds the funds? Who can execute? How do you prevent one person from draining the pot?

Current workarounds — shared seed phrases, multisig treasuries, off-chain spreadsheets — are either insecure, slow, or opaque. There is no native primitive for "trade together, govern together."

---

## Solution

PotBot v2 is a group trading vault on Solana. Any group can:

1. **Create a pot** — a shared on-chain vault with governance rules baked in.
2. **Set strategy** — define which tokens can be traded, spending limits, and who can authorize swaps (admin, proposal, or keeper agent).
3. **Execute swaps** — one-click Jupiter v6 swaps signed by the vault PDA, with slippage enforced on-chain.
4. **Govern together** — proposal + vote → auto-execute once quorum passes.
5. **Automate** — keeper cranks fire stop-loss / take-profit / trailing-stop exits using on-chain Pyth prices without requiring any member to be online.

---

## What's Live on Devnet

**Program ID:** `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`  
**Explorer:** https://explorer.solana.com/address/GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK?cluster=devnet

Working on devnet as of submission:
- `create_pot` — vault PDA initialization, fee config
- `set_allowed_mints` — per-pot token allowlist
- `create_strategy` — slot-based strategy accounts (AdminDirect / Proposal / Agent sources)
- `execute_swap` — Jupiter v6 CPI signed by vault PDA; slippage floor enforced on-chain
- `close_strategy` — PnL realized, strategy marked Closed
- `mark_proposal_passed` — governance trigger for Proposal-mode swaps
- `pot_admin` — pause / unpause / set spending policy

DApp frontend (Next.js 14) at https://potbot.fun runs in mock mode by default, auto-switches to on-chain when the program is live.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Smart contracts | Anchor 0.30 (Rust) |
| Swaps | Jupiter Aggregator v6 |
| Frontend | Next.js 14, TanStack Query, Zustand |
| Wallet | @solana/wallet-adapter |
| Price feeds | Pyth Network |
| Keeper / automation | Node.js worker (devnet), Cloudflare Workers (prod) |
| Hosting | Cloudflare Pages + KV |
| Product | https://potbot.fun |
| App (same host, auto-detects on-chain mode) | https://potbot.fun |
| GitHub | https://github.com/YD811/potbot-v2 |
| Program (Solscan devnet) | https://solscan.io/account/GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK?cluster=devnet |
| SDK (npm/TS) | `packages/sdk/` in the repo |
| MCP server | `apps/potbot-mcp/` in the repo |
| Twitter | https://x.com/PotBot_sol |
| Telegram v1 bot | https://t.me/Trade_pot_bot |

---

## Key Differentiators
- **Solana + Anchor 0.30** — `pot_vault` program, program ID `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`
- **Jupiter v6 / Ultra API** — swap execution
- **Pyth** — oracle price guard on every swap
- **Meteora DLMM, Kamino** — yield strategies for idle capital
- **Helius** — RPC + priority fees
- **Metaplex Core** — Tamagotchi NFT metadata
- **Squads v4** — mainnet multisig authority (phase-5)
- **Next.js 14 + TanStack Query** — dApp
- **Supabase** — off-chain NAV snapshots, swap metadata, AI agent rules
- **@potbot/sdk** — TypeScript SDK, 60+ on-chain actions
- **@potbot/mcp** — MCP server so any LLM can drive the vault

**1. Strategy layer with on-chain trigger verification**  
Stop-loss, take-profit, and trailing-stop are not just UI labels — the program re-reads the Pyth price feed inside the instruction and rejects any keeper that fires the wrong reason. Keepers cannot fake a trigger.

**2. Three-mode authorization in one instruction**  
`execute_swap` supports AdminDirect (instant), Proposal (governance), and StrategyTrigger (keeper) in a single instruction with strict mode-source matching. No separate contracts needed.

**3. STAMPPOT — ZK privacy layer**  
Optional PrivacyCash ZK proof integration for private deposit/withdraw. Public pot mechanics are unchanged; privacy is composable and opt-in.

**4. Keeper economics**  
Pots fund a `fee_reserve` to pay keeper gas. Strategy creation with price triggers requires minimum reserve. Keepers have a sustainable on-chain revenue path.

---

## Roadmap

Yield parking (Kamino/Meteora), share tokenization, tamagotchi NFTs. Mainnet cut targeting May 8–11.

---

*Solana Frontier 2026 — solo founder, 5 weeks, production-grade architecture.*

---

## Dune SIM Integration

**Track:** Dune SIM (SVM endpoints)

PotBot v2 uses Dune SIM across three layers:

**1. Vault portfolio display (`/beta/svm/balances/{vaultPda}`)**  
Every pot shows real-time token holdings of its vault PDA — symbol, balance, USD value, % of total. Single API call replaces N manual RPC `getTokenAccountsByOwner` calls. Data refreshes every 30 seconds.

**2. On-chain activity feed (`/beta/svm/transactions/{vaultPda}`)**  
The pot detail page shows a timestamped history of all vault transactions — swaps, deposits, withdrawals — decoded from raw Solana tx data. Swap events are identified by Jupiter v6 program presence in account keys.

**3. Keeper pre-flight check (server-side)**  
Before submitting `execute_swap`, the keeper calls `/svm/balances` to confirm the vault actually holds the required input token. Post-execution, it calls again to verify balance moved correctly. This prevents wasted gas on mis-fired trigger transactions.

**4. Leaderboard TVL (`/svm/balances` parallel fetch)**  
The public pot leaderboard aggregates real USD TVL across all active vaults using batched Dune SIM calls — no custom indexer required.

---

## Release

**v0.9.0-hackathon** — April 25, 2026

Tag: `v0.9.0-hackathon` · Target: `main` · [View release](https://github.com/YD811/potbot-v2/releases/tag/v0.9.0-hackathon)

This pre-release represents the full hackathon submission state. All core protocol instructions are written and deployed on devnet. The DApp runs in demo mode at potbot.fun.

---

## Judges Checklist

| What to test | How |
|---|---|
| 🌐 Live DApp | https://potbot.fun — no wallet needed |
| 🔌 MCP tools | `npx @potbot/mcp` then use Claude |
| 📖 Full docs | [docs/OVERVIEW.md](OVERVIEW.md) |
| 🔗 On-chain program | `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK` on devnet |
| 📊 Analytics API | `curl https://api.potbot.fun/health` |
| 🏆 Leaderboard | https://potbot.fun/leaderboard |
| 🤖 AI Agent tab | Open any vault → AI Agent tab |
| 🌿 Money Tree | Create vault → watch stage evolve |

Files added: `apps/web/src/lib/dune.ts`, `apps/web/src/hooks/useDunePortfolio.ts`, `apps/web/src/hooks/useDuneTrades.ts`, `apps/web/src/components/VaultPortfolio.tsx`, `apps/keeper/src/dune.ts`
