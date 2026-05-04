# PotBot v2 — Project Memory

> This file lives at the repo root (`potbot-v2/CLAUDE.md`).
> Claude reads it automatically at the start of every session.

## Project
**PotBot v2** — **infrastructure for group capital management on Solana**. From a friends' club with $500 to an institutional family office — one protocol, different governance parameters.

- **GitHub**: YD811/potbot-v2
- **Landing**: [potbot.fun](https://potbot.fun)
- **Hackathon**: Solana Frontier 2026
- **Owner**: Yehor (YD811, eeegordolinskiy@gmail.com)

> Full documentation lives in [docs/README.md](docs/README.md). Read it before starting any new work in the repo.

## Stack
- Solana + Anchor 0.30 (Rust smart contracts — `packages/program/`)
- Next.js 14 App Router + TypeScript + Tailwind (`apps/web/`)
- Hono.js + Node.js + PostgreSQL + Redis (`apps/api/`)
- TanStack Query v5, Zustand (mock mode for UI without a wallet)
- Jupiter API v6 (swaps), Jupiter Price API v2 (prices)
- @solana/wallet-adapter · Privy (embedded wallets)
- MCP server built on solana-agent-kit (`apps/potbot-mcp/`)

## Key commands
```bash
npm run dev                                  # run web (apps/web/, port 3000)
anchor build                                 # compile contracts (packages/program/)
anchor deploy --provider.cluster devnet      # deploy to devnet
solana airdrop 2 --url devnet                # SOL on devnet
```

## Architecture

### Frontend (`apps/web/`)
- `src/lib/mock-store.ts` — Zustand store (demo mode without a wallet, 6 seed pots)
- `src/hooks/usePots.ts` — auto-switch mock ↔ on-chain based on whether the program is deployed
- `src/lib/ai-agent.ts` — rules engine for the AI agent (price/time/balance/PnL triggers)
- `src/hooks/useAIAgent.ts` — 60s cron, evaluates rules, creates proposals
- `src/app/pots/[pubkey]/page.tsx` — main pot page (7+ tabs: overview, shares, positions, strategy, governance, agent, members)
- `src/components/AIAgentPanel.tsx` — agent UI (strategy/rules/log)
- `src/components/GovernanceSettings.tsx` — quorum / approval / risk caps

### Backend (`apps/api/`)
- Hono.js REST — `/price`, `/pots`, `/vaults`, `/analytics`, `/agent`, `/voter`
- Cron: `agent-cron.ts` (60s), `price-poller.ts` (5s), `crank.ts` (fees, evolution, NFT burns)

### Contracts (`packages/program/`)
- `programs/pot_vault/` — main program (vault, governance, strategy, referral, Money Tree)
- `programs/pot_duel/` — 1v1 duel vaults (unlocks at Bloom+)
- `src/state/pot.rs` — `PotAccount` (incl. `health_hp`, `peak_balance`, `is_dead`, `season`)
- `src/state/proposal.rs` — `ProposalAccount` (with `risk_class` for defensive-only mode)
- `src/state/voter.rs` — `VoterDelegationAccount` (new, for Personal AI Voters)
- `src/instructions/` — all instructions

## Core concepts — single source of truth

### On-chain custody vs off-chain accounting
**The vault is always on-chain** (PDA on Solana, created in `create_pot`).
**Only share accounting** lives off-chain at the Seedling stage — a compromise to save SPL rent and keep flexibility for a future pot token launch. At Sprout+ shares migrate to an on-chain SPL mint via the `init_share_mint` instruction.

⚠️ Never describe this as "custodial" or "pending on-chain". Custody is ALWAYS on-chain.

### Money Tree (Season 1: Plants)
Six stages with AUM/members/trades thresholds: Seedling → Sprout → Bud → Bloom → Full Bloom → Mature Tree. Every pot has Health (0–100 HP), computed as `clamp(0, 100, 100 * current_balance / peak_balance)`. At 0 HP a pot "dies" — trading is locked, NFT Strategy Shares burn, and a `resurrect_pot` + fresh deposit is required (stage resets to Seedling).

### Personal AI Voters
Unique feature — every member can register an AI agent wallet as their voting delegate. Delegation is per-pot, revocable on-chain; every vote is signed on-chain with a reason string. Rules live in `rules_uri` (IPFS/Arweave/HTTPS); the on-chain program trusts them, misbehaving AIs are visible in logs and quickly revoked.

### Governance
L0 Autocracy · L1 Advisory (25% veto) · L2 Majority (>50%) · L3 Supermajority (>66%) · L4 Consensus (100%). Optional risk caps overlay: `max_swap_pct`, `max_budget_grant_pct`, `require_admin_cosign`, `timelock_seconds`. At low HP a pot automatically falls into defensive-only mode at the program level.

## Design system
- Dark background: `#0D1117`, Card: `#111827`, Border: `#1A2332`
- Solana Green: `#14F195`, Solana Purple: `#9945FF`, Muted: `#6B7280`
- CSS classes: `card`, `btn-primary`, `btn-secondary`, `input`, `glow-green`
- Money Tree emoji: 🌱 🌿 🌳 🌺 🌸 🌴 (stages 0–5)
- Health indicator: 🟢 🟡 🟠 🔴 ☠️

## Pushing to GitHub from a Cowork sandbox
- Direct `git push` from sandbox is not available (no GitHub credentials)
- **Correct path**: use the GitHub REST API with a fine-grained PAT (`Contents: Read and write` on `YD811/potbot-v2`)
- One commit through Git Data API: create blobs → create tree (with `base_tree`) → create commit → PATCH `git/refs/heads/main`
- The token is passed in chat once per session; sandbox does not persist it across sessions

## PotBot v1 vs v2
**These are two independent products.**
- v1 — Telegram-native group trading bot, repo `YD811/potbot_test` (private), custodial-style
- v2 — Solana DApp + MCP server, this repo, non-custodial on-chain vault
- A v1 pot ≠ a v2 pot. State is not shared. Data migration scheduled for Q4 2026.
- `apps/bot/` in v2 is the **future v2 Telegram frontend** using `@potbot/sdk` (v2 SDK), not v1.

## Protocol-integration skills (Sendai)
**Marketplace**: `sendaifun/skills` — AI-native best practices for 45+ Solana protocols.
Install via Claude Code: `/plugin marketplace add sendaifun/skills` then
`/plugin install <name>` per protocol.

Claude should consult these skills when working in relevant code paths — they contain current SDK/endpoint best practices that go stale in tutorials.

| Skill | Apply when editing |
|---|---|
| `jupiter` | `apps/web/src/lib/jupiter-*.ts`, `JupiterSwapPanel.tsx`, `execute_swap.rs` |
| `pyth` | `apps/web/src/lib/pyth.ts`, oracle keeper, proposal_swap price-feed guard |
| `meteora` | DLMM/DAMM yield strategies (`yield_strategy`, unwind path) |
| `kamino` | Lending-based yield strategies, CPI into Kamino reserves |
| `helius` | RPC config, webhook pipelines, priority fees |
| `squads` | Pot authority multisig (task #15, Mature Tree / mainnet prereq) |
| `phantom-connect` | Wallet connection flow in `apps/web` |
| `metaplex` | NFT Strategy Shares — mint + metadata (Full Bloom+) |
| `raydium` | Fallback routing alongside Jupiter |
| `solana-kit` + `solana-kit-migration` | Reference for web3.js v1 → @solana/kit migration |
| `coingecko` | Price data fallback outside Jupiter Price API |
| `orca` | Whirlpools CL — if added |
| `pumpfun` | Only if integrating pump.fun launches (not in current scope) |

Local copies live in `POTBOT_OPUS/.claude/skills/sendai/` — Claude can read SKILL.md directly even without the marketplace installed.

## solana.new journey skills (superstack)
Installed via `curl -fsSL https://www.solana.new/setup.sh | bash` → `~/.claude/skills/` and `~/.codex/skills/`. 33 interactive skills from idea to launch. Trigger via slash command in Claude Code.

**Priority for PotBot right now (hackathon deadline 2026-05-11):**

| Slash | When |
|---|---|
| `/submit-to-hackathon` | Solana Frontier / Colosseum submission prep |
| `/create-pitch-deck` | Investor-grade deck for Superteam NL grant + hackathon |
| `/deploy-to-mainnet` | Phase-5 mainnet checklist (audit, Squads, Helius) |
| `/apply-grant` | Superteam NL grant application |
| `/marketing-video` | Demo video script + shot list (< 3 min, for judges) |
| `/video-craft` | Demo video production |
| `/roast-my-product` | Hard critique of the current DApp |
| `/product-review` | Full product review — UX, tech, positioning |
| `/review-and-iterate` | Post-critique iteration loop |
| `/debug-program` | Anchor program debugging (Phase 5 catches) |
| `/build-defi-protocol` | Patterns when adding yield strategies |
| `/frontend-design-guidelines` | UI polish before submission |
| `/design-taste` | Design quality check |
| `/number-formatting` | Number formatting (common judge gripe) |
| `/page-load-animations` | Perceived-performance polish |
| `/cso` | Security review before mainnet |

**Not relevant right now** (idea/scaffold ready): `/find-next-crypto-idea`, `/validate-idea`, `/scaffold-project`, `/launch-token`, `/build-mobile`, `/build-data-pipeline`.

Full catalog — https://github.com/sendaifun/solana-new.
Ecosystem data in `~/.claude/skills/data/` (colosseum, defi, ideas, solana-knowledge, specs).

## Status (April 2026)
- ✅ Mock mode fully working (6 seed pots)
- ✅ Leaderboard `/leaderboard` with live analytics
- ✅ AI Agent rules engine + UI
- ✅ Governance quorum/approval/risk
- ✅ Budget Grants 3-step wizard
- ✅ Jupiter Price API for PnL FOMO
- ✅ MCP server (`apps/potbot-mcp`) — 15+ tools
- ✅ Backend API (`apps/api`) — price oracle, PnL, agent cron
- ✅ Devnet deploy (program is live)
- ✅ Pitch deck (11 slides)
- 🔴 **Blocker**: Jupiter swap CPI needs an executor wallet
- 🟡 Personal AI Voters — spec ready, implementation Q3 2026
- 🟡 Money Tree Health + death mechanics — schema in contract, UI in progress
- 🟡 Off-chain → on-chain share graduation (`init_share_mint`) — Q2 2026
- 📅 Demo video — May 6–8
- 📅 Hackathon submission — May 11, 2026

## CI/CD changes (April 25, 2026)

- ✅ CI fixed: replaced `actions-rs/toolchain@v1` → `dtolnay/rust-toolchain@stable`
- ✅ Added `solana-keygen new` step to create dummy keypair (fixes Invalid Base58, Issue #17)
- ✅ Added Cargo cache to speed up anchor build
- ✅ Added `api-typecheck` job (TypeScript check for apps/api)
- ✅ Added `security-audit` job (npm audit --audit-level=high)
- ✅ anchor-build: `continue-on-error: true` until devnet deploy stabilises
- ✅ Node.js downgraded from 24 → 20 LTS for stability

## Key files (updated April 2026)

- `.github/workflows/ci.yml` — fixed CI pipeline (5 jobs)
- `docs/integrations/mcp.md` — new full MCP server + x402 guide
- `README.md` — added "For Judges" section, status table, tech stack
- `docs/hackathon/submission.md` — current submission writeup

## Session 2 changes (April 25, 2026)

### CI/CD
- ✅ Fixed YAML syntax in ci.yml (the bug was on line 4 — wrong indent)
- ✅ Added `.github/workflows/publish.yml` — auto-publish `@potbot/mcp` to npm on `mcp-v*` tags

### MCP Server
- ✅ Created `apps/potbot-mcp/src/http.ts` — HTTP+SSE transport (MCP 2025-11-05 spec)
- ✅ Implemented x402 micropayment gate (0.001 USDC per analytics call)
- ✅ Paid tools: `get_vault_analytics`, `get_yield_rates`, `get_leaderboard`
- ✅ Free tools: `list_vaults`, `get_token_prices`, `create_swap_proposal`, `vote_on_proposal`, `join_strategy_vault`
- ✅ Bumped `package.json` → v0.2.0 + binaries `potbot-mcp-http`, npm publish scripts
- ✅ Added Issue #15 progress comment with x402 enable instructions

## Architecture roadmap (April 25, 2026)

- **`docs/architecture/architecture-onchain.md`** — canonical reference: Tier 0/1/2/3 model, three privacy modes (Public / Auditable-Private / Sealed-Private), threat model, performance plan on Light Protocol ZK Compression, phasing to 2027.
- **`docs/architecture/program-phase1.md`** — PR-ready spec for post-hackathon work: kill-switch, auto-pause on drawdown, hash commitments (rules_uri / description / strategy params), `update_health` crank, treasury split. All additive to current accounts (back-compat preserved).
- **`docs/operations/deploy-render.md`** — step-by-step hosted MCP deploy (Blueprint already in repo, one click left in dashboard).
- **`docs/hackathon/submission.md`** — current Frontier 2026 submission writeup, real devnet tx hashes (Explorer-verifiable), 18-tool MCP table, Personal AI Voters top-line, 90s video shot list.

## Phase 1 (post-hackathon) execution order
PR-A program changes → PR-B devnet upgrade → PR-C SDK + MCP `@potbot/mcp@0.7.0` → PR-D DApp UI → PR-E Light Protocol compressed events. Each PR is independent. See `docs/architecture/program-phase1.md` §8.
