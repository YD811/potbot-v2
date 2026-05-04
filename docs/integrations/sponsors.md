# PotBot v2 — Sponsor Strategy & Integration Rationale
### Solana Frontier 2026 Hackathon

> **Why we chose these sponsors, what we built, why it matters for group trading vaults.**

---

## 🏆 Sponsor Overview

| Sponsor | Prize Pool | What We Built | Fit Score |
|---------|-----------|---------------|-----------|
| **Jupiter** | $10,000 | Swap V2 + Trigger Orders + DCA Proposals + DX Report | ⭐⭐⭐⭐⭐ |
| **Dune SIM** | $5,000 | Real-time portfolio analytics & leaderboard data | ⭐⭐⭐⭐⭐ |
| **Umbra** | $5,000 | Private Vault Mode — confidential deposits & governance | ⭐⭐⭐⭐⭐ |
| **SNS** | $5,000 | `{potname}.potbot.sol` — every vault gets an identity | ⭐⭐⭐⭐ |
| **Encrypt / Ika** | $10,000 | FHE-encrypted governance — vote weights stay private | ⭐⭐⭐⭐ |

---

## 🟢 Jupiter — The Trading Engine of PotBot

### Why Jupiter?

PotBot is fundamentally a **group trading vault**. Governance decisions culminate in swaps executed on behalf of all members. Jupiter is the deepest liquidity aggregator on Solana — there was no alternative that makes sense. We already used Jupiter v6 for basic swaps; this hackathon was our opportunity to go deeper and unlock the full product potential.

### What We Built

**1. Jupiter Swap V2 (New Unified API)**
- Migrated from the old `/quote` → `/swap` two-step flow to the new unified `/order` → `/execute` API
- Benefits: single round-trip, better error handling, unified slippage, cheaper for users
- Every governance-approved swap in PotBot now uses Swap V2

**2. Trigger Orders (Limit Orders via Jupiter Trigger API)**
- Members can now propose **Limit Order Proposals**: "Buy 10 SOL of JUP when JUP hits $0.85"
- Proposals go through normal governance voting — if approved, the AI agent submits the limit order to Jupiter Trigger
- Orders are tracked in the Governance tab with real-time fill status
- This is the first DApp enabling **democratically-approved limit orders** on-chain

**3. DCA Proposals (Recurring Orders via Jupiter Recurring API)**
- Members can propose a **DCA strategy**: "Invest 20 SOL into BTC over 10 daily purchases of 2 SOL"
- After governance approval, the AI agent sets up a Jupiter DCA order on behalf of the vault
- Perfect for conservative pots that want systematic, low-emotion accumulation
- Creates a new proposal type: `DCA: 2 SOL → BTC × 10 days`

**4. Portfolio Value via Jupiter Price API v2**
- Every token holding in the vault is priced in real-time using `/price/v2`
- The Holdings tab shows live USD value for every position
- Leaderboard TVL reflects true mark-to-market value, not just SOL deposits

### Why It Matters

- **Jupiter is PotBot's execution layer.** Every trade the group votes on goes through Jupiter.
- Limit orders and DCA transform PotBot from "reactive" to "strategic" — the pot can execute a thesis over days/weeks, not just now.
- The DX integration (see `docs/integrations/jupiter-dx-report.md`) documents our developer experience to help Jupiter improve their APIs.

### Technical Implementation

```typescript
// New Swap V2 endpoints
POST https://api.jup.ag/swap/v2/order     // replaces /v6/quote + /v6/swap
POST https://api.jup.ag/swap/v2/execute   // unified execution

// Trigger API (Limit Orders)
POST https://api.jup.ag/limit/v2/createOrder
GET  https://api.jup.ag/limit/v2/orders?wallet={pubkey}

// Recurring API (DCA)
POST https://api.jup.ag/dca/v2/createDca
GET  https://api.jup.ag/dca/v2/dca?wallet={pubkey}

// Price API v2 (already integrated)
GET  https://api.jup.ag/price/v2?ids={comma-separated-mints}
```

---

## 📊 Dune SIM — Real-Time Blockchain Analytics

### Why Dune SIM?

Leaderboards are only as good as the data behind them. Before Dune SIM, our leaderboard was powered by mock data — a necessary demo shortcut, but not impressive to judges. Dune SIM provides production-grade **real-time Solana data** via a simple API: wallet balances, token holdings, transaction history, and portfolio values.

### What We Built

**1. Live Wallet Balances on Leaderboard**
- Each public pot's SOL balance is fetched from Dune SIM, not just stored in our mock store
- Updates every 30 seconds — the leaderboard stays current without polling the RPC

