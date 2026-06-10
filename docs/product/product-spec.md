# PotBot — Product Spec (richer, more serious, more confident)

The target definition for the product upgrade. This is what "richer, more serious, more confident"
means concretely, so Claude Code (and you) have a clear bar to build against. Lives at
`docs/product/product-spec.md`.

Principle: **look like infrastructure people trust their money to, feel as easy as a consumer app.**
Borrow the seriousness of Morpho/Squads and the friendliness of a great mobile app.

---

## 1. Product pillars (what every screen must convey)
1. **Trust** — non-custodial, on-chain, transparent. Show it, don't just say it (PDA address,
   verifiable balances, vote history, "funds in a program, not a person").
2. **Clarity** — anyone understands what a POT is, what they own, and what happens next.
3. **Control** — votes, limits, roles, freeze. The user always feels in charge.
4. **Momentum** — the product feels alive: live NAV, activity feed, the Money Tree growing.

## 2. Information architecture (target)
```
/                     Landing — clear value prop, "how it works", social proof, 1 CTA
/vaults               Discovery — browse pots & Strategy Vaults, filter by PnL/APY/risk/TVL
/vaults/create        Create wizard — 5 steps, friendly + a clear "advanced" path
/pots/[pubkey]        Pot workspace — tabs: Overview · Holdings · Activity · Governance · Agent · Members · Settings
/leaderboard          Ranked public pots (TVL, PnL%, APY30d, win rate)
/u/[wallet]           Member/creator profile — track record, pots, referral
/learn (or /docs)     Onboarding + education hub (what is a pot, safety, how voting works)
/roadmap              Status legend + phased roadmap (already exists)
```

## 3. Key user flows (must be frictionless)
**A. Newcomer joins a pot (the hero flow)**
Landing → "Join a pot" → connect by email (Privy) → fund with card (MoonPay) or wallet →
see your shares + the pot's live NAV → first guided action (vote on an open proposal). Target:
under 2 minutes, no jargon, no seed phrase required.

**B. Group creates a pot**
Create wizard: name + emoji → members & shares model → governance preset (Chill / Balanced /
Institutional) → risk limits (maxSwap %, caps) → optional AI agent rules → review → deploy.
Presets hide complexity; "advanced" reveals L0–L4 + timelock.

**C. Propose → vote → execute**
Any member/agent proposes (swap/DCA/yield/budget) → clear proposal card (what, why, price impact,
who benefits) → members vote with shares, live tally + quorum bar → on pass, execute with tx link.

**D. Creator monetizes**
Launch Strategy Vault → set fees (entry/perf/mgmt) → share link → investors join → track AUM,
fees earned, referral tree. Make earnings visible and motivating.

**E. Premium subscription (post-deploy)**
Upsell on personal voting agent / advanced analytics / cosmetics via native Solana subscriptions.

## 4. Page-by-page upgrades
- **Landing:** sharp one-liner, a 3-step "how it works", live flagship pot preview, real proof
  (devnet live, 100/100 security, Superteam), one primary CTA. Cut clutter.
- **/vaults:** strong cards (emoji, name, NAV, 30d PnL spark, APY, members, risk chip, Money Tree
  stage). Filters + sort that actually work. Empty states that teach.
- **Pot workspace:** a confident header (NAV big, your share, 24h change), then tabs. Each tab does
  one job well. Activity feed makes it feel alive. Governance tab = the trust centerpiece.
- **Proposal card:** the single most important UI. Show action, rationale, est. price impact,
  risk-limit check, current tally + quorum, time left, and your 1-click vote.
- **Profile/leaderboard:** track record builds the creator economy; make PnL/credibility legible.

## 5. Design system (make it consistent + premium)
- Palette: bg `#0D1117`, card `#111827`, border `#1A2332`, green `#14F195` (Solana), accent
  `#9945FF`, muted `#6B7280`, success/green, warning/amber, danger/red. One accent dominates.
- Type: a characterful display face for headings + clean sans for body; clear size scale.
- Components: standardize buttons, cards, chips, inputs, modals, toasts, skeleton loaders, empty
  states. Consistent radius, spacing scale (4/8/12/16/24), and shadows.
- Motion: subtle, purposeful (NAV tick, vote fill, Money Tree growth). No gratuitous animation.
- States: every component has loading / empty / error / success. No dead ends.
- Accessibility: contrast AA, keyboard nav, focus states, reduced-motion respect.
- Mobile-first + PWA: it must feel great on a phone; install prompt where appropriate.

## 6. Logic / correctness upgrades
- NAV, shares, PnL, APY, Sharpe consistent between `apps/api`, SDK, and UI (single source of truth).
- Optimistic UI for votes/deposits with clear pending → confirmed → failed states + tx links.
- Robust error handling: wallet rejected, insufficient funds, quorum not met, frozen pot, cap breach.
- Mock mode parity: every new on-chain action has a believable mock so demos never break.
- Governance presets map deterministically to L0–L4 settings; document the mapping.

## 7. Trust & safety surfaces (lean into them — it's the differentiator)
- "Non-custodial" explainer with the actual vault PDA + a link to Explorer.
- Visible risk limits on each pot (maxSwap %, caps), governance level, and (planned) Sentinel/freeze.
- Security badge (VaultMind 100/100) and "what we don't do" (never hold keys) stated plainly.
- Audit status shown honestly (AI pass now; formal audit planned).

## 8. Documentation to refresh (match the upgraded product)
- `README.md` — accurate status table, current flows, integrations, monetization (incl.
  subscriptions), status legend, updated screenshots / GIFs.
- `docs/architecture/{overview,architecture,program,governance}.md` — reflect current logic + roles.
- `docs/operations/{development,mock-mode,deploy}.md` — local-first workflow, deploy runbook.
- `docs/integrations/mcp.md` — current MCP tool list.
- A `docs/product/` set: this spec + competitive analysis + economics summary.
- In-app `/learn` content mirroring the docs for newcomers.

## 9. Definition of "richer / more serious / more confident" (acceptance)
- A first-time visitor understands and trusts it in <30 seconds on the landing page.
- A newcomer can join a pot in <2 minutes with no crypto knowledge.
- Every screen has consistent design, real states, and no placeholder/dead ends.
- The governance + trust surfaces make the non-custodial story obvious and verifiable.
- Docs and README match the product exactly; nothing stale.
- It looks like something an investor would believe is handling real money.

## 10. Out of scope for now
- Mainnet deploy (deferred until SOL is ready).
- New large protocol features beyond what exists (multi-asset basket, pot_duel) unless they
  directly serve the flows above.
```
