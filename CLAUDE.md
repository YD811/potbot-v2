# PotBot v2 — Repository Guide

> Lives at `potbot-v2/CLAUDE.md`. Read at the start of any new session.
> Full project documentation lives under `docs/`.

## Project

**PotBot v2** — AI-native infrastructure for programmable onchain treasuries on Solana.

- `POT` = Programmable On-chain Treasury
- `BOT` = Blockchain Orchestration Tool

Every internet community can launch a POT, pool capital, receive tokenized shares, coordinate governance, and delegate execution to an AI agent — non-custodial, settled onchain.

- DApp: [potbot.fun](https://potbot.fun)
- MCP: `@potbot/mcp` on npm
- Hackathon: Solana Frontier 2026

## Stack

- **Onchain** — Solana, Anchor 0.30, SPL Token (`packages/program/`)
- **DApp + API** — Next.js 14 App Router, TypeScript, Tailwind (`apps/web/`)
- **Server** — Vercel Functions for all backend endpoints + cron (`apps/web/src/app/api/`)
- **DB** — Supabase Postgres (off-chain index of onchain state)
- **State** — TanStack Query v5, Zustand (mock mode for UI without a wallet)
- **Swaps + prices** — Jupiter v6 (CPI), Jupiter Price API v3
- **Wallets** — `@solana/wallet-adapter`, Privy (embedded)
- **Agent surface** — `@potbot/mcp` MCP server (`apps/potbot-mcp/`), IDL-independent
- **Deprecated** — `apps/api/` (Hono.js / Fly), see `apps/api/DEPRECATED.md`

## Key commands

```bash
npm run dev                                  # web (apps/web/, port 3000)
anchor build                                 # compile contracts (packages/program/)
anchor deploy --provider.cluster devnet      # deploy to devnet
solana airdrop 2 --url devnet
```

## Architecture

### Frontend (`apps/web/`)

- `src/lib/mock-store.ts` — Zustand store (demo mode without a wallet, seeded pots)
- `src/hooks/usePots.ts` — auto-switch mock ↔ onchain based on whether the program is deployed
- `src/lib/ai-agent.ts` — rules engine for the BOT (price/time/balance/PnL triggers)
- `src/hooks/useAIAgent.ts` — 60s cron, evaluates rules, posts proposals
- `src/app/pots/[pubkey]/page.tsx` — pot detail page (overview, shares, positions, strategy, governance, agent, members)
- `src/components/AIAgentPanel.tsx` — BOT UI (strategy, rules, log)
- `src/components/GovernanceSettings.tsx` — quorum / approval / risk caps

### Onchain (`packages/program/`)

- `programs/pot_vault/` — main program: vault, governance, strategy, referral, Money Tree
- `programs/pot_duel/` — 1v1 duel vaults (unlocks at Bloom+)
- `src/state/pot.rs` — `PotAccount` (incl. `health_hp`, `peak_balance`, `is_dead`, `season`)
- `src/state/proposal.rs` — `ProposalAccount` (with `risk_class` for defensive-only mode)
- `src/state/voter.rs` — `VoterDelegationAccount` (Personal AI Voters)

## Core concepts

### Onchain custody, period

The vault is **always onchain** — a PDA on Solana created in `create_pot`. Only share *accounting* lives off-chain at the Seedling stage (saves SPL rent until growth justifies a token mint). At Sprout+, shares migrate to an onchain SPL mint via `init_share_mint`. Never describe the protocol as "custodial" or "pending onchain" — custody is always onchain.

### Money Tree (Season 1: Plants)

Six stages keyed off AUM, members, and trades: Seedling → Sprout → Bud → Bloom → Full Bloom → Mature Tree. Every pot has Health (0–100 HP), computed as `clamp(0, 100, 100 * current_balance / peak_balance)`. At 0 HP a pot dies — trading is locked, NFT Strategy Shares burn, and a `resurrect_pot` + fresh deposit is required (stage resets).

### Personal AI Voters

Every member can register an AI agent wallet as their voting delegate. Delegation is per-pot, revocable onchain; every vote is signed onchain with a reason string. Rules live in `rules_uri` (IPFS / Arweave / HTTPS). Misbehaving agents are visible in logs and quickly revoked.

### Governance

L0 Autocracy · L1 Advisory (25% veto) · L2 Majority (>50%) · L3 Supermajority (>66%) · L4 Consensus (100%). Optional risk caps overlay: `max_swap_pct`, `max_budget_grant_pct`, `require_admin_cosign`, `timelock_seconds`. At low HP a pot automatically falls into defensive-only mode at the program level.

## Design system

- Background `#0D1117` · Card `#111827` · Border `#1A2332`
- Solana Green `#14F195` · Solana Purple `#9945FF` · Muted `#6B7280`
- CSS classes: `card`, `btn-primary`, `btn-secondary`, `input`, `glow-green`
- Money Tree emoji: 🌱 🌿 🌳 🌺 🌸 🌴 (stages 0–5)
- Health indicator: 🟢 🟡 🟠 🔴 ☠️

## Protocol-integration skills (Sendai)

Marketplace `sendaifun/skills` — AI-native best practices for 45+ Solana protocols. Install via `/plugin marketplace add sendaifun/skills` then `/plugin install <name>` per protocol. Consult these when working in the relevant code paths — they hold current SDK / endpoint guidance that goes stale in tutorials.

| Skill | Apply when editing |
|---|---|
| `jupiter` | `apps/web/src/lib/jupiter-*.ts`, `JupiterSwapPanel.tsx`, `execute_swap.rs` |
| `pyth` | `apps/web/src/lib/pyth.ts`, oracle keeper, proposal_swap price-feed guard |
| `meteora` | DLMM/DAMM yield strategies (`yield_strategy`, unwind path) |
| `kamino` | Lending-based yield strategies, CPI into Kamino reserves |
| `helius` | RPC config, webhook pipelines, priority fees |
| `squads` | Pot authority multisig (Mature Tree / mainnet prereq) |
| `phantom-connect` | Wallet connection flow in `apps/web` |
| `metaplex` | NFT Strategy Shares — mint + metadata (Full Bloom+) |
| `raydium` | Fallback routing alongside Jupiter |
| `solana-kit` + `solana-kit-migration` | Reference for web3.js v1 → @solana/kit migration |
| `coingecko` | Price data fallback outside Jupiter Price API |
| `orca` | Whirlpools CL — if added |
| `pumpfun` | Only if integrating pump.fun launches (not in current scope) |

## Architecture references

- [`docs/architecture/architecture.md`](docs/architecture/architecture.md) — system design, data flow
- [`docs/architecture/architecture-onchain.md`](docs/architecture/architecture-onchain.md) — Tier 0/1/2/3 model, three privacy modes, Light Protocol ZK Compression plan
- [`docs/architecture/program.md`](docs/architecture/program.md) — onchain instructions, PDAs, accounts
- [`docs/architecture/program-phase1.md`](docs/architecture/program-phase1.md) — kill-switch, drawdown auto-pause, hash commitments, treasury split
- [`docs/architecture/governance.md`](docs/architecture/governance.md) — L0–L4 levels, quorum, risk caps
- [`docs/operations/development.md`](docs/operations/development.md) — local setup
- [`docs/operations/deploy.md`](docs/operations/deploy.md) — devnet → mainnet
- [`docs/integrations/mcp.md`](docs/integrations/mcp.md) — MCP server + x402 micropayments
- [`docs/hackathon/README.md`](docs/hackathon/README.md) — Solana Frontier 2026 submission
