---
name: potbot-dev
description: >-
  Expert developer context for the PotBot v2 project — group trading vaults on Solana
  (Solana Frontier 2026). ALWAYS use when the user mentions potbot, pot vault, anchor
  program, devnet/mainnet deploy, the hackathon, strategy vaults, governance, leaderboard,
  AI agent, personal voters, MCP server, money tree / tamagotchi, pot duel, referral,
  x402, Blinks, or any work on the YD811/potbot-v2 codebase. Also triggers on Russian
  phrases like "запусти", "задеплой", "добавь фичу", "что дальше делать", "хакатон".
---

# PotBot v2 — Developer Context

Load this at the start of every PotBot session. Keep it in sync with the repo README and
`docs/`. When in doubt, the repo is the source of truth — read the relevant doc/file first.

## Project Identity
- **Name**: PotBot v2 — "Group Treasury. AI execution. Money tree that grows."
- **Primitive**: a POT = on-chain group treasury (PDA-owned), BOT = AI execution via MCP.
- **Tagline**: Group trading vaults on Solana — govern together, trade together, win together.
- **Hackathon**: Solana Frontier 2026 (Colosseum).
- **GitHub**: https://github.com/YD811/potbot-v2  (public, MIT, 488+ commits, CI via GitHub Actions)
- **Owner**: YD811 (Yehor Dolinskiy, eeegordolinskiy@gmail.com) · @PotBot_sol · @CryptoYDao · Y-DAO Amsterdam
- **DApp**: https://potbot.fun  ·  **MCP**: `@potbot/mcp` on npm  ·  **SNS**: potbot.sol
- **Program ID (devnet)**: GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK  (verify with `anchor keys list` before relying on it)

## Monorepo Structure (Turborepo + npm workspaces)

