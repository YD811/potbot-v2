# PotBot — Platform Improvement Recommendations

> Derived from: Colosseum winner-pattern analysis, competitive landscape (Squads / Realms / Drift / AI hackathon winners), product-review skill heuristics, and the existing PotBot codebase audit.
> Snapshot date: 2026-04-25.
> Scope: things to ship to make PotBot meaningfully better as a platform — not a hackathon to-do list.

The recommendations are split into **High-leverage now** (ship before submission), **Post-hackathon Q2-Q3 2026**, and **Defensive don't-do**.

---

## High-leverage now (before 2026-05-11)

These are 1-2 day each, low-risk, high judging-criteria value.

### A. Onboarding flow — "What is a pot?" 60-second tour
**Problem:** new visitors land on potbot.fun and must infer the model from leaderboard + create-pot flow.
**Fix:** modal-based tour on first visit (or `?tour=1` query param). Five frames: (1) "Your friends pool money", (2) "Custody is on-chain", (3) "You vote on every trade", (4) "Or delegate your seat to an AI", (5) "Money Tree grows or dies". Each frame has one screenshot.
**Why it matters:** judges weight "UX" ~20%. First impression is currently a leaderboard, not a story.
**Scope:** ~4 hours; one component + 5 stock images. No backend.

### B. AI Rules wizard in Delegate sub-tab
**Problem:** today, registering a delegate requires the member to write JSON rules manually and host them on Arweave. UX wall.
**Fix:** in the Delegate sub-tab, add a "Use a preset" wizard: 3 presets (Conservative / Balanced / Yield-seeking), each generates a JSON template with risk caps and example trigger conditions. User clicks "Upload to Arweave" → web3.storage → URI prefilled in the register form.
**Why it matters:** Personal AI Voters is the central differentiator; if it requires a CLI to use, the demo lands flat. This is the single biggest UX gap.
**Scope:** ~1 day. Web3.storage integration is straightforward.

### C. Risk caps visualization on pot detail page
**Problem:** `single_swap_cap_bps`, `daily_budget_lamports`, `max_trade_size_bps`, `max_yield_allocation_bps` are buried in settings and shown as numbers.
**Fix:** above-the-fold widget on pot detail: progress bars showing used vs cap for the current 24h window, color-coded (green < 50%, amber 50-90%, red > 90%). Also surface `paused` and `defensive_only` as badges next to pot name.
**Why it matters:** safety story is told by the UI, not just the contract. Judges scanning a pot in 30s should see "this pot has guardrails."
**Scope:** ~4 hours.

### D. Two-AI voting demonstration in the demo video
**Problem:** current 90-sec script has one AI delegate. The novel part is *multiple* AIs co-governing.
**Fix:** in the AI Voter scene, show two members each delegating to a different AI (different rules_uri, e.g. one Conservative, one Yield-seeking). Both AIs vote opposite. Quorum resolves. Pause the video on the on-chain VoterRecord PDAs to show two distinct entries.
**Why it matters:** sells the primitive in 8 seconds, no narration needed.
**Scope:** scripted; +1 cut during May 6-8 shoot.

### E. Sendai skill PR
**Problem:** distribution. Sendai's skill marketplace lists 45+ Solana protocols; PotBot is not one of them yet.
**Fix:** PR `skills/sendai-potbot/skill.md` (now staged in the repo) into `sendaifun/skills`.
**Why it matters:** every AI client using `solana-agent-kit` or browsing `/plugin marketplace` finds PotBot for free. Ongoing distribution > one-time launch.
**Scope:** ~30 min once PR opened. Review window varies.

### F. Twitter thread + Mirror post on Personal AI Voters
**Problem:** the primitive is real but invisible publicly. Realms got narrative ground for "AI-governed DAOs" by writing about it. PotBot hasn't.
**Fix:** drafts staged in `marketing/personal-ai-voters-thread.md`. Schedule for 2026-05-01 (T-10).
**Why it matters:** narrative. Judges and grant reviewers read crypto Twitter.
**Scope:** post + reply to it.

### G. /for-agents page polish
**Problem:** for-agents currently lists tools and an install command. Underused entry point.
**Fix:** add (1) a copy-paste Claude Desktop config block, (2) a "Try this prompt" with concrete text ("List active proposals on devnet pot CFke4… and rate them by sentiment"), (3) a link to the Sendai skill once merged.
**Why it matters:** /for-agents *is* the developer surface. Treat it like a landing page.
**Scope:** ~2 hours.

---

## Post-hackathon (Q2 2026)

Ship Phase 1 from `docs/architecture/program-phase1.md`:
- `kill_switch_admin` separate from authority
- Auto-pause on drawdown via `update_health` permissionless crank
- Hash commitments (`rules_uri_hash`, `description_hash`, `strategy_params_hash`)
- `treasury_split_bps` on-chain config
- Light Protocol compressed `SwapEvent` + `NavSnapshot` audit log