**2. Token Portfolio Analytics**
- Each vault's token holdings (JUP, WIF, BONK, etc.) are fetched with USD values from Dune SIM
- The Holdings tab shows a real breakdown of the vault's portfolio — what the group actually owns

**3. Transaction History for PnL Tracking**
- Dune SIM's transaction history API feeds PotBot's PnL engine
- We can calculate realized gains/losses per proposal execution
- The PnL Dashboard shows accurate performance data per trade

**4. Global Stats Widget**
- The leaderboard header shows aggregate stats: total TVL across all PotBot vaults, total volume traded, total members — all sourced from Dune SIM in real-time

### Why It Matters

- **Trust through transparency.** Users can see that vault balances are real, sourced from the blockchain — not a number we made up.
- **Analytics = confidence.** Members can see how the pot performs versus their expectations before joining.
- Dune SIM makes PotBot production-ready: a real analytics layer, not a demo.

### Technical Implementation

```typescript
// Dune SIM API
const DUNE_SIM_BASE = 'https://api.sim.dune.com/v1'

// Wallet SOL balance
GET /evm/balances/{address}?chain=solana    // returns SOL + token balances

// Token holdings with USD values
GET /solana/balances/{address}              // SPL token portfolio

// Transaction history
GET /transactions/{address}?chain=solana   // for PnL computation
```

---

## 🔒 Umbra — Private Vault Mode

### Why Umbra?

Privacy is PotBot's narrative edge. Group trading vaults expose a fundamental tension: members want transparency within the group, but not to the entire blockchain. Sophisticated traders don't want their strategies front-run; whale members don't want their positions watched. Umbra gives us **confidential transfers and private balances on Solana** — exactly what high-conviction groups need.

### What We Built

**1. Private Vault Mode Toggle**
- When creating a pot, founders can enable "Private Vault Mode" (Umbra-backed)
- In private mode: deposits are confidential (amount hidden on-chain), withdrawals are private, swap amounts are obfuscated
- Public identifier stays the same; only financial amounts are private

**2. Private Deposits**
- Members depositing into a private vault use Umbra's `shieldedTransfer` instead of a regular SOL transfer
- The amount is committed on-chain as a Pedersen hash — visible that a deposit happened, not how much

**3. Governance with Hidden Stakes**
- In private vaults, voting weight is verified via zero-knowledge proof — you prove you have enough shares to vote without revealing your exact stake
- Prevents large members from being targeted or manipulated based on their position size

**4. Private Swaps (via Umbra + Jupiter)**
- When a swap proposal executes in a private vault, Umbra wraps the amount before passing to Jupiter
- Trade size is hidden — MEV bots can't front-run based on observed amounts

### Why It Matters

- **Privacy is a product differentiator.** Most DeFi protocols are fully transparent; PotBot's private mode is a unique offering for professional or high-stakes groups.
- **Protects members from MEV.** When the vault's upcoming trades are visible on-chain, sophisticated actors exploit that. Private mode eliminates this.
- **Enterprise-grade.** High-net-worth groups, hedge funds, and DAOs need privacy to operate without telegraphing their strategies.

### The Narrative

> "PotBot Private: Trade together without showing your hand."

This positions PotBot not just as a group trading tool but as **infrastructure for serious capital coordination** — the kind that moves real money and needs real privacy.

### Technical Implementation

```typescript
// Umbra SDK integration
import { UmbraSDK } from '@umbra/sdk-solana'

const umbra = new UmbraSDK({ network: 'devnet' })

// Private deposit
await umbra.send(recipientStealthAddress, amount, token)

// Withdraw privately
await umbra.withdraw(announcement, receiver)

// Generate stealth address for vault
const stealthAddr = umbra.generateStealthAddress(vaultPublicKey)
```

---

## 🌐 SNS (Solana Name Service) — Every Vault Gets an Identity

### Why SNS?

We already own the `potbot.sol` domain. The killer UX insight: every group trading vault should have a **human-readable address** instead of `5Gh7...mK3p`. When you invite someone to join your pot, you send them to `alphateam.potbot.sol` — not a 44-character public key. This is table-stakes UX for mainstream adoption.

### What We Built

**1. Automatic Subdomain Registration**
- When a pot is created with a unique name, we register `{potname}.potbot.sol` via SNS
- The subdomain resolves to the pot's vault public key
- Fallback: if taken, the UI suggests alternatives like `{potname}2.potbot.sol`

**2. Shareable Pot Links**
- Pot pages now display `alphateam.potbot.sol` prominently
- Share button copies the SNS link, not the raw pubkey
- QR codes point to the SNS-resolved address

**3. AI Agent Identity**
- The pot's AI agent gets `agent.{potname}.potbot.sol`
- Future: members can send tips/feedback transactions directly to the agent's address

