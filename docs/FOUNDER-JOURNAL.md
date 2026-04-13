# PotBot v2 — Founder Journal

> Personal log of progress, decisions, and context for future sessions.
> Updated: 2026-04-13

---

## Project at a Glance

**PotBot v2** — group trading vaults on Solana. A DAO where friends pool SOL, vote on swaps, and share profits. Built for Solana Frontier 2026 hackathon.

- **Deadline**: May 11, 2026
- **GitHub**: https://github.com/YD811/potbot-v2
- **Stack**: Next.js 14, Anchor 0.30, TanStack Query v5, Zustand, Tailwind
- **Mode**: Currently running in mock mode (no devnet deployment yet)

---

## Hackathon Submission Checklist

| # | Item | Status |
|---|------|--------|
| 1 | On-chain pot creation + deposit/withdraw | ✅ Smart contract done |
| 2 | Governance proposals + voting | ✅ Program + UI done |
| 3 | Jupiter swap execution (V6 + V2) | ✅ Integrated |
| 4 | Jupiter Trigger (limit orders) | ✅ Integrated |
| 5 | Jupiter DCA | ✅ Integrated |
| 6 | AI agent automation (rules engine) | ✅ Full UI + logic |
| 7 | Leaderboard (public pots) | ✅ With Dune SIM badge |
| 8 | SNS domain names (.potbot.sol) | ✅ Integrated |
| 9 | Umbra privacy mode | ✅ Integrated (mock) |
| 10 | Kora gasless transactions | ✅ lib/kora.ts + UI badges |
| 11 | Dune SIM analytics | ✅ Badge + ecosystem widget |
| 12 | @potbot/ui shared components | ✅ Built (was base64-corrupt) |
| 13 | Devnet program deployment | ⬜ Next priority |
| 14 | Demo video | ⬜ Needed for submission |
| 15 | Pitch deck | ⬜ Needed for submission |
| 16 | Submission form | ⬜ via Colosseum |

---

## Sponsor Bounties Targeted

| Sponsor | Prize | Status | What we built |
|---------|-------|--------|---------------|
| Jupiter | $10,000 | 🟡 In progress | Swap V6+V2+Trigger+DCA, DX Report |
| Dune SIM | $5,000 | 🟡 In progress | Analytics badge + ecosystem widget |
| Umbra | $5,000 | 🟡 In progress | Privacy mode in CreatePotModal |
| SNS | $5,000 | 🟡 In progress | .potbot.sol domains + leaderboard |
| Kora | ~$5,000 | 🟡 In progress | `lib/kora.ts`, gasless vote/deposit UI |
| Contra | ~$5,000 | ⬜ Not started | High complexity, skip for now |
| Encrypt/Ika | $10,000 | ⬜ Not started | Complex ZK integration |

**Total potential**: ~$45,000 in bounties + $30K grand champion + $10K top-20

---

## Key Technical Decisions

### Mock Mode First
The app auto-detects if the Anchor program is deployed. Without deployment, it runs entirely from a Zustand in-memory store with seed data (7 demo pots). This lets us demo and test the full flow without on-chain setup.

### Kora Integration
Kora is Solana Foundation's gasless signing infrastructure. Users pay gas fees in USDC instead of SOL. Key files:
- `apps/web/src/lib/kora.ts` — SDK wrapper, `gaslessDeposit()`, `gaslessVote()`
- Requires a Kora node deployment (Railway/Docker) for production
- `NEXT_PUBLIC_KORA_RPC=https://kora.potbot.app` in `.env.local`

### SNS Subdomains
Pots get `.potbot.sol` subdomains via Solana Name Service. E.g. a pot named "Alpha Fund" gets `alpha-fund.potbot.sol`. Shown in the leaderboard and pot header.

### AI Agent
Rules engine with 5 strategy presets (DCA, Trend, Reversion, Yield, Custom). Triggers: price thresholds, time intervals, balance changes. Polls every 60s and can auto-propose swaps or auto-vote YES on proposals.

### @potbot/ui Bug
The shared UI package (`packages/ui`) had all source files stored as base64 in git — a corruption bug. Fixed by decoding and rewriting all 6 component files. Package now builds cleanly.

---

## Bug Fixes Applied (2026-04-13)

1. **`@potbot/ui` base64 corruption** — Badge.tsx, Card.tsx had corrupted closing braces; all files decoded and rebuilt. `dist/` now builds successfully.

2. **`mockStore.createPot is not a function`** — Root cause: `@potbot/ui` module failed to load (dist missing), crashing `CreatePotModal`. Fixed by building the UI package.

