# CLAUDE.md — PotBot v2 working memory

Read this first, every session. This is the operating context for Claude Code on this repo.
Source of truth is the code + `docs/`; if this file and the code disagree, trust the code and update this file.

## What this is
PotBot v2 — group trading vaults on Solana. A POT is a PDA-owned, non-custodial vault governed
on-chain. Monorepo (Turborepo + npm workspaces). Owner: YD811 (Yehor). Built for Solana Frontier 2026.
DApp: potbot.fun · MCP: `@potbot/mcp` · Program ID (devnet): GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK.

## 🔴 Right now — the one thing that matters
**Get the program live on Solana mainnet.** This is the funded grant milestone (Superteam, $1k: 50% on
approval, 50% on mainnet-live).

Current blocker (from README status): **Jupiter swap CPI needs the executor wallet funded + program
deployed.** Until that's done, `execute_swap` is the gate.

Order of operations:
1. Finalize + harden the program (see Security below) while still pre-mainnet.
2. `anchor build` → `anchor test` green.
3. Fund executor wallet, deploy to mainnet-beta, verify program ID on Explorer.
4. Create a flagship POT with real capital, run full flow: create → deposit → propose → vote → execute_swap.

## ⛔ Do NOT (before mainnet is live)
- Don't add big new features unrelated to the deploy (subscriptions, multi-asset, pot_duel) — those are post-launch.
- Don't change on-chain account layouts without flagging migration impact first.
- Don't break mock mode (`apps/web/src/lib/mock-store.ts`) — judges/demos rely on it.
- Don't commit secrets/keypairs. Executor/mainnet keys stay out of git.

## How to work here
- **Plan before coding** on any program change: list file changes, new fields, account-size/migration
  impact, and error codes; wait for OK; then implement in small commits.
- Mirror any program change in `packages/sdk` (PDAs + IDL) and keep `apps/web` mock store working.
- Run `anchor build && anchor test` before declaring done. CI runs on push (`.github/workflows`).
- Branch `main`. Repo uses claude-squad (`.claude-squad-shared`).
- Use `context7` for current Anchor/Solana/Jupiter docs instead of relying on memory.

## Security model (current + planned)
Current: non-custodial PDAs, execution gated by votes + `maxSwapPct`/quorum/approval %. VaultMind 100/100.
Planned hardening (Morpho Vault V2 style) — ideally land before mainnet:
- Sentinel/guardian role: can freeze pot / cancel proposal, can NEVER withdraw.
- Timelock on risky governance param changes.
- Per-protocol / per-asset exposure caps enforced in execute_swap/execute_proposal.
See skill `solana-security-review` for the audit checklist.

## Map
```
apps/  web(Next14 DApp) · api(Hono backend) · potbot-mcp(MCP) · keeper(crank) · bot(Telegram) · landing
packages/ program(pot_vault, pot_duel) · sdk · ui
docs/ architecture/{overview,architecture,program,governance}.md · operations/{development,mock-mode,deploy}.md · integrations/mcp.md
supabase/migrations · skills/ · scripts/
```

## Key files
- `packages/program/programs/pot_vault/src/lib.rs` — program entry / instructions
- `packages/program/programs/pot_vault/src/state/{pot,proposal}.rs` — accounts
- `packages/sdk/src/{client.ts,pda.ts,idl/}` — SDK
- `apps/web/src/app/pots/[pubkey]/page.tsx` — pot detail (tabs)
- `apps/web/src/hooks/usePots.ts` — mock↔on-chain switch (`useIsProgramLive`)
- `apps/web/src/lib/{mock-store.ts,ai-agent.ts}` — demo state + AI rules
- `apps/api/*` — price oracle, PnL/APY, agent cron · `apps/keeper/*` — crank

## Commands
```
cd apps/web && npx next dev
cd packages/program && anchor build && anchor test
anchor keys list
anchor deploy --provider.cluster devnet   # mainnet: see docs/operations/deploy.md
npx @potbot/mcp
```

## Status legend (used across repo + site)
🟢 live/verifiable · 🟡 devnet · 🔵 Phase 2 Q3'26 · 🟣 Phase 3 Q4'26 · ⚪ vision

## Skills available for this project
`potbot-dev` (context) · `potbot-deploy` (mainnet) · `potbot-anchor` (program conventions) ·
`solana-security-review` (audit) · `potbot-mcp-tools` (MCP) · `potbot-content` (brand voice).
