# 🪴 PotBot v2 — Full Project Documentation

> **Group Treasury. AI execution. Money tree that grows.**
>
> **POT** = on-chain group treasury
> **BOT** = AI execution through MCP
> **🪴** = your wealth expanding

[potbot.fun](https://potbot.fun) · [@PotBot_sol](https://twitter.com/PotBot_sol) · [GitHub](https://github.com/YD811/potbot-v2)

---

## Table of Contents

1. [What is PotBot?](#what-is-potbot)
2. [Infrastructure Positioning](#infrastructure-positioning)
3. [Why PotBot Exists](#why-potbot-exists)
4. [Six Core Features](#six-core-features)
5. [How It Works](#how-it-works)
6. [Personal AI Voting Agents](#personal-ai-voting-agents)
7. [Money Tree — Levels, Rules, Health](#money-tree--levels-rules-health)
8. [Off-Chain → On-Chain Shares Strategy](#off-chain--on-chain-shares-strategy)
9. [STAMPPOT — Privacy Layer](#stamppot--privacy-layer)
10. [SNS Identity](#sns-identity)
11. [Strategy Vaults — Creator Economy](#strategy-vaults--creator-economy)
12. [AI Agent — Autonomous Proposals](#ai-agent--autonomous-proposals)
13. [MCP Server — AI-Native Infrastructure](#mcp-server--ai-native-infrastructure)
14. [Governance Levels](#governance-levels)
15. [DeFi Integrations](#defi-integrations)
16. [Backend & Analytics](#backend--analytics)
17. [On-chain Program — Instructions](#on-chain-program--instructions)
18. [Tech Stack](#tech-stack)
19. [Revenue Model](#revenue-model)
20. [Why Crypto / Why Now](#why-crypto--why-now)
21. [PotBot v1 vs v2](#potbot-v1-vs-v2)
22. [Roadmap & Current Status](#roadmap--current-status)
23. [Links & Resources](#links--resources)

---

## What is PotBot?

PotBot is **infrastructure for group capital management on Solana**. A unique primitive that combines:

- **Group governance** — every action requires a vote, with fully configurable quorum, thresholds, and timelocks
- **AI automation** — MCP-native agents propose and execute trades within pre-approved rules
- **Best-execution routing** — Jupiter v6 aggregates the entire Solana DEX landscape for every swap
- **DeFi strategies** — Kamino, Drift, MarginFi, JLP and other yield sources, managed by AI
- **Creator monetization** — traders, influencers and AI developers open Strategy Vaults and earn fees
- **Personal AI voting** — each member can configure an individual AI agent that votes in the group on their behalf

All of it runs on Solana, is open-source, and is auditable from day one.

---

## Infrastructure Positioning

PotBot is **the same infrastructure for a three-person investment club and for a $100M family office**. The protocol doesn't change; the governance parameters do.

| Segment | How PotBot fits |
|---|---|
| **Small enthusiast groups** | A pot with 3–5 friends, L1 governance, $500–5k AUM, AI agent on DCA |
| **DAO sub-treasuries** | A pot managed by a sub-committee, L2 governance, share tokens tradable inside the DAO |
| **Public Strategy Vaults** | Creators launch tokenized strategies; thousands of small investors buy NAV-priced shares |
| **Institutional / family office** | L4 timelock governance, Squads multisig treasury, STAMPPOT privacy, dedicated RPC, institutional-tier fees |

The differentiator: **the best routing (Jupiter), the best yield sources (Kamino/Drift/MarginFi/JLP) and an AI management layer all live inside one programmable vault** — instead of being scattered across five custodial apps, three spreadsheets and a Telegram chat.

---

## Why PotBot Exists

Group trading is one of the oldest human behaviors. The infrastructure has always been bad:

- Chat groups → screenshots, arguments, no accountability
- Spreadsheets → trust required, one person holds the keys
- Traditional funds → regulators, paperwork, gatekeeping
- "Revolut-for-crypto" apps → recreate custodial failure modes on top of blockchain

PotBot replaces all of that with one on-chain primitive — a **pot** — where every rule is enforced by code, every action is a signed transaction, every member sees the same ledger, and AI agents do the heavy lifting on execution and voting.

---

## Six Core Features

### 1. Group Treasury (POT)
Members pool SOL (or USDC) into a shared on-chain vault. The vault is a **program-owned PDA on Solana from day one** — no custodian, no bot-managed wallet, no multisig operator holds the keys. Only the PotBot program can move tokens from the vault, and only after a successful on-chain vote. Each deposit returns NAV-priced shares — at Seedling stage the share accounting is indexed off-chain for efficiency, and graduates to an on-chain SPL mint at Sprout+ (see [Off-Chain → On-Chain Shares Strategy](#off-chain--on-chain-shares-strategy)). **Token custody is always on-chain; only the share-accounting layer is off-chain at the earliest stage.**

### 2. On-Chain Governance with Personal AI Voters
Every meaningful action — a swap, a withdrawal, a parameter change — is a proposal. Members vote with weight proportional to their shares. **The unique feature:** each member can configure a personal AI voting agent that reads proposal context and votes on their behalf according to rules they set (see [Personal AI Voting Agents](#personal-ai-voting-agents)).

### 3. AI Execution (BOT)
Members set conditional rules in plain English — *"if SOL drops 5%, buy 10% more"*, *"every Monday 9am DCA 5% into $JUP"*, *"if PnL > 20% take 30% profit"*. MCP-native agents evaluate these every 60 seconds. When a rule triggers, the agent creates a proposal. **Nothing executes without a vote** — AI suggests, humans (or their delegated AI voters) decide.

### 4. SNS Identity
Each pot receives a readable on-chain identity via Solana Name Service — `amsterdam-alpha.potbot.sol` resolves directly to the pot address, with reverse-lookup enabled.

### 5. Money Tree Evolution
Pots progress through six growth stages. **Season 1 of PotBot uses a plant/tree visual**: Seedling → Sprout → Bud → Bloom → Full Bloom → Mature Tree. Future seasons may introduce different creatures/artifacts with the same underlying mechanic. Health drops as the vault draws down; at zero balance the tree dies and NFT shares burn (see [Money Tree](#money-tree--levels-rules-health)).

### 6. Privacy Layer (STAMPPOT)
Optional ZK-proof integration via PrivacyCash: governance and swaps stay **public on-chain**, but the link between wallet and share balance stays **private**.

---

## How It Works

A three-step flow from zero to first trade:

### Step 1 — Create (30 seconds)
Pick a name, an emoji, a governance level, and a yield strategy. The Anchor program derives PDAs for the pot, the vault (SOL-holding PDA), the member registry, and the proposal log, then initializes them in a single transaction. The share mint is initialized only once the vault graduates from Seedling.

### Step 2 — Deposit
Members send SOL to the vault address. At Seedling, shares are tracked off-chain (indexed from on-chain deposits). At Sprout and above, shares are minted as SPL tokens at NAV:

```
shares_out = sol_in × total_shares / vault_balance
```

Withdrawals are the inverse and always pro-rata — no bank-run dynamic, exiting members only take their share.

### Step 3 — Trade
Members propose swaps via Jupiter (best route, min slippage), or the AI agent does it on a rule. The group votes — manually or through their personal AI voters. If quorum + approval threshold are met within the voting window, the proposal executes via Jupiter v6 CPI. All events are emitted on-chain and streamed to the analytics backend.

---

## Personal AI Voting Agents

This is one of PotBot's **unique features** and a real leap for on-chain governance.

Today, on every DAO, governance suffers from the same problem: most members don't read every proposal, don't have time, don't care about the specifics, and either rubber-stamp or don't vote at all. PotBot fixes this by letting **each member delegate voting to their own personal AI**, configured to their preferences.

### How it works

```
Member opens "My AI Voter" settings
  → picks a template (Conservative / Aggressive / Yield-only / Copy-Alice / Custom)
  → writes rules in plain English:
     "Only vote YES on swaps smaller than 10% of the vault"
     "Vote YES on anything that increases SOL exposure"
     "Vote NO on any proposal that touches stablecoins"
     "Abstain on governance changes — I review those myself"

Member saves and signs a delegation certificate on-chain
  → the PotBot program now accepts votes from the member's AI-agent wallet
     (but only for this specific pot, revocable at any time)

Proposal goes live → AI reads context, checks the rules, casts the vote
Member gets a notification: "Your AI voted YES on Proposal #34 because …"
Member can override / revoke delegation at any time
```

### Why this matters

- **Participation goes up** — the pot hits quorum even when humans are asleep
- **Alignment scales** — a member can have a vastly more sophisticated policy than a chat poll allows
- **Transparency is preserved** — every AI vote is signed on-chain, with a reason string, and auditable
- **Opinion diversity survives** — it's 100 different AIs voting, not one master agent voting for everyone
- **MCP compatibility** — any LLM (Claude, GPT, custom) can serve as the voting brain through the PotBot MCP server

This is the first time in crypto governance where **a human can delegate to an AI that represents only them**, while still keeping their voting power revocable and fully auditable.

---

## Money Tree — Levels, Rules, Health

A pot's Money Tree evolves as the vault matures. In **Season 1**, the visual motif is a plant: it starts as a seed and grows into a tree. Later seasons may introduce different skins (creatures, artifacts, ecosystems) with the same underlying mechanics.

### Six Growth Stages (Season 1 — Plants)

| # | Stage | Unlock thresholds (AUM · Members · Trades) | Unlocks | Swap fee |
|---|---|---|---|---|
| 1 | 🌱 **Seedling** | New pot | Deposit, withdraw, governance, basic Jupiter swap. Shares **off-chain** (indexed) | 0.50% |
| 2 | 🌿 **Sprout** | ≥ $1k AUM · 3+ members · 3+ trades | AI Agent rules, SNS subdomain, share mint graduation (shares → SPL on-chain) | 0.45% |
| 3 | 🌳 **Bud** | ≥ $10k · 5+ members · 10+ trades | Jupiter Limit Orders, Kamino lending strategies, Personal AI Voters | 0.40% |
| 4 | 🌺 **Bloom** | ≥ $50k · 10+ members · 50+ trades | Jupiter DCA, Drift perps, Duel Vaults (1v1), auto-compound | 0.35% |
| 5 | 🌸 **Full Bloom** | ≥ $250k · 25+ members · 200+ trades | NFT Strategy Shares (Metaplex Core), MagicBlock private payouts, Strategy Vault launch | 0.30% |
| 6 | 🌴 **Mature Tree** | ≥ $1M · 50+ members · 500+ trades | Institutional tier — Squads multisig, STAMPPOT privacy, Limit Orders API, dedicated RPC, custom performance fees | 0.20% |

Evolution thresholds are tracked on-chain. A permissionless `update_tamagotchi` / `evolve_tamagotchi` instruction cranks the state forward whenever a tier is earned — anyone can call it, no admin required, gas is tiny.

### Health mechanics — the tree can die

Beyond stage progression, every Money Tree has a **Health stat** (0–100 HP) that tracks how the vault is performing.

```
health = clamp(0, 100, round(100 × current_balance / peak_balance))
```

| Health range | State | Effect |
|---|---|---|
| 90–100 HP | 🟢 **Thriving** | No visual change; full fee discounts apply |
| 50–89 HP | 🟡 **Wilting** | Leaves visibly droop; a warning appears on the pot card |
| 10–49 HP | 🟠 **Sickly** | Tree changes color; governance shows a "risk mode" banner; new high-risk proposals require extra quorum |
| 1–9 HP | 🔴 **Dying** | Tree loses leaves; only defensive proposals (withdraw / convert-to-stable) can pass with reduced quorum |
| 0 HP | ☠️ **Dead** | Vault balance dropped to zero (or dust). Tree visual goes to the withered-stump state. **Trading is locked.** NFT Strategy Shares, if minted (Full Bloom+), are **burned on-chain**. Pot cannot execute any proposal except `resurrect` |

### Death and resurrection

When a tree dies the pot enters a frozen "dead" state. To bring it back, a member must:

1. Call the `resurrect` instruction (any original member can)
2. Deposit fresh capital above the minimum resurrection threshold (enforced by the program)
3. Re-mint the Money Tree — the **stage resets to Seedling**; previous progress is lost
4. If NFT shares were burned, the owners **need to re-mint their NFT shares** by making a new deposit. The cosmetic NFT art is regenerated (new seed), but the underlying on-chain share balance is preserved

### Why these mechanics

The Money Tree is not pure cosmetics — it's a **risk-management primitive dressed up as a game**:

- **Stage** encodes *size and maturity* → unlocks higher-risk tools only after the pot is big enough to handle them
- **Health** encodes *current drawdown* → forces the pot into defensive mode when things go badly, *before* anyone votes on "buy the dip with all of it"
- **Death + resurrection** is the *hard-coded honesty mechanic* → if you blow up the pot, you can't pretend it didn't happen; the on-chain state makes the failure permanent, and rebuilding starts from zero

Season 2 skins can change the art and the copy, but these three primitives (stage, health, death) are part of the core protocol.

---

## Off-Chain → On-Chain Shares Strategy

> **This is about the share *accounting*, not the token custody.** The vault itself — the program-owned PDA holding SOL and SPL tokens — is on-chain from the first deposit, always. What graduates from off-chain to on-chain is the **per-member share ledger**: *how many shares of the pot each wallet owns*.

Pots at **Seedling** track shares **off-chain** (indexed from on-chain deposits, stored in the backend). Pots at **Sprout and above** graduate to an SPL share mint on-chain.

### Why shares are not on-chain from day one

Minting an SPL token on Solana is cheap but not free — ~0.01 SOL of rent per mint account, plus every new holder needs an ATA. For a Seedling pot with 3 members and $500 AUM, that's meaningful overhead on a small vault.

**More importantly, it's a fundraising-friendly design choice.** A pot may eventually decide to launch its own governance/utility token. Keeping Seedling shares off-chain preserves maximum flexibility for that:

- The pot can vote to allocate part of its SOL balance to seed liquidity for a token launch (on Jupiter, Raydium, or a custom pool)
- Off-chain shares can be **converted** to the new token at any ratio the pot decides
- A properly-timed token launch backed by a healthy vault is vastly more successful than a cold-start launch — the pot already has a balance, a history, and members who become day-one holders
- No wasted SPL mint rent on a Seedling pot that may never need one

Once a pot hits Sprout it's clearly operational and the on-chain SPL share mint is initialized automatically. From that moment share minting and transfers are fully composable with the rest of Solana DeFi.

---

## STAMPPOT — Privacy Layer

STAMPPOT is an optional layer built on [PrivacyCash](https://privacycash.org) ZK proofs. It lets a member prove they own a share of the pot **without revealing which wallet holds those shares**.

### What stays public
- Treasury balance (every lamport, always)
- Member count
- Governance proposals and vote tallies
- Every swap and its route
- Historical PnL

### What stays private (when STAMPPOT is enabled)
- Wallet-to-share linkage (who owns what percent)
- Individual deposit timing
- Individual exit amounts

This matters for whales who don't want their position sniped, for groups with sensitive members, and for creators whose strategy depends on not revealing direction. Governance legitimacy is preserved — anyone can still verify the pot's books — while personal exposure is minimized.

---

## SNS Identity

Every pot registers a subdomain on Solana Name Service under `potbot.sol`:

```
alpha-amsterdam.potbot.sol   → 7x8Kp...  (pot address)
defi-chads.potbot.sol        → 9Yh4B...
ai-traders.potbot.sol        → A2vZn...
```

Reverse lookup is enabled, so explorers and wallets can display the human-readable name next to any transaction that touches the pot.

---

## Strategy Vaults — Creator Economy

A **Strategy Vault** is a tokenized DeFi strategy that a creator opens to outside investors. Creators — traders, influencers, or AI agents — define the strategy and its fees; investors buy shares; the AI agent proposes the trades.

```
Creator launches vault → sets entry / performance / management fees
Investors buy in       → receive SPL Strategy Shares (NAV-priced)
AI Agent runs strategy → proposes swaps based on the rule set
Group votes            → executes only if quorum reached (personal AI voters eligible)
Money Tree evolves     → unlocks lower fees, Limit Orders, NFT shares
```

### Fee model

| Fee | Who gets it | Range |
|---|---|---|
| Entry fee | 70% creator · 20% PotBot · 10% referrer | 0 – any |
| Performance fee | Creator + PotBot (only on profit at exit) | 0 – 20% |
| Management fee | Creator (annual on AUM) | 0 – 2% |
| Protocol swap fee | PotBot | 0.20 – 0.50% (Money Tree tier) |

### On-chain referral system
Paid in the same transaction as the entry fee — no claiming, no multi-sig, no off-chain ledger.

- **Level 1 referrer** — 20% of the entry fee
- **Level 2 referrer** — 5% of the entry fee

---

## AI Agent — Autonomous Proposals

Every pot can enable an AI Agent that watches markets and creates proposals automatically.

```
You define rules:
  "If SOL < $120       → propose buying 10% more"
  "Every Monday 9am    → DCA 5% into $JUP"
  "If PnL > +20%       → propose taking 30% profit"
  "If $BONK > 2×       → propose exit"

Agent runs 24/7        → evaluates every rule every 60 seconds
Rule triggers          → creates on-chain proposal
Group votes            → quorum required (personal AI voters participate)
Proposal executes      → Jupiter CPI swap on approval
```

### Supported triggers
`price_above`, `price_below`, `time_interval` (cron), `balance_above`, `balance_below`, `pnl_above`, `pnl_below`

### Supported actions
`propose_swap`, `propose_dca`, `propose_yield_deposit`, `vote_yes`, `alert`

### Strategy presets
- **DCA** — steady accumulation on a schedule
- **Trend-following** — buy breakouts, trail stops
- **Mean reversion** — fade extremes, take profit into retests
- **Yield** — rotate idle capital between Kamino / Drift / JLP
- **Custom** — raw rule builder for power users

Everything the agent does is a proposal. Nothing is bypassable. Humans (or their personal AI voters) stay in the loop.

---

## MCP Server — AI-Native Infrastructure

PotBot is **MCP-native**. Any AI agent — Claude, GPT, custom LLM — can talk to every vault via the PotBot MCP server. Built on top of [solana-agent-kit](https://github.com/sendaifun/solana-agent-kit), it extends the 60+ native Solana actions with PotBot-specific vault management.

### Example tools
```typescript
await mcp.call('list_pots')                           // browse all public vaults
await mcp.call('get_pot_analytics', { pubkey })       // PnL, NAV, APY, Sharpe, health
await mcp.call('create_proposal', { pot, swap })      // propose a trade
await mcp.call('vote_on_proposal', { proposal, yes }) // cast a weighted vote
await mcp.call('configure_personal_voter', { pot, rules }) // set up a personal AI voter
await mcp.call('get_yield_rates')                     // Kamino / Drift / JLP live APY
await mcp.call('join_vault', { vault, referrer })    // enter a Strategy Vault
await mcp.call('get_governance', { pot })             // quorum, thresholds, timelock
await mcp.call('execute_passed_proposal', { pubkey }) // push an executable proposal
await mcp.call('resurrect_pot', { pot })              // bring a dead Money Tree back
```

### Example interaction
> **User:** "Hey Claude, if SOL drops below $130, propose buying 10% more using the vault balance."
>
> **Claude → MCP:** creates an AI Agent rule with trigger `price_below:SOL:130` and action `propose_swap:USDC→SOL:10%`. Members vote (or their personal AI voters vote for them). The proposal executes on approval.

### x402 micropayments
Integrates x402 so agents can pay per API call (0.001 USDC / request). This enables fully autonomous, fee-based agent economies — any agent anywhere can read and write to a PotBot vault without a human in the loop for authentication.

---

## Governance Levels

Every pot picks a level at creation (and can upgrade by proposal).

| Level | Quorum | Approval | Window | Timelock | Ideal for |
|---|---|---|---|---|---|
| L0 — Autocracy | — | admin | — | — | solo traders |
| L1 — Fast Council | 25% | 51% | 4h | — | small trusted groups |
| L2 — Standard | 50% | 51% | 24h | — | public pots (default) |
| L3 — Consensus | 75% | 66% | 48h | — | high-value pots |
| L4 — Timelock | 75% | 66% | 48h | 24h | institutional vaults |

Optional risk caps stacked on any level:

- `maxSwapPct` — no single swap may exceed X% of vault balance
- `maxBudgetGrantPct` — no budget grant may exceed X% of vault balance
- `requireAdminCoSign` — proposals above a threshold need admin co-sign

---

## DeFi Integrations

PotBot is a **routing and strategy aggregator** — not a place that reinvents swap logic or yield logic. It plugs into best-of-breed primitives and lets the pot's governance + AI agent orchestrate them.

| Protocol | What we use it for |
|---|---|
| **Jupiter v6** | All swaps (best route, min slippage), Limit Orders (Bud+), DCA (Bloom+) |
| **Kamino** | Yield strategies (lending APY up to 15%), RWA-backed vaults |
| **Drift** | Perps exposure + lending rates |
| **MarginFi** | Lending/borrowing yield |
| **JLP** | Jupiter Perps LP — delta-neutral yield source |
| **Metaplex Core** | NFT Strategy Shares for Full Bloom+ vaults |
| **MagicBlock** | Private USDC referral payouts (confidential transfers via MCP) |
| **PrivacyCash** | STAMPPOT ZK-proof privacy layer |
| **Privy** | Embedded wallet — join vaults by email, no Phantom needed |
| **MoonPay** | Fiat on-ramp on vault join page |
| **Pyth / Switchboard** | Price oracle fallback |
| **Squads** | Multisig treasury for Mature Tree tier |
| **SNS** | Human-readable `.potbot.sol` subdomains |

---

## Backend & Analytics

The `apps/api` service (Hono.js on Node.js) provides real-time analytics powering all PnL / ROI / APY / Health calculations:

```
Price Oracle   → Jupiter Price API v2 (5-second polling, Redis cache)
PnL Engine     → entry_price × current_price × shares → unrealized/realized PnL
APY Engine     → annualized from 30d performance: (1 + pnl_30d)^(365/30) - 1
Health Engine  → current_balance / peak_balance → Money Tree HP
Yield Aggreg.  → Kamino + Drift + JLP APY pulled every 15 minutes
Agent Cron     → evaluates AI rules every 60s, creates on-chain proposals
Voter Cron     → reads new proposals, runs each member's personal AI voter
Crank Service  → management fees, AUM snapshots, Money Tree evolution, NFT burns on death
```

### Per-vault metrics exposed via API

- NAV — Net Asset Value (vault_balance / total_shares)
- PnL — 24h / 7d / 30d / all-time
- APY — annualized estimate
- Health — current HP (0–100)
- Sharpe ratio, max drawdown
- Win rate (% profitable trades)
- Total volume (USD)

### Public REST endpoints

- `GET /price/:mint` — live token price, cached
- `GET /pots/:pubkey/analytics` — full analytics bundle incl. Health
- `GET /pots/leaderboard` — public pots ranked by PnL, AUM, etc.
- `POST /agent/evaluate` — manual tick of the agent cron
- `POST /voter/evaluate` — manual tick of the personal-voter cron

---

## On-chain Program — Instructions

### Core vault (`pot_vault`)

| Instruction | Description |
|---|---|
| `create_pot` | Create a group vault with governance settings |
| `deposit` | Deposit SOL → receive proportional shares (off-chain indexed at Seedling) |
| `withdraw` | Burn shares → receive proportional SOL |
| `create_proposal` | Create a governance proposal (swap / withdraw / settings) |
| `vote` | Vote yes/no, weighted by shares at snapshot |
| `delegate_vote` | Register a personal AI voter wallet for this pot |
| `revoke_delegation` | Revoke personal AI voter delegation |
| `execute_proposal` | Execute a proposal that passed |
| `execute_swap` | Execute a Jupiter swap from the vault (CPI) |
| `init_share_mint` | Graduate shares from off-chain to on-chain SPL mint (at Sprout) |
| `update_tamagotchi` | Permissionless crank to evolve the Money Tree stage + health |
| `resurrect_pot` | Bring a dead pot back — resets to Seedling, burns old NFT shares |

### Strategy Vault

| Instruction | Description |
|---|---|
| `create_strategy_vault` | Tokenize a strategy with fee config |
| `join_strategy_vault` | Join, pay entry fee, register referral |
| `exit_strategy_vault` | Exit, pay performance fee on profit |
| `evolve_tamagotchi` | Permissionless — evolve if thresholds met |

### Duel (`pot_duel`) — unlocks at Bloom+

| Instruction | Description |
|---|---|
| `open_duel` | Create a 1v1 duel vault with stake and end-time |
| `accept_duel` | Opponent deposits matching stake |
| `settle_duel` | Winner takes the pot, losers get a gas refund |

### PDAs

```typescript
getPotAddress(name, authority)        // ["pot", name, authority]
getVaultAddress(potPubkey)            // ["vault", potPubkey]
getMemberAddress(potPubkey, wallet)   // ["member", potPubkey, wallet]
getProposalAddress(potPubkey, id)     // ["proposal", potPubkey, id_bytes]
getVoterDelegationAddress(pot, voter) // ["voter", potPubkey, member]
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Blockchain | Solana · Anchor 0.30.1 · SPL Token |
| Smart Contracts | Rust · Anchor · CPI (Jupiter, SPL) |
| Price Oracle | Jupiter Price API v2 · Pyth Network |
| DEX / Swaps | Jupiter v6 (Swap + Limit Orders + DCA) |
| DeFi Yield | Kamino · Drift · MarginFi · JLP |
| NFT | Metaplex Core (Strategy Shares) |
| Privacy | PrivacyCash ZK (STAMPPOT) |
| Frontend | Next.js 14 · TypeScript · Tailwind CSS |
| State | Zustand · TanStack Query v5 |
| Wallets | Phantom · Privy (embedded) · WalletConnect |
| Backend | Hono.js · Node.js · PostgreSQL · Redis |
| MCP | solana-agent-kit · @modelcontextprotocol/sdk |
| Payments | x402 (AI micropayments) · MagicBlock (private) |
| Fiat On-ramp | MoonPay |
| Multisig | Squads (Mature Tree tier) |
| Monorepo | Turborepo · npm workspaces |
| Deploy | Vercel (web + api) · GitHub Actions |

---

## Revenue Model

Honest unit economics, no token speculation:

- **Protocol swap fee** — 0.20–0.50% on every swap (Money Tree tier discounts apply)
- **Performance fee** on Strategy Vaults — up to 20%, **split** between creator and protocol
- **Management fee** (0–2% annual) — flows entirely to the creator
- **Entry fee split** — 70% creator / 20% PotBot / 10% referrer
- **x402 micropayments** — 0.001 USDC per MCP API call for autonomous agents
- **Institutional tier** — custom fee bundles at Mature Tree level (dedicated RPC, STAMPPOT, Squads multisig support)

No token. No airdrop farming. No governance token voting on emissions schedules. Fees go to the protocol treasury and to creators; that's it.

---

## Why Crypto / Why Now

### Why crypto
Shared custody without a trusted intermediary is the unique primitive only a blockchain provides. Any database-based "group trading" app recreates Revolut-style failure modes: a single operator controls the keys, freezes accounts, gets hacked, or runs out of runway. PotBot's vault is a PDA — no one can freeze it, no one can seize it, no one can change the rules without a vote.

### Why now
Three independent trends make agent-driven group trading suddenly viable:

- **MCP** — finally a standard for LLM ↔ system integration. Any agent can now use any tool.
- **Solana** — 65k TPS means on-chain voting + swap + yield in sub-second windows.
- **Jupiter + Pyth** — routing and price oracles at the level needed for trusted execution.

One year ago the stack was not ready. Today it is.

---

## PotBot v1 vs v2

PotBot has two generations of product, and they currently run **independently** — they do not share state, users, or on-chain accounts.

| | **v1 — Telegram Group Trading Bot** | **v2 — Solana DApp + MCP** |
|---|---|---|
| Codebase | [`YD811/potbot_test`](https://github.com/YD811/potbot_test) (private) | [`YD811/potbot-v2`](https://github.com/YD811/potbot-v2) (public) |
| Interface | Telegram native | Web DApp (Next.js) + MCP server + Telegram frontend (WIP) |
| Custody | Custodial-style (bot-mediated) | Non-custodial (Solana PDA vault) |
| Shares / accounting | Off-chain DB | Off-chain at Seedling, on-chain SPL at Sprout+ |
| Governance | In-Telegram polls, off-chain | On-chain proposals + personal AI voters |
| Swaps | Jupiter API from bot-managed wallet | Jupiter CPI from vault PDA |
| AI | Limited preset strategies | Full AI Agent (rules engine + MCP) + Personal Voters |
| Solana program | None in the v1 codebase (TBD — to be confirmed by repo owner) | Custom Anchor programs: `pot_vault`, `pot_duel` |

> ⚠️ **Internal note:** v1 on-chain details (whether there's any Anchor program at all in `potbot_test`, or whether it's purely off-chain Jupiter-API integration) are currently not independently verifiable from public sources — the repo is private. Update this section once the repo is made public or an internal audit confirms.

### Important implications

- A "pot" in v1 Telegram and a "pot" in v2 are **different entities**. There is no automatic mapping.
- The two products are currently not synchronized — state, PnL, and member lists live in separate systems.
- Users of v1 must explicitly re-onboard to v2; their positions do not carry over automatically.
- v2 has an `apps/bot/` folder which is the **future v2 Telegram frontend** — not the v1 bot. It uses the v2 SDK to talk to the v2 Anchor program.

### Migration path (planned)

- **Phase 1 (current)** — v2 runs independently; v1 continues as a separate product
- **Phase 2 (post-mainnet)** — data migration tool: map v1 users → v2 members, import referral tree
- **Phase 3** — deploy v2 Telegram frontend (`apps/bot`) as the official PotBot Telegram interface, running side-by-side with v1 (or replacing it)
- **Phase 4** — sunset v1 custodial bot; any remaining balances are offered migration to v2 pots

### If v1 has a Solana program — can we port it?

- If v1's program has overlapping functionality (vault, shares, governance), the v2 Anchor program already covers it. No porting needed; **migrate data + deprecate v1 program**.
- If v1 has a unique primitive not in v2 (e.g. a perps-specific vault), that primitive can be lifted into a **new sibling program** under `packages/program/programs/` in the v2 monorepo, sharing PDAs and CPI patterns.
- Decision owner: repo owner (YD) after audit of `potbot_test`.

---

## Roadmap & Current Status

### Status (April 2026)

| Component | Status |
|---|---|
| Anchor `pot_vault` core | ✅ Complete |
| Strategy Vault on-chain | ✅ Complete (create/join/exit/evolve + referral) |
| TypeScript SDK | ✅ Complete |
| Next.js DApp | ✅ Complete (demo + on-chain modes) |
| `/vaults` discovery page | ✅ Complete |
| `/vaults/create` wizard | ✅ Complete (5-step) |
| AI Agent UI + API sync | ✅ Complete (rules engine, 60s cron) |
| Governance + proposals | ✅ Complete (shares-weighted voting) |
| Leaderboard | ✅ Complete (USD TVL, PnL%, APY30d) |
| Backend API (`apps/api`) | ✅ Complete |
| MCP Server (`apps/potbot-mcp`) | ✅ Complete (15+ tools) |
| Devnet deploy | ✅ Complete |
| Production analytics | ✅ Complete |
| Pitch deck | ✅ Complete (11 slides, Solana Frontier 2026) |
| Jupiter swap CPI (real) | 🔴 Blocker — needs executor wallet |
| E2E devnet test | 🟡 Next — after executor wallet funded |
| **Personal AI Voters** | 🟡 Design complete, implementation Q3 2026 |
| **Money Tree Health + death** | 🟡 Schema ready, UI pending |
| **Off-chain → on-chain share graduation** | 🟡 Spec ready, implementation Q2 2026 |
| Kamino/Drift yield aggregation | 🟢 Planned (post-hackathon) |
| Demo video | 🟢 Planned (May 6–8) |
| Hackathon submission | 📅 May 11 — [colosseum.com/frontier](https://colosseum.com/frontier) |
| STAMPPOT privacy layer | 🟢 Planned (post-mainnet) |
| v2 Telegram frontend | 🟢 Planned (Q3 2026) |
| Mainnet cutover | 🟢 Planned (Q3 2026) |
| v1 → v2 data migration tool | 🟢 Planned (Q4 2026) |

### Short roadmap

- **April–May 2026** — Solana Frontier 2026 submission, devnet hardening, demo video
- **Q2 2026** — Off-chain → on-chain share graduation, Money Tree Health UI
- **Q3 2026** — Mainnet cutover, Squads multisig treasury, Personal AI Voters v1, STAMPPOT v1, v2 Telegram frontend
- **Q4 2026** — Duel Vaults public launch, NFT Strategy Shares, v1 → v2 migration tool
- **2027** — Cross-chain via Wormhole, institutional Mature Tree tier with custody partners

---

## Links & Resources

### Product
- 🏠 Landing & DApp — [potbot.fun](https://potbot.fun)
- 🤖 Telegram Bot (v1) — separate legacy product, not synced with v2
- 🌐 SNS — `potbot.sol`

### Community
- Twitter — [@PotBot_sol](https://twitter.com/PotBot_sol)
- Founder — [@CryptoYDao](https://twitter.com/CryptoYDao)
- Y-DAO Amsterdam

### Code
- v2 Repo — [github.com/YD811/potbot-v2](https://github.com/YD811/potbot-v2)
- v1 Repo — [github.com/YD811/potbot_test](https://github.com/YD811/potbot_test) (private)
- MCP Server — [`apps/potbot-mcp`](https://github.com/YD811/potbot-v2/tree/main/apps/potbot-mcp)
- Anchor Programs — [`packages/program`](https://github.com/YD811/potbot-v2/tree/main/packages/program)
- SDK — [`packages/sdk`](https://github.com/YD811/potbot-v2/tree/main/packages/sdk)

### Deep dives (inside this repo)

| Doc | Topic |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, key decisions |
| [PROGRAM.md](PROGRAM.md) | Anchor program: accounts, instructions, PDAs |
| [GOVERNANCE.md](GOVERNANCE.md) | Voting mechanics, levels, risk caps |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup, commands, troubleshooting |
| [DEPLOY.md](DEPLOY.md) | Devnet → mainnet deployment procedure |
| [MAINNET_CUTOVER.md](MAINNET_CUTOVER.md) | Mainnet migration checklist |
| [MOCK_MODE.md](MOCK_MODE.md) | Demo mode architecture |
| [ETF_TOKEN_SYSTEM.md](ETF_TOKEN_SYSTEM.md) | Strategy Share token economics |
| [SQUADS_MULTISIG_SETUP.md](SQUADS_MULTISIG_SETUP.md) | Treasury multisig configuration |
| [HACKATHON_SUBMISSION.md](HACKATHON_SUBMISSION.md) | Solana Frontier 2026 submission draft |
| [SPONSORS.md](SPONSORS.md) | Sponsor track bounty plan |

---

## License

MIT © 2026 Y-DAO Amsterdam — Built with ❤️ for Solana Frontier 2026.
