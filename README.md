<div align="center">

# POTBOT

### Tokenize any internet community.

**POTBOT is AI-native infrastructure for programmable onchain treasuries on Solana.**

`POT` = Programmable On-chain Treasury  ·  `BOT` = Blockchain Orchestration Tool

[potbot.fun](https://potbot.fun) · [@PotBot_sol](https://twitter.com/PotBot_sol) · [Solana Frontier 2026](https://colosseum.com/frontier)

[![CI](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/YD811/potbot-v2/actions/workflows/ci.yml)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blue?style=flat-square)](https://anchor-lang.com)
[![MCP](https://img.shields.io/badge/MCP-native-14F195?style=flat-square)](https://www.npmjs.com/package/@potbot/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Manifesto

> The internet already coordinates capital.
>
> POTBOT gives every internet community:
> **programmable ownership · liquid coordination · AI-native execution · onchain governance.**

---

## What is POTBOT

POTBOT is a Solana-native protocol for tokenized internet communities. Any group can launch a programmable treasury (a **POT**), pool capital, receive tokenized shares, coordinate on-chain governance, and delegate execution to an AI agent (the **BOT**).

The vault is a Solana program account from day one — no custodian, no operator, no shared seed phrase. Every move is signed onchain.

**Two front doors:**
- **Crypto mode** — Phantom or Solflare via `@solana/wallet-adapter`, full DeFi terminology
- **Normie mode** — sign in with email, Google, Twitter or LinkedIn (Privy-backed embedded Solana wallet); plain-English copy, USD-first prices. No Phantom required

---

## What is a POT

A POT is a program-controlled treasury on Solana. Members deposit SOL, USDC, LSTs, LP positions or any tokenized asset, and receive proportional shares (NAV-priced). Every change to the treasury — swap, withdrawal, settings update — is a proposal that members vote on. The vault PDA signs the execution.

- **Programmable ownership** — NAV-priced shares, redeemable any time; deposit mints internal share accounting, with an explicit `tokenize_shares` step to migrate to an SPL mint (auto-mint at NAV is in progress, Phase B)
- **Onchain governance** — five levels from Autocracy (L0) to Consensus (L4), plus optional risk caps (`max_swap_pct`, `max_budget_grant_pct`, `require_admin_cosign`, `timelock_seconds`) and one-click presets (😎 Chill · ⚖️ Balanced · 🏛 Institutional)
- **Security layer** — optional sentinel/guardian wallet (can freeze a pot and cancel proposals, can never move funds), risk-param timelock (loosening changes wait, tightening is instant), per-protocol CPI allowlist, per-asset daily exposure caps. Member exits are never blockable — withdraw and share redemption stay open even while frozen
- **AI orchestration** — the BOT proposes, executes once quorum is reached, and can be delegated to vote on rules you set
- **Composable** — Jupiter v6 / Ultra swaps, Squads v4 multisig authority, MCP for any AI agent, Solana Blinks for tweet-native deposits and votes
- **Identity** — every POT can claim a `<name>.potbot.sol` SNS subdomain
- **Optional privacy** — STAMPPOT mode wraps deposits in PrivacyCash ZK proofs (Phase 3)

---

## What can a POT become?

| | |
|---|---|
| 🎨 **Creator Fund** | Fans co-own the next drop and split the upside. |
| 🧠 **AI Vault** | An agent runs a strategy, the community sets the rules. |
| 🚀 **Startup Syndicate** | Angel checks pooled, deployed, and tracked onchain. |
| 🎟 **Event Treasury** | Conference floats, hackathon prizes, festival cash — transparent. |
| 👥 **Friend Group ETF** | A shared basket your group actually agrees on. |
| 🎲 **Meme Treasury** | Communities betting together, governed together. |
| 💼 **Investment Club** | Quarterly proposals, monthly votes, zero spreadsheets. |

---

## POT Lifecycle — Money Tree 🌱

Every POT is a living organism. As AUM grows, members join, and trades execute, the pot advances through six stages — each unlocking new capabilities.

| Stage | Emoji | Unlock |
|---|---|---|
| Seedling | 🌱 | Launch, deposit, governance |
| Sprout | 🌿 | Strategy slots, keeper automation |
| Bud | 🌳 | Pot Duels (1v1 vault challenges) |
| Bloom | 🌺 | NFT Strategy Shares mint |
| Full Bloom | 🌸 | SNS subdomain, share tokenization |
| Mature Tree | 🌴 | Squads multisig authority, mainnet prereq |

**Health (HP):** every pot has 0–100 HP, computed as `clamp(0, 100, 100 × current_balance / peak_balance)`. At 0 HP a pot dies — trading locks, Strategy Share NFTs burn, and a `resurrect_pot` call with a fresh deposit is required (stage resets). Low HP automatically triggers defensive-only mode at the program level.

---

## AI orchestration layer (BOT)

POTBOT is built for the coming agent economy. Every POT exposes a programmatic surface that an AI can read, propose against, and execute through.

**Two-tier AI architecture:**
- **Base BOT** — reads treasury state and live prices, surfaces candidate swap proposals as decision-support for the community
- **Personal AI Voter** — every member can register an AI agent wallet as their voting delegate (`MemberDelegate` + `vote_as_delegate`). Delegation is per-pot, revocable onchain; every delegated vote is signed with a reason string. Rules live in `rules_uri` (IPFS / Arweave / HTTPS)

**Keeper automation:**
- Anchored worker evaluates stop-loss, take-profit, and trailing-stop strategy slots on-chain
- Once a trigger fires, the keeper submits `execute_swap` with `StrategyTrigger` mode — no member needs to be online
- DLQ retries on exponential backoff (2s / 5s / 13s / 34s / 89s)

**MCP-native:**
- `@potbot/mcp@0.2.0` on npm — 18 tools (free + paid via x402 protocol)
- Claude, Cursor, Cline can list, propose and vote on POTs over `npx @potbot/mcp`
- HTTP/SSE and stdio transports both supported

---

## Solana Blinks

Every POT proposal becomes a shareable Blink — a vote-able URL that renders directly in X (Twitter), Farcaster, or any Blinks-compatible client. No wallet app required to act on it.

```
https://potbot.fun/api/actions/<potPubkey>/deposit
https://potbot.fun/api/actions/<potPubkey>/vote
```

"Share as Blink" button lives on every pot detail page.

---

## Monetization

**Subscriptions** — [potbot.fun/pricing](https://potbot.fun/pricing):

| Tier | Price | Highlights |
|---|---|---|
| 🌱 Early Supporter | Free during beta | Unlimited pots & members, manual proposals, basic governance |
| ⚡ Pro | $29/mo | AI Agent automation, Strategy Autopilot, visual customization, priority support |
| 🏆 Pro+ | $99/mo | Everything in Pro, unlimited members, custom governance, white-label, dedicated RPC |

Stripe checkout is wired behind `NEXT_PUBLIC_STRIPE_KEY`; paid billing activates alongside the mainnet launch.

**Protocol fees** — accrue to the PotBot treasury (not to validators or the network):

| Stream | Rate | Status |
|---|---|---|
| Pot creation fee | 0.01 SOL, charged onchain in `create_pot` | 🟡 Devnet |
| Swap fee | 0.30% on every trade routed through a pot — fee switch ships with the mainnet program iteration | 🔵 Planned |
| Strategy Vault entry fee | 20% protocol share (70% creator / 10% referrer split is live onchain; the treasury leg is not collected yet) | 🔵 Planned |
| Performance fee | 25% protocol share — creator-set rate (capped at 50%) currently pays out 100% to the creator | 🔵 Planned |

No token, no airdrop farming.

---

## Architecture

```
                   ┌──────────────────────────────┐
                   │     Internet community       │
                   │  (humans · agents · creators)│
                   └──────────────┬───────────────┘
                                  │
                       deposit · propose · vote · blink
                                  │
                   ┌──────────────▼───────────────┐
                   │      POTBOT DApp + MCP       │
                   │  apps/web · apps/potbot-mcp  │
                   └──────┬───────────────┬───────┘
                          │               │
                    keeper cron      agent delegate
                          │               │
                   ┌──────▼───────────────▼───────┐
                   │   pot_vault Anchor program   │
                   │     (PDA-signed treasury)    │
                   └──────┬───────────────┬───────┘
                          │               │
                  Jupiter v6 CPI    Squads v4 (opt.)
                          │
                   onchain settlement
```

Three layers: an Anchor program that owns the funds, a Next.js + MCP surface that any human or agent can drive, and Solana-native composability (Jupiter, Squads, Blinks, Helius, Pyth).

Detailed system design: [`docs/architecture/architecture.md`](docs/architecture/architecture.md).

---

## What makes POTBOT different

Three things only POTBOT ships together:

1. **Onchain group governance baked into the swap instruction** — not a generic multisig queue. `execute_swap` enforces `AdminDirect`, `Proposal`, or `StrategyTrigger` mode at the program level with strict mode-source matching.
2. **MCP-native treasury** — `@potbot/mcp` exposes 18 tools so any LLM can list, propose, vote on, and execute swaps in a pot over a single `npx` command.
3. **Solana Blinks** — a governance proposal becomes a vote-able tweet. Anyone can act on it without leaving X.

---

## Quick start

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install

# Copy env template and fill in your own keys
cp .env.example apps/web/.env.local

# Run the DApp locally
cd apps/web && npx next dev   # → http://localhost:3000

# Or talk to the live MCP server from any AI client
npx @potbot/mcp
```

Set `NEXT_PUBLIC_PRIVY_APP_ID` to enable email / Google / Twitter / LinkedIn login (Normie mode). Without it the app still boots — Crypto-mode Phantom flow always works. Full local-dev setup (Anchor, devnet deploy, all env vars): [`docs/operations/development.md`](docs/operations/development.md).

---

## Current status

🟢 live · 🟡 devnet · 🔵 Phase 2 Q3'26 · 🟣 Phase 3 Q4'26 · ⚪ vision

| Layer | Status |
|---|---|
| `pot_vault` Anchor program (39 instructions: deposit · propose · vote · execute_swap) | 🟡 Devnet live |
| Sentinel/guardian role — `freeze_pot` / `cancel_proposal`; member exits never blocked | 🟡 Devnet (pending redeploy) |
| Risk-param timelock — loosening staged, applied via permissionless `apply_pending_params` | 🟡 Devnet (pending redeploy) |
| Per-protocol CPI allowlist (8 slots) + per-asset daily exposure caps | 🟡 Devnet (pending redeploy) |
| Jupiter v6 / Ultra swap CPI (vault PDA signer) | 🟡 Devnet live |
| Solana Blinks (deposit + vote endpoints) | 🟢 Live |
| MCP server `@potbot/mcp@0.2.0` on npm (18 tools, x402 paid tier) | 🟢 Live |
| Squads v4 multisig authority (optional, UI + lib) | 🟢 Live |
| Helius RPC + webhook indexer | 🟢 Live |
| Keeper — stop-loss / take-profit / trailing-stop cranks | 🟡 Devnet live |
| BOT base layer — AI proposal suggestions | 🟡 Devnet live |
| Personal AI Voters (`MemberDelegate` + `vote_as_delegate`) | 🟡 Devnet live |
| Money Tree lifecycle (6 stages, HP health system) | 🟡 Devnet live |
| Strategy slot accounts (`create_strategy` / `close_strategy`) | 🟡 Devnet live |
| PWA (Saga / Seeker installable) | 🟢 Live |
| Normie mode — Privy email / Google / Twitter / LinkedIn + embedded Solana wallet | 🟢 Live |
| Light theme + plain-English copy + USD-first prices | 🟢 Live |
| Account dashboard (profile · live SOL balance · Add SOL airdrop · Quick Trade) | 🟢 Live |
| `/learn` education page + `/pricing` (Free beta · Pro $29 · Pro+ $99) | 🟢 Live |
| Governance presets — 😎 Chill / ⚖️ Balanced / 🏛 Institutional | 🟢 Live |
| Proposal card v2 (risk check · quorum bar · countdown) + trust surfaces (vault PDA + explorer, frozen/sentinel chips) | 🟢 Live |
| `pot_duel` program — 1v1 vault challenges (unlocks at Bud stage) | 🟡 Devnet live |
| Pyth in-program oracle layer — confidence-filtered price reads (`read_price_checked`) + oracle-priced NAV groundwork (`set_oracle_config`, `nav_per_share`) | 🟡 Devnet (swap deviation guard plumbed but gated off pending Phase B two-feed pricing; mainnet needs Pyth receiver `PriceUpdateV2` decode — currently devnet-legacy layout) |
| Meteora DLMM + Kamino yield strategies | 🔵 Phase 2 |
| Light Protocol ZK-compressed audit log | 🔵 Phase 2 |
| Tamagotchi NFT mint (Bloom unlock, Metaplex) | 🟣 Phase 3 |
| STAMPPOT privacy mode (PrivacyCash ZK proofs) | 🟣 Phase 3 |
| Mainnet deploy | 🔵 Security pass done (14 localnet tests green, 7 security scenarios) — blocked on deployer + executor wallet funding |

Devnet program: `GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK`. Devnet pots were recreated after the security hardening grew the `PotAccount` layout.

Every feature with its lifecycle chip: [potbot.fun/roadmap](https://potbot.fun/roadmap)

---

## Repository layout

```
potbot-v2/
├── apps/
│   ├── web/              Next.js 14 DApp + API routes + Vercel Functions
│   └── potbot-mcp/       MCP server published as @potbot/mcp
├── packages/
│   ├── program/          Anchor programs (Rust) — pot_vault, pot_duel
│   ├── sdk/              TypeScript SDK (@potbot/sdk)
│   └── ui/               Shared React components (@potbot/ui)
├── docs/                 Architecture, operations, integrations, hackathon
├── scripts/              Devnet utilities (demo pots, seeding)
└── supabase/             Off-chain index migrations (NAV snapshots, swap metadata)
```

---

## Documentation

| | |
|---|---|
| [Architecture overview](docs/architecture/overview.md) | System design, on-chain accounts, data flow |
| [Program reference](docs/architecture/program.md) | Instructions, PDAs, governance accounts |
| [Governance model](docs/architecture/governance.md) | L0–L4 levels, quorum, risk caps |
| [Local development](docs/operations/development.md) | Setup, commands, troubleshooting |
| [Deployment](docs/operations/deploy.md) | Devnet → mainnet procedure |
| [MCP integration](docs/integrations/mcp.md) | AI-agent integration guide |
| [Hackathon submission](docs/hackathon/README.md) | Solana Frontier 2026 judge sheet |
| [Security policy](SECURITY.md) | Responsible disclosure |
| [Contributing](CONTRIBUTING.md) | How to propose changes |

---

## License

MIT © 2026 Y-DAO Amsterdam.