```
potbot-v2/
├── apps/
│   ├── web/          # Next.js 14 App Router — main DApp (mock + on-chain)
│   ├── api/          # Hono.js backend — price oracle, PnL/APY, analytics, agent cron
│   ├── potbot-mcp/   # MCP server (solana-agent-kit based) — @potbot/mcp, 18 tools, http+sse+stdio
│   ├── keeper/       # Executor / crank service (fees, AUM snapshots, tamagotchi, agent rules)
│   ├── bot/          # Telegram bot (grammy) — separate v1-style product
│   └── landing/      # Marketing landing page
├── packages/
│   ├── program/programs/
│   │   ├── pot_vault/  # Core: vault, governance, strategy vaults, referral, tamagotchi
│   │   └── pot_duel/   # 1v1 duel vaults (Bloom+ unlock)
│   ├── sdk/          # TypeScript SDK (@potbot/sdk) — PDAs, IDL, client
│   └── ui/           # Shared React components (@potbot/ui)
├── backend/          # (supporting backend assets)
├── supabase/migrations/  # Supabase (Postgres) migrations
├── skills/sendai-potbot/ # in-repo skill
├── scripts/  ·  marketing/  ·  logs/
├── CLAUDE.md         # repo working memory for Claude Code — keep updated
└── docs/
    ├── architecture/{overview,architecture,program,governance}.md
    ├── operations/{development,mock-mode,deploy}.md
    └── integrations/mcp.md
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Blockchain | Solana (devnet + mainnet) · Anchor 0.30.1 · SPL Token |
| Contracts | Rust · Anchor · CPI (Jupiter v6, SPL) |
| Frontend | Next.js 14 · TypeScript · Tailwind · Zustand · TanStack Query v5 |
| Backend | Hono.js · Node.js · PostgreSQL · Redis · Supabase |
| Wallets | Phantom (today) · Privy embedded wallets (Phase 2) |
| Swaps / Yield | Jupiter v6 (Swap, Limit Orders, DCA) · Kamino · Drift · MarginFi · JLP |
| Oracles | Jupiter Price API v2 · Pyth · Switchboard |
| MCP | solana-agent-kit · @modelcontextprotocol/sdk |
| Payments | x402 (AI micropayments, 0.001 USDC/req) · MagicBlock (private referral payouts) |
| NFT / On-ramp | Metaplex Core (strategy shares) · MoonPay |
| Privacy | STAMPPOT — ZK via PrivacyCash (optional) |
| Deploy | Vercel (web + api) · GitHub Actions CI |

## Core Concepts

- **POT**: shared PDA-owned vault. No custodian, no bot-held keys, no multisig operator. Only the
  program moves funds, only after a successful on-chain vote.
- **Shares**: deposit SOL/USDC → NAV-based shares (ETF-like). `init_token_mint` for SPL strategy shares.
- **Governance L0–L4**: from autocratic solo vault to timelocked institutional treasury. Share-weighted.
- **Personal AI Voters**: each member can delegate voting to their own agent — revocable & auditable on-chain.
- **AI Agent (BOT)**: rule-based proposer. Triggers: `price_above|price_below|time_interval|balance_above|
  balance_below|pnl_above|pnl_below`. Actions: `propose_swap|propose_dca|propose_yield_deposit|vote_yes|alert`.
  AI suggests; humans (or their personal voters) decide; nothing executes without votes.
- **Strategy Vaults (creator economy)**: anyone launches a tokenized strategy with fees.
  Fees → entry (70% creator / 20% PotBot / 10% referrer), performance (0–20%, on profit at exit),
  management (0–2% AUM/yr), protocol swap (0.30%, Money-Tree-discounted). 2-tier on-chain referral (20% / 5%).
- **Money Tree / Tamagotchi**: mascot evolves 🌱→🌿→🌳→🌺→🌸→🌴 by AUM/members/volume; unlocks perks.
- **pot_duel**: 1v1 duel vaults (post-MVP).

## On-chain Instructions

Core vault: `create_pot · deposit · withdraw · create_proposal · vote · execute_proposal ·
execute_swap (Jupiter v6 CPI) · update_tamagotchi · init_token_mint`
Strategy vault: `create_strategy_vault · join_strategy_vault · exit_strategy_vault · evolve_tamagotchi`

### PDAs (packages/sdk)
```
getPotAddress(name, authority)       // [b"pot", name, authority]
getVaultAddress(potPubkey)           // [b"vault", potPubkey]
getMemberAddress(potPubkey, wallet)  // [b"member", potPubkey, wallet]
getProposalAddress(potPubkey, id)    // [b"proposal", potPubkey, id_bytes]
```

## Backend & Analytics (apps/api)
- Price Oracle → Jupiter Price API v2 (5s poll, Redis cache)
- PnL Engine → entry × current × shares → realized/unrealized
- APY Engine → annualized from 30d: `(1 + pnl_30d)^(365/30) - 1`
- Yield Aggregator → Kamino + Drift + JLP every 15 min
- Agent Cron → evaluates AI rules every 60s, creates on-chain proposals
- Crank (keeper) → mgmt fees, AUM snapshots, tamagotchi evolution, NFT burns on death
- Per-vault metrics: NAV, PnL 24h/7d/30d/all, APY, Sharpe, max drawdown, win rate, volume USD

## Dev Commands
```bash
# Web
cd apps/web && npx next dev            # localhost:3000
# Anchor (IDL gen is broken on rustc≥1.85 — see Build Logic below)
cd packages/program && anchor build --no-idl
anchor deploy --provider.cluster devnet
anchor test --skip-build --provider.cluster localnet   # ts-mocha integration tests
cargo test -p pot-vault --lib                           # pure-logic unit tests
anchor keys list                        # show/verify program IDs
solana airdrop 2 --url devnet
# MCP
npx @potbot/mcp
# Monorepo (Turborepo)
npm install && npm run dev
```
Full setup: `docs/operations/development.md`. Deploy: `docs/operations/deploy.md`.

## Mock vs On-chain Mode
`apps/web` auto-detects deployment via `useIsProgramLive()` (hooks/usePots.ts):
program account exists at PROGRAM_ID → on-chain; else mock (Zustand seed store).
Enable on-chain: deploy program, set `NEXT_PUBLIC_RPC_URL` + `NEXT_PUBLIC_PROGRAM_ID` in `apps/web/.env.local`.

## Build Logic (non-obvious, durable — read before touching the program)
- **IDL gen is BROKEN on rustc ≥ 1.85.** anchor 0.30.1's `anchor-syn` calls
  `proc_macro2::Span::source_file`, removed in recent proc-macro2/rustc. Never run a
  bare `anchor build`. Workflow:
  1. `anchor build --no-idl`
  2. `python3 packages/program/scripts/patch_idl.py <sdk_idl> <sdk_idl>` — patches the IDL
     and self-checks discriminators in place.
  3. Copy the patched IDL to `packages/sdk/src/idl` **and** `apps/web/src/idl`.
  Keep the `Cargo.lock` pins (`proc-macro2 1.0.86`, `borsh 1.5.7`, etc.) — bumping them
  re-breaks the build.
- **4KB BPF stack limit.** `PotAccount` is large; in instruction contexts it MUST be
  `Box<Account<'info, PotAccount>>` or `try_accounts` blows the stack. Most contexts already
  box it; `mint_tamagotchi_nft` is a known remaining offender (~4848 bytes).
