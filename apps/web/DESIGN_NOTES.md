# Visual design decisions

Branch: `design/visual-pass`, based on `origin/feat/pot-index`.

## Round 1: decisions

The first review used temporary browser CSS outside the checkout at `/workspace/design-review/round-1`. After YD's reply, only the creation layout was implemented; the other proposals were deferred or rejected as listed below.

Read `CLAUDE.md`, `docs/potfolio/README.md`, and `docs/potfolio/overview.md`. The required `claude/brand-brief-worldsfair.md` is absent from this branch. Its location has been requested. These are preliminary proposals based on the explicit brand rules in YD's request; brand-brief review is still outstanding.

### 1. Palette, typography, and action sizing

- Proposal: use the specified Solana green and purple, readable dark secondary text, complementary light text, a five-size type scale, and 48px primary/secondary buttons. Hero pot stays unchanged.
- Why: makes reading and actions consistent across themes and screen widths.
- Candidate files: `src/app/globals.css`, `tailwind.config.ts`, `src/components/LandingPage.tsx`.
- Copy changes: none.
- Status: deferred. YD asked to preserve the levitating hero pot and continue with the creation layout. No hero or global palette/type changes applied.

### 2. POT + BOT cards

- Proposal: left-align the existing text; reduce the oversized words to compact headings; retain the green and purple borders; separate the existing links with a fine divider. No squares containing words.
- Why: gives the liked text proportions a clearer reading order and calmer treatment.
- Candidate files: `src/components/LandingPage.tsx`, `src/app/globals.css` for light counterparts.
- Copy changes: none.
- Status: rejected in this form. YD prefers centered text; the existing POT + BOT layout is retained.

### 3. POTfolio creation layout

- Proposal: use a responsive grid for asset/weight rows, full-width sliders under each mobile row, a structured total strip, aligned add-asset controls, a summary panel with separated fee rows, and a full-width green wallet action. Keep every existing control and all text.
- Why: makes basket composition easier to scan and avoids crowded sliders on narrow screens.
- Candidate files: `src/app/portfolios/new/page.tsx` (classes and layout only), `src/app/globals.css` for light counterparts.
- Copy changes: none. Existing wording that conflicts with the newer copy rules is left intact until separately proposed and approved.
- Status: approved by YD, 2026-10-10; implemented with page-scoped classes and theme overrides. Asset rows, total, add-asset controls, summary, and wallet action match the approved direction. The CA field spans the row when the asset selector disappears at five assets.

## Approved

Round 1, proposal 3: Creation Layout. YD said it looked good and authorized continuation. Hero pot and centered POT + BOT text explicitly preserved.

## Rejected

Round 1, proposal 2: left alignment. YD likes the existing centered text.

## Validation and publication

Approved creation layout implemented after YD's reply. TypeScript and webpack production checks passed before publication. Publish only to `design/visual-pass`; the engineering agent owns merging into `feat/pot-index`. Main is frozen. Preview availability must be checked after pushing; a branch push alone does not prove deployment readiness.

The proposal gallery is `/workspace/design-review/round-1/index.html`, with a Markdown link index at `/workspace/design-review/round-1/REVIEW.md`. Each proposal has current and browser-only proposed screenshots in dark/light at 1280px/390px. Browser comparisons verify unchanged text and no horizontal page overflow. These checks validate mockups, not a source implementation or live transactions.

Wallet connections and transactions are not part of screenshot review. No plants, thresholds, data hooks, application behavior, or product copy are changed by these proposals.

## Approved creation implementation

- Changed only `src/app/portfolios/new/page.tsx` classes and `src/app/globals.css` page-scoped styles, plus this decision log.
- Existing copy and handlers remain intact. No change to `LandingPage.tsx`, the hero float animation, or POT + BOT.
- Browser validation passed in dark/light at 1280px/390px: name-to-ticker suggestion, equal weights, invalid totals, scale-to-100%, adding five assets, removing an asset, full-width wallet control, non-overlapping slider/input layout, and no horizontal page overflow.
- Actual before/after screenshots and invalid-total/five-asset states are saved under `/workspace/design-review/approved-creation`.
- `npx tsc --noEmit`: passed. `npx next build --webpack`: passed, with 39 static pages generated.
- No wallet connected and no transactions submitted.