3. **`pot.createdAt.getTime is not a function`** — MockPot stores `createdAt` as `number` (unix ms) but code called `.getTime()` (Date method). Fixed with type guard.

4. **`pot.admin` undefined** — MockPot uses `authority` not `admin`. Fixed cast.

5. **`calculateTamaStats` wrong field names** — Called with `tradeVolumeSol`, `annualYieldPct`, `daysAlive` but TamaInput expects `tradeVolume`, `yieldApy`, `ageSeconds`. All 4 call sites fixed.

6. **`GovSettings` double export** — `export interface GovSettings` + `export type { GovSettings }` conflict. Removed the redundant re-export.

7. **TypeScript TS2589** — Anchor IDL types too deep for inference at `program.methods.createPot()`. Added `// @ts-ignore`.

---

## Installed AI Skills (sendaifun/skills)

42 Solana protocol skills installed to `~/potbot-v2/.agents/skills/` via `npx skills add sendaifun/skills`. Key ones for PotBot:

- `integrating-jupiter` — Jupiter API docs (Ultra, Trigger, DCA, Perps)
- `kamino` — lending/yield strategies
- `helius` — RPC, DAS API, webhooks
- `glam` — tokenized vaults (directly relevant)
- `solana-kit` — modern Solana SDK
- `squads` — multisig governance
- `pyth` / `switchboard` — price oracles
- `vulnhunter` — Anchor security audit

---

## Current State of the App

```
localhost:3000/               → Homepage with pot list
localhost:3000/leaderboard    → Public leaderboard, Dune badge, SNS names
localhost:3000/pots/DemoPoT1111111111111111111111111111111111111
                              → Full pot detail (7 tabs)
```

**What works without wallet:**
- Browse leaderboard
- View pot details (all 7 tabs in read-only)
- AI agent visualization
- Price charts

**What requires wallet (Phantom/Backpack):**
- Create new pot
- Deposit / Withdraw
- Create proposals
- Vote on proposals
- Execute proposals

---

## Next Priorities

### Immediate (before demo video)
1. **Devnet deployment** — `anchor deploy --provider.cluster devnet`
   - Need funded keypair for deployment
   - Update `NEXT_PUBLIC_POT_PROGRAM_ID` in `.env.local`
   - Test full flow: create → deposit → propose → vote → execute

2. **Demo flow polish**
   - Seed a compelling story pot with good trade history
   - Make sure price charts show something interesting
   - AI agent should have a running strategy visible

### For Submission
3. **Demo video** (3-5 min)
   - Connect wallet → Create pot → Invite friends → Vote on a swap → Execute → See PnL
   - Show AI agent auto-proposing a DCA trade

4. **Pitch deck** (10 slides)
   - Problem: group trading is hard, trust is broken
   - Solution: on-chain governance + AI automation
   - Traction: hackathon + sponsor integrations
   - Roadmap: ETF tokenization, mobile, API

### Nice to Have
5. Kora node deployment (Railway) — enables real gasless transactions
6. SNS subdomain registration on devnet
7. ETF tokenization flow demo

---

## Architecture Notes for Next Developer

- **Mock mode**: everything in `lib/mock-store.ts`. 7 seed pots with realistic data. Proposals can be executed, yield accrues every 10s.
- **On-chain mode**: auto-activates when program is live at `NEXT_PUBLIC_POT_PROGRAM_ID`. No code changes needed.
- **Bounty evidence**: `docs/SPONSORS.md`, `docs/BOUNTY-ANALYSIS.md`, `DX-REPORT.md`
- **AI agent**: runs client-side, 60s polling via `useAIAgent.ts`. Rules stored in localStorage.
- **Governance**: configurable quorum/approval per pot via `GovernanceSettings.tsx`.

---

## Session Notes

### 2026-04-13 Session Summary
- Shipped Kora gasless integration (`lib/kora.ts`, UI badges)
- Installed 42 Solana AI skills via `npx skills add sendaifun/skills`
- Fixed 7 runtime bugs preventing local dev server from working
- Built `@potbot/ui` package (was broken/base64-corrupt)
- Dev server confirmed working at localhost:3000
- All TypeScript errors resolved (0 errors)
- 5 commits pushed to GitHub:
  - `1e86e1c` — CreatePotModal + SPONSORS.md
  - `9e74514` — leaderboard + DX-REPORT.md
  - `932faf4` — mock-store + pots page (large files)
  - `ebcb4c1` — BOUNTY-ANALYSIS.md
  - `8b3fda6` — Kora integration
  - `5403448` — Bug fixes (today)