Plus product moves:

### H. Mobile-responsive pot detail page
PotBot's biggest organic install vector is iMessage / Telegram link share. Today the pot page is desktop-first. Mobile breakpoints for the 7 tabs and the AI Voter flow.

### I. Pot creation templates
Today create-pot is one big form. Add 4 templates: "Friends Club" (L1 Advisory + low caps), "Trading DAO" (L2 Majority + medium caps), "AI Strategy Fund" (Agent authority + risk caps), "Family Office" (L4 Consensus + high caps). One click → preset values.

### J. Embedded MCP Inspector in /for-agents
Inline iframe of MCP Inspector pointed at the hosted MCP server. Devs hit the page, click tools, see real responses — zero install friction. Compounds on the for-agents page polish.

### K. Public Arweave host for rules JSON
Run a small service (Cloudflare Worker → Arweave bundlr) that takes uploaded JSON, returns `ar://` URI. Members get a one-click upload. Removes a pricing/wallet barrier for non-crypto-native users.

### L. Pot health watchdog (free) → premium SMS alerts
Free tier: `update_health` cranked by a public keeper. Premium tier ($5/mo): SMS / email when HP < 30 or `paused` flips. Subscription is the first revenue line; the on-chain primitive supports the freemium split naturally.

---

## Q3 2026 — Auditable-Private mode

From `docs/architecture/architecture-onchain.md`:
- PrivacyCash integration for shielded deposits
- Stealth member addresses
- Merkle membership proofs
- `member_set_root` field on `PotAccount`

Premium pricing: private pots are paid (per-pot creation fee or subscription). Tech debt monetizes.

---

## Defensive — what NOT to do

These look attractive but are net-negative on judging or roadmap fit:

| Idea | Why not |
|---|---|
| Add a chat / messaging feature in the dApp | Out of scope. Members can use existing Telegram/Discord. Don't compete with chat apps. |
| Mobile native apps (iOS/Android) | 6-month effort. Shipped mobile-web is 80% of value. |
| Perp / options trading inside pots | Custody and risk model becomes 10x more complex. Stay spot-only until Q4 2026. |
| Token launch for PotBot itself | Distracts from the primitive. Don't tokenize the product before the product has 1000+ pots. |
| Cross-chain bridging | Solana-only is a feature, not a limitation. Bridges = surface area for hacks. |
| "AI generates the entire strategy" feature | Conflicts with Personal AI Voters narrative. The AI is a *delegate*, not a *manager*. Don't muddy that. |
| Centralized matching engine for swap proposals | Already solved by Jupiter. CPI is the right answer. |

---

## Judging-criteria mapping (Solana Frontier 2026)

Standard Colosseum criteria are: **Functionality (30%)**, **Possible Impact (25%)**, **Novelty (20%)**, **Design / UX (15%)**, **Open Source (10%)**.

| Criterion | Current state | Recommendations that move the needle |
|---|---|---|
| Functionality (30%) | Real on-chain devnet E2E, 18 MCP tools, npm published | A (onboarding), B (rules wizard), D (two-AI demo) |
| Possible Impact (25%) | Primitive + dev surface + reference client. Need traction signal. | F (thread + Mirror), E (Sendai PR), 3-5 real test pot creators (ask friends) |
| Novelty (20%) | Personal AI Voters is genuinely novel | Repositioning around the primitive (already done in submission) |
| Design / UX (15%) | DApp polished but onboarding gap | A (tour), B (wizard), C (risk viz), H (mobile post-hack) |
| Open Source (10%) | MIT, public repo, dependencies clean | Verify license headers, add CONTRIBUTING.md if missing |

The seven items in "High-leverage now" cumulatively touch 4 of the 5 criteria. That's the highest-EV use of the remaining 16 days.

---

## Sequencing for the next 16 days

| Day | Item |
|---|---|
| 04-26 (Sat) | A (onboarding tour), C (risk viz) |
| 04-27 (Sun) | B (rules wizard) — full day |
| 04-28 (Mon) | E (Sendai PR open), G (for-agents polish) |
| 04-29 (Tue) | Buffer / fix anything broken from B |
| 04-30 (Wed) | Reach out to 5 friends to create test pots on devnet |
| 05-01 (Thu) | F (Twitter thread post) |
| 05-02 (Fri) | F (Mirror post) |
| 05-03–05 | Soak; prepare demo footage |
| 05-06–08 | Demo video shoot — including D (two-AI scene) |
| 05-09 | Edit, captions, upload |
| 05-10 | Submission package final pass — every link, every tx, every demo asset |
| 05-11 | Submit to colosseum.com/frontier |

Buffer days are intentional — something always breaks the week of submission. Don't over-pack.