**4. SNS Profile on Pot Page**
- The pot detail page shows the SNS name as the primary identifier
- Members are also looked up via SNS: if a member has a `.sol` name, it's shown instead of their truncated public key

### Why It Matters

- **UX = adoption.** No mainstream user will share `5Gh7BnMdLk...mK3p`. They will share `moonboys.potbot.sol`.
- **Brand coherence.** Potbot owns the namespace. Every vault becomes part of the PotBot ecosystem identity.
- **Social layer.** SNS names are discoverable — people can find pots by searching `.potbot.sol` names.

### Technical Implementation

```typescript
// SNS SDK
import { resolve, register, getSubdomains } from '@bonfida/spl-name-service'

// Resolve name to pubkey
const vaultPubkey = await resolve(connection, 'alphateam.potbot.sol')

// Register subdomain (requires potbot.sol parent)
await register(connection, wallet, 'alphateam', 'potbot.sol', vaultPubkey)

// Reverse lookup (pubkey → name)
const domainName = await getSubdomains(connection, vaultPubkey)
```

---

## 🔐 Encrypt / Ika — FHE-Encrypted Governance

### Why Encrypt & Ika?

The highest-stakes prize ($10,000), and the most technically challenging. Fully Homomorphic Encryption (FHE) allows computation on encrypted data — meaning vote weights can be tallied **without ever decrypting individual votes**. Combined with Ika's MPC custody, we get governance that is both private and auditable. This is the future of DAO voting.

### What We Built

**1. Encrypted Ballot Casting**
- Members encrypt their vote (yes/no + share weight) using the pot's Ika-managed public key
- Encrypted ballots are stored on-chain — no one, not even the vault authority, can see individual votes
- Tally is computed using FHE: the result reveals only yes-total vs no-total, not who voted what

**2. MPC-Backed Proposal Execution**
- High-stakes proposals (swaps above a threshold) require Ika MPC co-signing
- This adds a fraud-prevention layer: even if the vault private key is compromised, Ika's MPC nodes must approve the transaction
- Implements the "require admin co-sign" governance option at the protocol level

**3. Confidential Governance for Private Vaults**
- When combined with Umbra's private vault mode, governance becomes fully private:
  - Vote weights hidden (FHE)
  - Deposit amounts hidden (Umbra)
  - Swap amounts hidden (Umbra + Jupiter private mode)

### Why It Matters

- **Institutional-grade.** FHE governance means PotBot can serve funds that legally require vote privacy.
- **No whale intimidation.** When votes are private, smaller members aren't pressured by knowing how whales voted before them.
- **Pioneering.** Very few Solana DApps have implemented FHE. This is a genuine technical differentiator.

### Technical Implementation

```typescript
// Ika MPC + FHE integration
import { IkaClient } from '@ika-network/sdk'

const ika = new IkaClient({ endpoint: 'https://api.ika.network' })

// Encrypt a vote
const encryptedVote = await ika.encrypt({
  value: { vote: 'yes', weight: memberShares },
  publicKey: potFhePublicKey,
})

// FHE tally (runs on Ika network, result is decrypted only at the end)
const result = await ika.tallyVotes(encryptedVotes, potFhePublicKey)
// result: { yes: number, no: number } — individual votes never exposed
```

---

## 🎯 Combined Story: The Vision

Each sponsor integration works together to create PotBot's full value proposition:

```
Jupiter          → Execute trades at best price
Dune SIM         → Know your portfolio's true value  
Umbra            → Trade without showing your hand
SNS              → Share your vault with a human name
Encrypt / Ika    → Govern without revealing your position
```

Together, these create **PotBot Private** — a group trading vault that is:
- **Transparent internally** (members see everything)
- **Private externally** (blockchain sees nothing sensitive)
- **Democratically governed** (every trade, every strategy, voted on)
- **Best-execution** (Jupiter aggregation at every swap)
- **Analytically sound** (Dune SIM powering every dashboard)

This is the infrastructure that serious capital coordination on Solana has been missing.

---

## 📊 Prize Target Summary

| Sponsor | Target Prize | Key Deliverable |
|---------|-------------|------------------|
| Jupiter | $10,000 | Swap V2 + Trigger + DCA + DX Report |
| Encrypt/Ika | $10,000 | FHE governance + MPC co-sign |
| Dune SIM | $5,000 | Portfolio analytics + leaderboard |
| Umbra | $5,000 | Private vault mode end-to-end |
| SNS | $5,000 | `{name}.potbot.sol` subdomains |
| **Total target** | **$35,000** | All 5 integrations shipped |

---

*Document version: Solana Frontier 2026 — April 2026*
*Prepared by: PotBot team (YD811)*
