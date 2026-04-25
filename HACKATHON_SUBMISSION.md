# 🪴 PotBot v2 — Solana Frontier 2026 Hackathon Submission

**Track**: DeFi · Infrastructure · AI Agents
**Team**: Y-DAO Amsterdam — Yehor Dolinskiy (solo, [@CryptoYDao](https://x.com/CryptoYDao))
**Deadline**: 2026-05-11 · **Submission portal**: [colosseum.com/frontier](https://colosseum.com/frontier)

> **One-liner.** Group-trading vaults on Solana with on-chain governance and **Personal AI Voters** — every member can delegate their vote to an AI agent that signs on-chain with a public, revocable rules URI.

---

## Live Links

| Resource | URL |
|---|---|
| 🌐 DApp (devnet, demo mode auto-on) | https://potbot.fun |
| 📦 MCP server on npm | [`@potbot/mcp@0.6.0`](https://www.npmjs.com/package/@potbot/mcp) |
| 🤖 For-agents page | https://potbot.fun/for-agents |
| 📖 GitHub | https://github.com/YD811/potbot-v2 |
| 🏷️ Hackathon release | [`v0.9.0-hackathon`](https://github.com/YD811/potbot-v2/releases/tag/v0.9.0-hackathon) |
| 🐦 Twitter | https://x.com/PotBot_sol |
| 📺 Demo video | recording 2026-05-06 → 2026-05-08 |

---

## Devnet Program — verifiable right now

**Program ID:** `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`
**Explorer:** https://explorer.solana.com/address/GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK?cluster=devnet

```bash
solana program show GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK --url devnet
```

### Real on-chain E2E (finalized on devnet, no mocks)

A reproducible end-to-end run from MCP-only tooling — every transaction is a real on-chain submission, not a simulation:

| Step | Pot / Account | Tx Signature | Action |
|---|---|---|---|
| 1 | `CFke4rJqmx1HyWQxNuZWGitFGDSE5rmf7fhr3zJ1dWjC` | [`5oJpF5Ai…4GQ7hZk`](https://explorer.solana.com/tx/5oJpF5AiLAtQ4aM178Hq5JNdskuTHMUwPzMzTMcUmcHbR6eS7jMUAzcYD9f5ZHSDDL9nvBggMWEisbRwW4GQ7hZk?cluster=devnet) | `create_pot` — “MCP Demo Pot” initialized |
| 2 | MemberAccount via `init_if_needed` | [`4V8i9MD3…HLWn4`](https://explorer.solana.com/tx/4V8i9MD3qTyqhgpjaMQeBAkZBDRhZAzDvS5iVnPN2kP3h8chmDyroVtbu3xBga57ymkXVQ9kaUzzhuMKPFTHLWn4?cluster=devnet) | `deposit` 0.5 SOL via MCP `join_strategy_vault` |
| 3 | ProposalAccount #0 | [`2xQNzisj…g5d3AXn`](https://explorer.solana.com/tx/2xQNzisjTAqWwUdrWdXky1bvF18S1DSWgrNwa1DGg1pRwWFoFi8GsmaRnd2GbhnAPPb9xngUT5s1SdbqZg5d3AXn?cluster=devnet) | `create_proposal` (Swap) via MCP `create_swap_proposal` |

Reproduce: `node apps/potbot-mcp/scripts/seed-test-pot.mjs` then any 0.6.0 MCP client.

---

## What's Actually Working

### On-chain (Anchor 0.30, Rust)

- `create_pot`, `set_allowed_mints`, `create_strategy`, `execute_swap` (Jupiter v6 CPI, slippage enforced on-chain), `close_strategy`, `mark_proposal_passed`, `pot_admin`
- `deposit` (creates `MemberAccount` via `init_if_needed`), `create_proposal` (Swap variant carries `from_mint`/`to_mint`/`amount_in`/`min_amount_out`)
- **Personal AI Voters** (new in this submission cycle):
  - `register_delegate(delegate, rules_uri)` — member registers an AI wallet + public rules URI
  - `revoke_delegate()` — preserves the PDA for audit, sets `revoked_at`
  - `vote_as_delegate(approve)` — delegate signs on-chain; `VoterRecord` keyed by **member.wallet** (not signer) prevents double-voting whether the member or the AI signs

### MCP server — `@potbot/mcp@0.6.0` (npm)

18 tools split across read / write / discovery / data:

| Category | Tool | What it does |
|---|---|---|
| **Read (real on-chain)** | `list_vaults` | `getProgramAccounts` filtered by Anchor PotAccount discriminator |
| | `get_vault_analytics` | Decodes full `PotAccount`, real vault PDA balance, SPL holdings via `getTokenAccountsByOwner`, NAV priced via Jupiter Price API v2 |
| | `get_proposals` | Decoded ProposalAccount list — Swap params, status, vote tally, snapshot |
| | `get_leaderboard` | Sorted live by TVL / members / trades / volume |
| | `check_delegate` | Reads on-chain `MemberDelegate` PDA |
| | `agent_status` | Identity of the AI delegate loaded into MCP |
| **Write (real on-chain or unsigned-tx)** | `create_swap_proposal` | Auto-derives `next_proposal_id`, builds real `create_proposal` ix, signs+submits if `AGENT_KEYPAIR` is the proposer, otherwise returns base64 unsigned tx |
| | `join_strategy_vault` | Builds real `deposit` ix, dual return shape |
| | `vote_on_proposal` | Submits **real** `vote_as_delegate` tx when an active delegation exists; otherwise returns dApp signing link |
| | `register_delegate` / `revoke_delegate` | First MCP tools that produce real on-chain effects |
| **Discovery / data** | `get_market_analytics` | CoinGecko: price, mcap, %-changes, ATH, FDV + computed 30d realized vol, 14d RSI, trend label |
| | `get_top_solana_protocols` / `get_protocol_stats` | DefiLlama Solana-only TVL (CEX/Bridge/RWA filtered out) |
| | `get_social_sentiment` | Twitter (LunarCrush) + Reddit (no-key) + News (CryptoPanic), every text item VADER-scored, weighted aggregate (Twitter 50% / Reddit 30% / News 20%, renormalised on missing keys) |
| | `get_yield_rates` | DefiLlama yields for Solana, TVL > $100k, risk-classified |
| | `get_token_prices` | Jupiter Price API v2 |
| | `get_agent_rules` | The AI strategist rule template |

Resources: `potbot://network/info` · `potbot://vaults/list` · `potbot://yields/solana`
Prompts: `vault_strategist` (refuses to recommend without `get_market_analytics` + `get_social_sentiment`), `risk_auditor`, `yield_hunter`

```bash
npm install -g @potbot/mcp
# stdio: claude_desktop_config.json → command: "potbot-mcp"
# HTTP+SSE: potbot-mcp-http   (x402 micropayments: X402_ENABLED=true)
```

### DApp (`apps/web`, Next.js 14)

- Mock mode by default, auto-switches to on-chain when the program is reachable
- Pot detail page (7 tabs): overview, shares, positions, strategy, governance, **AI Agent (with Delegate sub-tab — register/revoke real on-chain delegation from the browser)**, members
- Money Tree: 6 stages 🌱→🌿→🌳→🌺→🌸→🌴, Health 0–100 HP, defensive-only mode auto-engaged at low HP
- Leaderboard with live TVL via Dune SIM `/svm/balances` aggregation

---

## Why This Wins

1. **Real on-chain effects from an AI client.** Three of the MCP tools (`vote_as_delegate`, `register_delegate`, `revoke_delegate`) **produce signed transactions** — not advice, not "click this dApp link." Other AI-meets-DeFi submissions stop at instructions; this one transacts.
2. **Personal AI Voters are a primitive, not a feature.** The on-chain delegation PDA + `VoterRecord` keyed by member.wallet means you can swap your AI agent any time without losing your voting weight, double-voting is impossible, and a misbehaving AI is one `revoke_delegate` ix away from disabled — fully auditable.
3. **AI grounded in real data.** The `vault_strategist` prompt **refuses** to recommend until it has called `get_market_analytics` (CoinGecko + RSI/vol/trend) and `get_social_sentiment` (Twitter + Reddit + News, VADER-scored). Hallucinated proposals are blocked by tooling, not by hope.
4. **Three-mode authorization in one instruction.** `execute_swap` supports AdminDirect / Proposal / StrategyTrigger with strict mode-source matching — no parallel contracts, no foot-guns.
5. **On-chain trigger verification.** Stop-loss / take-profit re-read Pyth inside the instruction; keepers cannot fake a trigger.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Smart contracts | Anchor 0.30 (Rust) — `pot_vault` + `pot_duel` programs |
| Swaps | Jupiter v6 (CPI, slippage on-chain) |
| Frontend | Next.js 14, TanStack Query v5, Zustand, wallet-adapter |
| Backend | Hono.js + PostgreSQL + Redis (`apps/api`) |
| Price feeds | Pyth Network (on-chain), Jupiter Price API v2 (off-chain) |
| Yield | Meteora DLMM, Kamino |
| Analytics | Dune SIM (SVM endpoints), DefiLlama, CoinGecko |
| Sentiment | LunarCrush (Twitter) + Reddit + CryptoPanic + VADER |
| RPC | Helius |
| NFT | Metaplex Core (Strategy Shares) |
| Multisig (mainnet) | Squads v4 |
| Privacy (opt-in) | PrivacyCash ZK proofs (STAMPPOT) |
| MCP | `@modelcontextprotocol/sdk` over stdio + HTTP+SSE; x402 micropayments |

---

## Demo Video — 90-second shot list

Recording window 2026-05-06 → 2026-05-08. Cuts under 5s each.

| Time | Shot | Voiceover |
|---|---|---|
| 0:00 – 0:08 | Six phones, one Solana wallet logo with a red "?" overlay | "Six friends. One pot of money. Whose wallet holds it?" |
| 0:08 – 0:18 | potbot.fun → Create Pot, set Governance L2 Majority, deposit 0.5 SOL | "PotBot gives any group a real on-chain vault — with the rules baked in." |
| 0:18 – 0:32 | Claude Desktop with `@potbot/mcp` loaded, calling `get_market_analytics(SOL)` → RSI 49.6, vol 52.82%, trend sideways. Then `get_social_sentiment(SOL)` → bullish 0.323 from Reddit | "Their AI strategist isn't bluffing — it grounds every proposal in real CoinGecko, DefiLlama, and Twitter signals." |
| 0:32 – 0:46 | MCP `create_swap_proposal` → real on-chain tx, cut to Solana Explorer showing the proposal account decoded | "One MCP call. Real `create_proposal` instruction. On-chain in 400ms." |
| 0:46 – 1:00 | DApp AI Agent tab → Delegate sub-tab → register a delegate wallet + paste a rules URI gist → confirm in wallet → on-chain success | "Each member can delegate their vote to an AI — with a public, revocable rule set." |
| 1:00 – 1:14 | MCP `vote_on_proposal` from the delegate wallet → real `vote_as_delegate` tx → Explorer shows VoterRecord PDA created | "The AI signs the vote on-chain. The audit trail is the chain itself." |
| 1:14 – 1:24 | Pot stage progresses 🌱→🌿, leaderboard updates, Money Tree health bar | "And the pot grows up — Money Tree stages, Health, defensive-only mode at low HP." |
| 1:24 – 1:30 | npm install card + GitHub URL + devnet program ID | "`npm install -g @potbot/mcp`. Solo founder, 5 weeks. Hackathon submission." |

---

## Judges Checklist

| What to test | How |
|---|---|
| 🌐 Live DApp | https://potbot.fun — no wallet needed (demo mode) |
| 🔌 MCP server | `npm install -g @potbot/mcp` then point Claude Desktop at `potbot-mcp` |
| 🔗 Devnet program | `solana program show GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK --url devnet` |
| 🧪 Real on-chain E2E | Verify the 3 tx hashes above on Solana Explorer (devnet) |
| 🪴 Demo Pot | https://explorer.solana.com/address/CFke4rJqmx1HyWQxNuZWGitFGDSE5rmf7fhr3zJ1dWjC?cluster=devnet |
| 🤖 AI Agent rules + Delegate | Open any pot → AI Agent tab → Rules / Delegate sub-tabs |
| 📊 Analytics API | `curl https://api.potbot.fun/health` |
| 🏆 Leaderboard | https://potbot.fun/leaderboard |
| 📖 Architecture | [docs/OVERVIEW.md](docs/OVERVIEW.md), [docs/PROGRAM.md](docs/PROGRAM.md), [docs/MCP.md](docs/MCP.md), [docs/ARCHITECTURE_ONCHAIN.md](docs/ARCHITECTURE_ONCHAIN.md) |
| 🛣️ Phase 1 spec (post-hackathon) | [docs/PROGRAM_PHASE1.md](docs/PROGRAM_PHASE1.md) — kill-switch, auto-pause, hash commitments, Light Protocol events |
| ☁️ Hosted MCP deploy | [docs/RENDER_DEPLOY.md](docs/RENDER_DEPLOY.md) — Render Blueprint, 3-click setup |

---

## Track Integrations

| Partner | Integration | Status |
|---|---|---|
| Jupiter v6 | All swaps — best route, slippage, CPI from program | Done |
| Dune SIM | Vault portfolios, activity feed, leaderboard TVL, keeper pre-flight | Done |
| Pyth Network | On-chain oracle inside `execute_swap` for trigger verification | Done |
| x402 | AI micropayments — 0.001 USDC per analytics call (HTTP+SSE) | Done |
| Helius | RPC + priority fees | Done |
| Metaplex Core | Strategy Shares NFT (Full Bloom+) | Schema ready |
| Squads v4 | Pot authority multisig (mainnet phase-5) | Setup guide shipped |

---

## Known Limitations

- Jupiter swap CPI requires an executor wallet on Render/Fly.io to consummate passed proposals — Render Blueprint shipped (`render.yaml` + `Dockerfile`), funding step left.
- Off-chain → on-chain share graduation (`init_share_mint`) — schema ready, deferred to Q2 2026 post-hackathon.
- Demo video — recording 2026-05-06 → 2026-05-08.

---

## Team

**Yehor Dolinskiy** (YD) — Solo founder, Amsterdam. Y-DAO co-founder, Superteam Netherlands. Former BD on Binance ecosystem and Trust Wallet. Built end-to-end in 5 weeks: contracts, dApp, API, keeper, MCP, docs, npm publish, devnet deploy.

`@YegorDO` on Telegram · [`@CryptoYDao`](https://x.com/CryptoYDao) on X · `eeegordolinskiy@gmail.com`
