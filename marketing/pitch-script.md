# PotBot — 5-Minute Pitch Script
**EasyA Amsterdam · Kickstart $10K Grant · Saturday**

---

## ⚡ 30-SECOND ELEVATOR PITCH (for networking / hallway conversations)

> "PotBot is collective trading vaults on Solana.
> Imagine your friend group wants to trade crypto together — today there's no on-chain infrastructure for that.
> We built POTs: shared vaults with configurable governance, Jupiter swaps with member voting, and Tamagotchi mascots that grow from your trading XP.
> The killer feature is POT Duels — two vaults challenge each other, spectators bet on the outcome, and everything settles on-chain automatically.
> It's group DeFi as a sport, distributed through Telegram.
> We're applying for the $10K Kickstart grant to get to mainnet."

*(Time it: 28–32 seconds. End on "Kickstart grant" not "mainnet" if they're a judge.)*

---

## BEFORE YOU START

- Have the deck open on slide 1 (title)
- Demo tab ready: localhost:3000/dashboard (or vercel preview)
- Telegram bot open on phone with @PotBotV2Bot
- Keep it under 5 minutes — they have many pitches

---

## SLIDE 1 — HOOK (30 seconds)

> "Raise your hand if you've ever tried to trade crypto together with friends."

*(pause)*

> "And raise your hand if it went smoothly."

*(let the awkward silence land)*

> "Right. That's the problem.
> I'm Yehor, I'm building PotBot — collective trading vaults on Solana.
> The infrastructure that makes group trading not a disaster."

---

## SLIDE 2 — PROBLEM (45 seconds)

> "Here's what group trading looks like today:

> One person holds the bag. Everyone trusts them — until they don't.
> Swaps get decided in a Discord thread that half the group doesn't read.
> There's no on-chain record of who voted for what, who rage-sold, who approved.

> There's no shared primitive for this on Solana.
> Friends, guilds, DAOs — they're all doing ad-hoc multisigs or trusting one wallet.
> That's not DeFi. That's just Venmo with extra steps."

---

## SLIDE 3 — SOLUTION (45 seconds)

> "PotBot solves this with a POT.

> A POT is a programmable collective vault — a PDA on Solana that your whole group controls.
> You deposit funds. You get shares proportional to your contribution.
> No trade executes without member approval.

> One vault. One crew. One on-chain identity.

> Think of it as the group chat — but on-chain, with money, and with rules."

---

## SLIDE 4 — HOW IT WORKS (45 seconds)

> "Three steps:

> First, you **create** a POT. Deploy the vault, pick your governance level, invite your crew.

> Second, members **pool** in. Everyone deposits. Shares are minted on-chain.
> Non-custodial — the program controls the vault, not any single wallet.

> Third, you **trade**. Anyone proposes a swap. Members vote. If approved, Jupiter executes it on-chain.
> The whole flow — from proposal to execution — is fully on-chain and auditable."

---

## SLIDE 5 — GOVERNANCE (30 seconds)

> "The governance is configurable.

> L0 is autocracy — the founder decides, instant execution.
> L4 is full consensus — everyone must agree.
> Anything in between.

> Your degeneracy level, your rules.

> This is the key insight: different groups need different trust models.
> A group of three friends doesn't need DAO governance.
> A 50-member trading guild does."

---

## SLIDE 6 — TELEGRAM (30 seconds)

> "Distribution is Telegram.

> 2.9 billion monthly active users.
> Crypto Twitter is loud. Telegram is where people actually trade.

> With PotBot, you link your Solana wallet via deep-link — no custodial key, ever.
> `/pot` shows your live vault balances.
> `/swap 10 SOL JUP` creates a governance proposal in two seconds.

> Your group never has to leave Telegram to manage collective positions."

---

## SLIDE 7 — POT DUELS (45 seconds)  ← **THE VIRAL HOOK — deliver this with energy**

> "But here's where it gets interesting.

> POTs can challenge each other.

> Picture this: 'Amsterdam DeFi Gang' challenges 'Berlin Apes' — stake 5% of their vault.
> Both POTs vote to accept. The duel runs for 48 hours.
> Whoever generates better returns on a swap wins the stake.

> And the kicker? Spectators can bet on the outcome.
> Any Telegram user can place a side bet — SOL goes into on-chain escrow.
> When the duel settles, winners split the pot automatically.

> This is group DeFi as sport.
> It's viral by design — your Telegram group debates the duel,
> friends pile in side bets, the winner posts their Tamagotchi levelling up.

> All of this is on-chain. Fully permissionless. Already built."

---

## SLIDE 8 — TRACTION / BUILT (25 seconds)

> "Two weeks in. Here's what's shipped:

> Two Anchor programs: pot_vault for governance and trading,
> pot_duel for challenges, side bets, and permissionless settlement.
> Full Next.js frontend. Telegram bot with live RPC. Clean monorepo.

> The architecture is production-ready. We're not building a demo — we're building a protocol."

---

## SLIDE 9 — MARKET (20 seconds)

> "2.1 trillion dollars traded in crypto last year.
> 85 million DeFi wallets. 40 million Telegram crypto users.

> Group trading has no dedicated infrastructure.
> POT Duels have no precedent on-chain.
> We're building the picks and shovels for the next wave of collective DeFi."

---

## SLIDE 10 — THE ASK (30 seconds)

> "We're applying for the $10K Kickstart grant.

> Here's where it goes:
> $2K — mainnet deploy and RPC infrastructure.
> $5K — Tamagotchi animations, duel UI, mobile UX.
> $3K — builder community and hackathon presence.

> Solana is the only chain fast enough for this.
> Governance decisions can't wait. Duel settlements can't wait.

> We're shipping daily. We'd love EasyA behind us.

> PotBot. github.com/YD811/potbot-v2. Thank you."

---

## Q&A — EXPECTED QUESTIONS

**"How is this different from a multisig?"**
> "Multisigs require N-of-M keys to sign any transaction. They have no concept of shares, no proportional voting, no governance levels, no history. A POT is a full DeFi primitive — configurable governance, on-chain voting records, share issuance, yield routing. It's Gnosis Safe vs a full DeFi protocol."

**"Why Solana and not EVM?"**
> "Two reasons: speed and cost. Governance proposals need fast finality — you can't wait 30 seconds per vote. And gas on L1 EVM makes micro-governance actions impossible. On Solana, a full governance cycle costs fractions of a cent."

**"What's the business model?"**
> "Protocol fee on executed swaps — 10-20bps taken from Jupiter volume routed through POTs. The more a POT trades, the more it earns for the protocol. Same model as GMX, Drift. We align incentives: POT Tamagotchis grow when they trade, which drives volume, which drives fee revenue."

**"How do you prevent a whale member from dominating votes?"**
> "Two ways: governance level configuration (L4 requires 100% agreement regardless of share size), and configurable vote weighting. By default it's one-member-one-vote; weighted mode switches to proportional. The POT creator sets the rules at creation time."

**"What happens if someone tries to rug the group?"**
> "The vault is non-custodial — no single wallet has authority over the funds. Every outflow (swap, withdrawal) goes through the governance program. Even the authority account can't bypass the rules it set at creation. The program is the custodian."

**"Is the code audited?"**
> "It's a hackathon — not yet. Audit is on the roadmap post-mainnet. The code is open source at github.com/YD811/potbot-v2. We'd love review from anyone who wants to dig in."

---

## TIMING GUIDE

| Section | Target |
|---------|--------|
| Hook + Problem | 1:15 |
| Solution + How it works | 1:30 |
| Governance + Bot | 1:00 |
| **POT Duels** | **0:45** |
| Built + Market + Ask | 1:15 |
| **Total** | **5:45** *(trim Governance to 20s if needed)* |

---

## BODY LANGUAGE NOTES

- Make eye contact during the "raise your hand" moment — it creates connection
- Slow down on "One vault. One crew. One on-chain identity." — it's the tagline
- Speed up slightly through the "what's built" slide — this is proof, not the hero
- End with full eye contact on the ask — don't look at the screen
