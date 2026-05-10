# POTBOT — Solana Frontier 2026 submission

> Tokenize any internet community.
> AI-native infrastructure for programmable onchain treasuries on Solana.

This is the judge-facing index for the [Colosseum / Solana Frontier 2026](https://colosseum.com/frontier) submission. The web version lives at [potbot.fun/hackathon](https://potbot.fun/hackathon).

---

## Try it in 60 seconds

| | |
|---|---|
| **Live DApp** | [potbot.fun](https://potbot.fun) (devnet) — connect Phantom on Devnet |
| **Flagship POT** | [potbot.fun/vaults](https://potbot.fun/vaults) — pick the featured pot |
| **MCP server** | `npx @potbot/mcp` — stdio + HTTP/SSE transports |
| **Solana Blink** | tweet `https://potbot.fun/api/actions/<potPubkey>/deposit` |
| **Source** | [github.com/YD811/potbot-v2](https://github.com/YD811/potbot-v2) |

---

## What POTBOT is

POTBOT lets any internet community launch a programmable onchain treasury and delegate execution to an AI agent. The treasury is a Solana program account — non-custodial from day one, governed by member votes, executed through Jupiter v6 with the vault PDA as signer.

- **POT** = Programmable On-chain Treasury (the container)
- **BOT** = Blockchain Orchestration Tool (the AI layer)

Use cases that already work on devnet today: creator funds, AI vaults, startup syndicates, event treasuries, friend-group ETFs, meme treasuries, investment clubs.

---

## What ships today (devnet, judge-verifiable)

| Track | What | Source |
|---|---|---|
| Jupiter v6 | Vault PDA signs every swap via CPI inside `pot_vault::execute_swap` | [`execute_swap.rs`](../../packages/program/programs/pot_vault/src/instructions/execute_swap.rs) |
| Solana Actions / Blinks | Deposit + vote straight from a tweet | `apps/web/src/app/api/actions/` |
| MCP — Model Context Protocol | Any MCP client can list, propose, vote on POTs | [`@potbot/mcp` on npm](https://www.npmjs.com/package/@potbot/mcp) |
| Helius | RPC + webhook indexer; HMAC-verified | [`api/webhooks/helius/route.ts`](../../apps/web/src/app/api/webhooks/helius/route.ts) |
| Squads v4 | Optional multisig authority for pot governance | [`apps/web/src/lib/squads.ts`](../../apps/web/src/lib/squads.ts) |
| Multi-asset portfolio | Treasury holdings grouped by category | [`VaultPortfolioDisplay.tsx`](../../apps/web/src/components/VaultPortfolioDisplay.tsx) |
| BOT — AI orchestration | Proposal generation + on-chain execution | [`PotBotAISuggestions.tsx`](../../apps/web/src/components/PotBotAISuggestions.tsx) |
| Solana Mobile | PWA installable on Saga / Seeker | [`apps/web/public/manifest.json`](../../apps/web/public/manifest.json) |

---

## Architecture

Three layers — onchain, off-chain, composability.

**Onchain · Anchor 0.30**
- `pot_vault` program with 30+ instructions
- `create_pot · deposit · withdraw`
- `create_proposal · vote · execute_proposal`
- `execute_swap` → Jupiter v6 CPI (vault-PDA signer)
- POT admin controls: pause, allowed mints, spending policy
- Strategy slot accounts: stop-loss, take-profit, trailing
- Personal AI Voter delegation flow

**Off-chain · Next.js 14 + Vercel Functions**
- POT detail UX with sticky hero and tabs
- Solana Action endpoints
- Helius RPC + webhook indexer
- Multi-asset portfolio panel
- BOT base layer (suggestion feed)
- Personal AI delegate (rules + presets)
- agent-poll cron — onchain proposal posting

**Composability · Solana ecosystem**
- Jupiter v6 swap (CPI)
- Squads v4 multisig (optional)
- `@potbot/mcp` on npm
- Solana Blinks (Twitter / X)
- PWA manifest (Saga / Seeker)
- Dune SIM analytics

Detailed system design: [`../architecture/architecture.md`](../architecture/architecture.md).

---

## 90-second pitch

| | |
|---|---|
| **Problem** | Internet communities want to coordinate capital — creator funds, syndicates, meme treasuries. Today they share seed phrases or wire a Squads multisig with no coordination layer. Both are dead ends. |
| **Solution** | POTBOT is the AI-native infrastructure for tokenized internet capital. Programmable treasury, onchain governance, AI orchestration — all in one Anchor program. The community votes; the BOT proposes and executes. |
| **Demo** | Open `/vaults` → click the flagship POT → deposit 0.05 SOL → the BOT tab surfaces a rebalance suggestion → submit as proposal → vote yes → watch `execute_swap` hit Jupiter v6 with the vault PDA as signer. |
| **Differentiation** | Three things only POTBOT ships together: (1) onchain group governance baked into the swap ix, (2) MCP-native server so any AI agent can run a treasury, (3) Solana Blinks so a proposal becomes a vote-able tweet. |
| **Ask** | Devnet product is live today. Mainnet ships after the security pass. We're asking Colosseum to back the team building the foundation layer for internet-native economies on Solana. |

---

## Detailed submission writeup

See [`submission.md`](submission.md) for the full Frontier 2026 submission, including real devnet transaction hashes, the 18-tool MCP table, Personal AI Voters spec, and the 90-second video shot list.

Competitive landscape: [`competitive-landscape.md`](competitive-landscape.md).
Platform improvements roadmap: [`platform-improvements.md`](platform-improvements.md).
