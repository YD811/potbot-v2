# PotBot v2 — Solana Frontier 2026 submission

**Status:** draft. Refine with Claude Code `/submit-to-hackathon` and
`/create-pitch-deck` before submitting.

---

## Tagline

Group trading vaults on Solana. Pool, govern, and trade together — with an
AI agent watching the market 24/7.

## One-line elevator

PotBot turns crypto group chats into on-chain trading vaults: pool SOL with
friends, vote on every swap, and let an MCP-native AI agent propose trades
24/7. SPL-tokenized shares, Jupiter routing, Pyth-guarded execution.

## What PotBot does (scannable)

- **Group vaults** — any number of members pool SOL into a shared on-chain vault; each member holds SPL-tokenized shares reflecting their proportion of the NAV.
- **On-chain governance** — every swap, withdrawal, or config change requires a vote. Five governance levels from autocracy to full consensus. Quorum, timelock, and approval-% are configurable per vault.
- **AI trading agent (MCP-native)** — members write IF/THEN rules ("if SOL drops 5%, buy 10%"); the agent creates proposals automatically. Any LLM with MCP access can drive it — Claude, GPT, Codex, or a custom agent.
- **Jupiter routing** — swaps route through Jupiter Ultra API for best execution with slippage guards.
- **Pyth price validation** — swaps with attached oracle feeds verify fill price vs. Pyth before settlement, defeating Jupiter-sandwich attacks.
- **Tamagotchi evolution** — each vault is a plant that grows from 🌱 to 🌳 based on volume, members, and trades. Higher levels unlock lower fees.
- **Referral + creator economy** — creators can launch Strategy Vaults, set entry/performance fees, and earn from investors following their strategy.
- **Private pots** — invite-code-gated vaults with SNS subdomain support.

## Track

**DeFi / Consumer** — group coordination primitive for retail DeFi users.

## Live links

| Resource | URL |
|---|---|
| Product | https://potbot.fun |
| App (same host, auto-detects on-chain mode) | https://potbot.fun |
| GitHub | https://github.com/YD811/potbot-v2 |
| Program (Solscan devnet) | https://solscan.io/account/GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK?cluster=devnet |
| SDK (npm/TS) | `packages/sdk/` in the repo |
| MCP server | `apps/potbot-mcp/` in the repo |
| Twitter | https://x.com/PotBot_sol |
| Telegram v1 bot | https://t.me/Trade_pot_bot |

## Tech stack

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

## Why this wins

1. **Novel primitive** — group-vault governance with AI-driven proposals isn't solved on any L1. This is the first end-to-end implementation.
2. **MCP-native from day one** — directly exposed as tools any AI agent can call. Matches the direction the ecosystem is heading.
3. **Real product, not a hackathon demo** — deployed program, live dApp, waitlist, functioning Supabase, working Telegram v1 bot with paying users (PotBot v1 predecessor).
4. **Full stack** — program + SDK + web + MCP + bot. No hand-waving about "could integrate X" — every protocol (Jupiter, Pyth, Meteora, Kamino, Helius, Squads, Metaplex, SNS) is wired.
5. **Open source under Apache-2.0**, clean monorepo, comprehensive docs.

## Demo video — 3 min script

**0:00–0:15** — cold open: group chat with three friends arguing about whether to buy SOL. Cut to the PotBot dApp. Tagline on screen.

**0:15–0:45** — "Create a pot" flow. Name, emoji, governance level slider (autocracy → consensus), yield strategy. 30 seconds of real screen.

**0:45–1:15** — Three members deposit SOL from separate wallets. Shares tokens mint to each. Show the NAV live.

**1:15–2:00** — A member proposes a swap (SOL → JUP). Governance card shows current vote tally; two members vote yes. Timelock countdown. Once passed, any member clicks Execute → Phantom → Jupiter swap → Pyth price check → settled on-chain. Show the tx on Solscan.

**2:00–2:30** — Set an AI agent rule: "if SOL drops below $130, propose buying 5% more." Fake a price drop (devnet). Agent creates a proposal. Members vote via the bot notification.

**2:30–3:00** — Tamagotchi evolution. Plant grows to level 3. "Watch your vault grow. Built for Solana Frontier 2026. potbot.fun."

Close on: logo, GitHub link, Twitter.

## Judging criteria mapping

| Criterion | How PotBot earns it |
|---|---|
| **Novelty / creativity** | Group-vault governance with AI proposals is new. Tamagotchi gamification of vault growth adds stickiness. |
| **Technical execution** | Full Anchor program + TS SDK + MCP + web + bot. Every protocol (Jupiter / Pyth / Meteora / Kamino / Helius / Squads / Metaplex / SNS) integrated, not mocked. |
| **Product polish** | Live dApp on potbot.fun, light/dark theme, three wallet adapters, keeper uptime, Supabase backed. |
| **Composability** | MCP-native → any AI agent can drive. SDK published. Program open. |
| **Growth potential** | Already has v1 Telegram product with active users. Discord/Twitter presence. Superteam NL grant pipeline. |
| **Open source** | Apache-2.0, monorepo, comprehensive docs (CLAUDE.md, ARCHITECTURE_V2.md, Anchor program ADRs). |

## What's still pending (be honest with judges)

- Mainnet deploy is gated on: external audit pass, Squads multisig handoff, MiCAR disclosure (YD is Amsterdam-based, EU jurisdiction). Target: week of 2026-05-07.
- Keeper 48h devnet uptime test (task #14) — runs before judging window.
- Some premium features (SNS, tokenized shares) are complete on-chain but
  still behind a "beta" toggle in UI.

Being upfront about pending work beats pretending everything is done — judges
spot padding instantly.

## Prior context

PotBot v1 lives as a Telegram-native group wallet (`@Trade_pot_bot`) with
paying users. v2 is the on-chain, governance-first reimagining — same team
(YD + Y-DAO Amsterdam contributors), same product north star, full rewrite.

## Next steps

Run these in order to finalize:

```
claude "/submit-to-hackathon  Refine this draft against Solana Frontier judging criteria"
claude "/create-pitch-deck    Build the deck from this submission and Y-DAO brand"
claude "/marketing-video      Storyboard + shot list from the 3-min script above"
claude "/video-craft          Produce the demo video"
claude "/roast-my-product     Stress-test the dApp before judges do"
claude "/cso                  Security review pass on the program"
claude "/deploy-to-mainnet    Execute the mainnet checklist"
claude "/apply-grant          Superteam NL — reuse this submission as base"
```