- **`reserved` tail is sacred.** New `PotAccount` fields are CARVED from `reserved`
  (shrink the array, append the field just above it) — never inserted mid-struct. This keeps
  the serialized layout stable so already-deployed accounts stay readable. Standing rule for
  every account-shape change.
- **Vault payouts must be seeds-signed `system_program::transfer`.** The vault PDA is
  System-owned, so direct lamport debits are runtime-rejected. Sign with
  `[b"vault", pot_key, &[vault_bump]]` (see `withdraw.rs`).
- **Tests:** Anchor.toml runs `npx ts-mocha` (not yarn). Integration: `anchor build --no-idl`
  then `anchor test --skip-build --provider.cluster localnet`. Pure logic gets cargo unit tests
  (`cargo test -p pot-vault --lib`).
- **Oracle:** Pyth decoding is devnet-legacy `PriceAccount` layout only. Mainnet needs the
  Pyth receiver `PriceUpdateV2` decode — tracked Phase B follow-up. The swap deviation guard is
  plumbed + unit-tested but gated off (`set_oracle_config` rejects `max_oracle_deviation_bps > 0`)
  until two-feed pricing lands.

## Known Blockers / Gates (check before claiming "done")
- 🔴 **Jupiter swap CPI** needs the executor wallet funded + program deployed (this is the mainnet gate).
- E2E test on devnet: script ready, needs live program.
- Live Kamino/Drift yield + pot_duel: planned post-MVP.

## Security Posture (and roadmap)
- Non-custodial PDAs; execution gated by votes + risk limits (`maxSwapPct`, quorum, approval %).
- VaultMind continuous AI security: 100/100.
- Planned hardening (Morpho Vault V2 style): explicit Sentinel/guardian role (freeze/cancel, never withdraw),
  timelock on risky param changes, per-protocol/per-asset exposure caps. Formal third-party audit on grant.

## Working Conventions
- Branch `main`; CI runs on push (`.github/workflows`). Repo uses claude-squad (`.claude-squad-shared`).
- Keep root `CLAUDE.md` and this skill in sync with README + `docs/` when systems change.
- Status legend used across repo/site: 🟢 live/verifiable · 🟡 devnet · 🔵 Phase 2 Q3'26 · 🟣 Phase 3 Q4'26 · ⚪ vision.
- Design tokens: bg `#0D1117`, card `#111827`, border `#1A2332`, green `#14F195`, accent `#9945FF`, muted `#6B7280`.

## When Adding Features
1. Read the relevant `docs/architecture/*` first; mirror new program fields in `packages/sdk` + IDL (regenerate via the `--no-idl` + `patch_idl.py` flow in Build Logic).
2. Keep `pot_vault` minimal/auditable; new monetization (subscriptions, etc.) as separate modules.
3. Account changes must carve from `PotAccount.reserved` (never shift layout); document migration impact before mainnet.
4. Update mock store (`apps/web/src/lib/mock-store.ts`) so demo mode keeps working.
5. Add/extend tests; `anchor build --no-idl` then `anchor test --skip-build` (+ `cargo test -p pot-vault --lib`) green before deploy.
```
