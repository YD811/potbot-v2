# PotBot v2 — Solana Frontier 2026 Submission

**Project:** PotBot v2
**Tagline:** Group trading vaults on Solana — pool funds, vote on swaps, share upside.
**Category:** DeFi · Consumer · Group Coordination
**Team:** Yehor Dolinskiy (YD) — solo founder. BD @ Binance ecosystem & Trust Wallet, co-founder Y-DAO Amsterdam, Superteam Netherlands.
**Live:** https://potbot.fun · **Repo:** https://github.com/YD811/potbot-v2
**Devnet program:** [`GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`](https://explorer.solana.com/address/GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK?cluster=devnet)

---

## Problem

On-chain trading is built for individuals. When a group of friends, a DAO, or an investment club wants to trade together, they hit an immediate wall: whose wallet holds the funds, who can execute, how do you prevent one person from draining the pot? Current workarounds — shared seed phrases, off-chain spreadsheets, generic multisigs without trading UX — are insecure, slow, or opaque. There is no native primitive for *trade together, govern together*.

## Solution

PotBot v2 is a group trading vault on Solana. Members:

1. **Create a pot** — a shared vault PDA with governance rules baked in.
2. **Set strategy** — token allowlist, spending limits, authorization mode (admin / proposal / agent keeper).
3. **Swap together** — one-click Jupiter v6 swaps signed by the vault PDA, slippage enforced on-chain.
4. **Govern together** — proposals + voting, auto-execute once quorum passes.
5. **Automate** — keeper cranks fire stop-loss / take-profit / trailing-stop using on-chain Pyth prices, no member needs to be online.

---

## Judging — how PotBot scores against the 5 criteria

### 1. Functionality (works end-to-end on-chain)
- 30+ Anchor instructions, all live on devnet program `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`. Full path: `create_pot → set_allowed_mints → deposit → create_proposal → vote → execute_swap (Jupiter v6 CPI) → withdraw`.
- Strategy layer with **on-chain trigger verification**: the program re-reads Pyth price feeds inside `execute_swap` and rejects keepers that fire on the wrong condition. Triggers cannot be faked.
- Three authorization modes (`AdminDirect`, `Proposal`, `StrategyTrigger`) in one instruction with strict mode-source matching. No second contract needed.
- Health endpoint: `https://potbot.fun/api/health` (200 OK with cluster + version).
- E2E smoke happy-path tested on devnet (deposit → propose → vote → swap → withdraw closed in <60s round-trip).

### 2. Potential Impact
Group treasuries are a $4–8B underserved DeFi segment (Squads MS at $14B AUM is the closest comparable, but it's pure custody — no trading workflow). PotBot ships a coordination primitive any DAO, friend group, or trading club can deploy in 30 seconds, with revenue from a 5–10 bps swap fee that funds keeper economics. Target mainnet GA: late May 2026.

### 3. Novelty
- **On-chain trigger verification** — most "automated DeFi" trusts off-chain keepers; we re-verify Pyth prices in-program.
- **Three-mode `execute_swap` in one instruction** — Squads multisig can route, but it's a generic queue; PotBot bakes governance and keeper triggers into the same trade primitive.
- **MCP-native** — `@potbot/mcp` lets any LLM drive a pot. Built-in path for the AI-agent narrative Solana is leaning into post-Breakpoint.
- **Tamagotchi-as-engagement** — pot's plant grows from member activity (deposits, votes, proposals), tracking community health, not P&L. Different incentive surface from any vault product on Solana.

### 4. Design / UX
- Next.js 14 + Tailwind, light/dark themes, full mobile-first pass on the pot detail page.
- One-click flagship pot view at `/` with read-only TVL chart for non-wallet visitors. Wallet connect optional.
- Onboarding tutorial gated by localStorage so returning users skip it.
- Disclaimers + risk modal on first deposit (regulatory-clean for the consumer narrative).
- Solana Blinks endpoints for vote + deposit, so a pot proposal becomes a tweet anyone can act on without leaving X.

### 5. Composability
PotBot is a thin wrapper over Solana's strongest primitives. Outbound CPI / API surface:

| Integration | What it does |
|---|---|
| **Jupiter v6 / Ultra** | swap execution (CPI from `execute_swap`) |
| **Pyth Network** | oracle price guard, in-program trigger verification |
| **Helius** | RPC, webhooks for pot events, priority-fee API |
| **Squads v4** | optional multisig path for the creator role on high-value pots |
| **Privy** | email / social login + embedded Solana wallets for non-crypto users |
| **Metaplex Core** | Tamagotchi NFT metadata for season rewards |
| **Meteora DLMM, Kamino** | yield parking strategies for idle pot capital |
| **Dune SIM** | SVM portfolio + activity endpoints for vault display, leaderboard TVL, keeper pre-flight |
| **Solana Actions / Blinks** | shareable vote + deposit endpoints |
| **MCP (Claude / OpenAI agents)** | `@potbot/mcp` exposes 60+ pot actions to any LLM |

---

## What is live as of submission

- ✅ **Devnet program** — fully deployed, IDL synced, all 30+ instructions callable
- ✅ **Frontend** — `/`, `/dashboard`, `/leaderboard`, `/faq`, `/pots/[pubkey]`, `/pots/[pubkey]/pet`, `/create`, `/signup`
- ✅ **Keeper** — Anchor-SDK-backed worker, IDL loaded from disk, `confirmTransaction` with blockhash/lastValidBlockHeight pair, DLQ retries (2s/5s/13s/34s/89s)
- ✅ **TypeScript SDK** at `packages/sdk/`
- ✅ **MCP server** at `apps/potbot-mcp/`
- ✅ **Solana Blinks** — `/api/actions/[potPubkey]/vote`, `/api/actions/[potPubkey]/deposit`
- ✅ **Privy auth** + wallet-adapter (email, Google, Phantom, Solflare, Backpack)
- ✅ **Squads v4 banner** — optional multisig route on Strategy + Governance tabs
- ✅ **PWA manifest** — installable from mobile, Saga-ready
- ⏳ **Mainnet** — cut target: May 8 (with explicit founder approval); flagship pot funded with real $50–100 for live judging
- 🔮 **STAMPPOT** (Token-2022 confidential transfers privacy layer) — post-MVP

---

## Tech Stack

| Layer | Tech |
|---|---|
| Smart contracts | Anchor 0.30 (Rust), Solana SDK 2.x |
| Swaps | Jupiter Aggregator v6 |
| Frontend | Next.js 14, TypeScript, TanStack Query, Zustand, Tailwind |
| Wallet | `@solana/wallet-adapter` + Privy embedded wallets |
| Price feeds | Pyth Network |
| Keeper | Node.js (devnet), Cloudflare Workers (prod) |
| Hosting | Vercel (web) + Cloudflare Pages + KV (landing/edge) |
| Off-chain | Supabase (NAV snapshots, swap metadata, agent rules) |
| Indexer | Helius webhooks → Supabase realtime |
| Notifications | Resend (waitlist + admin emails) |

---

## Judges' quickstart

| What to verify | How |
|---|---|
| 🌐 Live DApp | https://potbot.fun (no wallet needed — flagship pot view loads read-only) |
| 🔗 On-chain program | `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK` on devnet (mainnet ID added pre-submit if cut) |
| 📊 Health check | `curl https://potbot.fun/api/health` |
| 🏆 Leaderboard | https://potbot.fun/leaderboard |
| 🤖 AI Agent | open any pot → AI Agent tab; or `npx @potbot/mcp` and connect via Claude |
| ⚡ Solana Blink | post a proposal; its `/api/actions/.../vote` URL renders as a Blink in any compatible client |
| 🌿 Tamagotchi | open `/pots/<pubkey>/pet` after a few member actions |
| 📜 Architecture | [`docs/architecture/overview.md`](OVERVIEW.md), [`docs/architecture/program.md`](PROGRAM.md), [`docs/architecture/governance.md`](GOVERNANCE.md) |

---

## Roadmap

- **May 5–8** — mainnet cut, flagship pot funded
- **May 11** — submit
- **Post-hackathon Q2** — STAMPPOT confidential pots (Token-2022 confidential transfers), Saga / Seeker dApp Store entry, $POT mainnet token (governance + buyback)
- **Q3** — Adevar Labs audit, public mainnet launch, fee-revenue pot for keeper sustainability

---

## Release tag

[v0.9.0-hackathon](https://github.com/YD811/potbot-v2/releases/tag/v0.9.0-hackathon) — April 25, 2026 cut. Submission state will be re-tagged as `v1.0.0-frontier-submission` immediately before May 11.

---

## Links

| | |
|---|---|
| Live | https://potbot.fun |
| Repo | https://github.com/YD811/potbot-v2 |
| X | https://x.com/PotBot_sol |
| YD | https://x.com/CryptoYDao |
| Demo video | (added before submission) |
| Pitch deck | (added before submission) |
