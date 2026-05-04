# PotBot v2 — Solana Frontier 2026 Submission

**Project:** PotBot v2
**Tagline:** Group trading vaults on Solana — pool funds, vote on swaps, share upside.
**Category:** DeFi · Consumer · Group Coordination
**Team:** Yehor Dolinskiy (YD) — solo founder. BD @ Binance ecosystem & Trust Wallet, co-founder Y-DAO Amsterdam, Superteam Netherlands.
**Live:** https://potbot.fun · **Repo:** https://github.com/YD811/potbot-v2
**Devnet program:** [`GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`](https://explorer.solana.com/address/GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK?cluster=devnet)

> **Lifecycle legend.** Every feature in this submission is tagged.
> 🟢 Live (mainnet) · 🟡 Devnet (mainnet target this sprint) · 🔵 Phase 2 (Q3 2026) · 🟣 Phase 3 (Q4 2026) · ⚪ Vision (2027+)
> Full roadmap with every feature: [potbot.fun/roadmap](https://potbot.fun/roadmap)

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

### 1. Functionality 🟢
Working today, on-chain, end-to-end:

- 🟢 30+ Anchor instructions deployed. Full path verifiable on Explorer: `create_pot → set_allowed_mints → deposit → create_proposal → vote → execute_swap (Jupiter v6 CPI) → withdraw`.
- 🟢 Three authorization modes (`AdminDirect`, `Proposal`, `StrategyTrigger`) in one `execute_swap` instruction with strict mode-source matching.
- 🟢 Solana Blinks vote + deposit endpoints live: `https://potbot.fun/api/actions/<potPubkey>/deposit`.
- 🟢 Health endpoint: `https://potbot.fun/api/health` returns `{status:"ok", network:"devnet|mainnet"}`.
- 🟡 Strategy slot accounts (`create_strategy` / `close_strategy`) — devnet, mainnet target this sprint.
- 🔵 In-program Pyth oracle guard — re-reads price feeds inside `execute_swap` to reject keepers firing on the wrong condition. Path reserved (StrategyTrigger mode), Pyth SDK ships in Phase 2.

### 2. Potential Impact
Group treasuries are a $4–8B underserved DeFi segment. Squads MS at $14B AUM is the closest comparable, but it's pure custody — no trading workflow. Drift Vaults / Kamino / Gauntlet are institutional curators, not friend-groups. PotBot ships a coordination primitive any DAO, friend group, or trading club can deploy in 30 seconds.

Revenue is honest: 🟢 0.30 % swap fee on every trade routed through a pot, 🟡 10 % performance fee on Strategy Vaults split with the strategy creator. No token, no airdrop farming.

### 3. Novelty
- 🔵 **On-chain trigger verification** — the program re-reads Pyth inside the instruction (Phase 2). Most "automated DeFi" trusts off-chain keepers blindly.
- 🟢 **Three-mode `execute_swap` in one instruction** — Squads multisig can route, but it's a generic queue; PotBot bakes governance and keeper triggers into the same trade primitive.
- 🟢 **MCP-native** — `@potbot/mcp@0.2.0` lets any LLM drive a pot. 18 tools (free + paid via x402).
- 🟡 **Two-tier AI** — base PotBot AI surfaces candidate proposals, user AI delegate votes/auto-creates on member's behalf. Decision-support before autopilot.
- 🟡 **Tamagotchi as engagement** — pot's plant grows from member activity (deposits, votes, proposals, new members), tracking community health, not P&L. Different incentive surface from any vault product on Solana. NFT mint at Bloom (L4) ships in 🟣 Phase 3.

### 4. Design / UX
- 🟢 Next.js 14 + Tailwind, light/dark themes (WCAG-AA contrast in light), full mobile-first pass.
- 🟢 Full-vision roadmap visible at `/roadmap` — every feature with explicit lifecycle status.
- 🟢 PWA manifest mainnet-ready: "Add to Home Screen" on iOS/Android. ⚪ Saga / Seeker dApp Store entry next.
- 🟢 Onboarding tutorial gated by localStorage. Disclaimers + risk modal on first deposit (regulatory-clean for the consumer narrative).
- 🟢 Solana Blinks "Share as Blink" button on every pot — proposal becomes a tweet anyone can act on without leaving X.
- 🟡 Strategy proposal builder: token search by ticker (SOL/USDC/JUP/BONK/JLP) or paste contract address. Action selector (Buy/Sell/Swap/Trigger), amount slider, live preview, "Submit as Proposal".

### 5. Composability
PotBot is a thin wrapper over Solana's strongest primitives. Each integration tagged with status:

| Integration | What it does | Status |
|---|---|---|
| **Jupiter v6 / Ultra** | swap execution (CPI from `execute_swap`) | 🟢 Live (mainnet) |
| **Helius** | RPC, webhooks for pot events, priority-fee API | 🟢 Live |
| **Squads v4** | optional multisig path for the creator role on high-value pots | 🟢 Live (UI + lib; flagship pot uses it) |
| **MCP (Claude / OpenAI agents)** | `@potbot/mcp` exposes 18 pot actions to any LLM | 🟢 Live (npm 0.2.0) |
| **Solana Actions / Blinks** | shareable vote + deposit endpoints | 🟢 Live |
| **Dune SIM** | SVM portfolio + activity for vault display, leaderboard TVL, keeper pre-flight | 🟡 Devnet (needs `DUNE_API_KEY`) |
| **Pyth Network** | oracle price guard, in-program trigger verification | 🔵 Phase 2 |
| **Privy** | email / social login + embedded Solana wallets for non-crypto users | 🔵 Phase 2 (PR #32 ready, awaiting App ID) |
| **Light Protocol** | ZK-compressed audit log: SwapEvent + NavSnapshot accounts | 🔵 Phase 2 |
| **Meteora DLMM, Kamino** | yield parking strategies for idle pot capital | 🔵 Phase 2 (CPI scaffolded) |
| **Metaplex Token Metadata** | Tamagotchi NFT metadata for season rewards | 🟣 Phase 3 |

---

## What is live on mainnet today

- 🟢 `pot_vault` Anchor program — 30+ instructions deployed, IDL synced
- 🟢 Frontend at `potbot.fun`: `/`, `/dashboard`, `/leaderboard`, `/faq`, `/vaults`, `/pots/[pubkey]`, `/pots/[pubkey]/pet`, `/create`, `/signup`, `/roadmap`
- 🟢 Keeper — Anchor-SDK-backed worker, IDL loaded from disk, DLQ retries (2s/5s/13s/34s/89s)
- 🟢 TypeScript SDK at `packages/sdk/`
- 🟢 MCP server at `apps/potbot-mcp/` — npm 0.2.0
- 🟢 Solana Blinks endpoints + ShareBlinkButton on every pot
- 🟢 Squads v4 multisig (UI banner + lib for creator role)
- 🟢 PWA manifest installable from mobile

## What's already on devnet, mainnet target this sprint

- 🟡 Strategy slot accounts (`create_strategy`, `close_strategy`)
- 🟡 Tamagotchi state machine (5 levels, HP from member activity)
- 🟡 Personal AI Voters (`MemberDelegate`, `vote_as_delegate`)
- 🟡 PotBot AI suggestion feed (decision-support layer)
- 🟡 Dune SIM portfolio + activity feed

## Phase 2 (Q3 2026) — designed, scaffolded

- 🔵 Pyth in-program oracle guard
- 🔵 Meteora DLMM + DAMM yield CPI
- 🔵 Kamino lending CPI
- 🔵 Privy embedded wallets full flow
- 🔵 Light Protocol ZK-compressed audit log
- 🔵 `init_share_mint` graduation (off-chain → on-chain SPL)
- 🔵 Advanced strategies (SL / TP / trailing / DCA)

## Phase 3 (Q4 2026) — architecture set

- 🟣 Tamagotchi NFT mint (Bloom unlock)
- 🟣 Pot duels (Bud unlock)
- 🟣 Premium tier (SNS subdomain, share tokenization)
- 🟣 STAMPPOT — Auditable-Private mode (PrivacyCash + Merkle membership)

## Vision · 2027+

- ⚪ STAMPPOT — Sealed-Private mode (commit-reveal voting, encrypted strategy params)
- ⚪ Saga / Seeker dApp Store entry
- ⚪ $POT governance token (protocol fee buyback + season distribution)
- ⚪ Cross-pot composability + DAO meta-governance
- ⚪ Adevar Labs audit before mainnet GA push

---

## Tech Stack

| Layer | Tech | Status |
|---|---|---|
| Smart contracts | Anchor 0.30 (Rust), Solana SDK 2.x | 🟢 |
| Swaps | Jupiter Aggregator v6 + Ultra | 🟢 |
| Frontend | Next.js 14, TypeScript, TanStack Query, Zustand, Tailwind | 🟢 |
| Wallet | `@solana/wallet-adapter` (+ Privy in 🔵 Phase 2) | 🟢 |
| Price feeds | Pyth Network | 🔵 in-program · 🟢 off-chain |
| Keeper | Node.js (devnet), Cloudflare Workers (prod) | 🟢 devnet · 🟡 prod |
| Hosting | Vercel (web) + Cloudflare Pages + KV (landing/edge) | 🟢 |
| Off-chain | Supabase (NAV snapshots, swap metadata, agent rules) | 🟢 |
| Indexer | Helius webhooks → Supabase realtime | 🟢 |
| Notifications | Resend (waitlist + admin emails) | 🟢 |

---

## Judges' quickstart

| What to verify | How |
|---|---|
| 🌐 Live DApp | https://potbot.fun (no wallet needed — flagship pot view loads read-only) |
| 🗺️ Full roadmap with status | https://potbot.fun/roadmap |
| 🔗 On-chain program | `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK` (mainnet ID added pre-submit if cut) |
| 📊 Health check | `curl https://potbot.fun/api/health` |
| 🏆 Leaderboard | https://potbot.fun/leaderboard |
| ⚡ Solana Blink | post a proposal; its `/api/actions/.../vote` URL renders as a Blink in any compatible client |
| 🤖 AI Agent (two-tier) | open any pot → AI tab; or `npx @potbot/mcp` and connect via Claude |
| 🌿 Tamagotchi | open `/pots/<pubkey>/pet` after a few member actions |
| 📜 Architecture | [`docs/architecture/overview.md`](../architecture/overview.md), [`docs/architecture/program.md`](../architecture/program.md), [`docs/architecture/governance.md`](../architecture/governance.md) |

---

## Release tag

[v0.9.0-hackathon](https://github.com/YD811/potbot-v2/releases/tag/v0.9.0-hackathon) — pre-submission cut. Submission state will be re-tagged as `v1.0.0-frontier-submission` immediately before May 11.

---

## Links

| | |
|---|---|
| Live | https://potbot.fun |
| Roadmap | https://potbot.fun/roadmap |
| Repo | https://github.com/YD811/potbot-v2 |
| X | https://x.com/PotBot_sol |
| YD | https://x.com/CryptoYDao |
| Demo video | (added before submission) |
| Pitch deck | (added before submission) |
