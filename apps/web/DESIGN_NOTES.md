# Visual design decisions

Branch: `design/visual-pass`, based on `origin/feat/pot-index`.

## Round 1: proposed, awaiting YD

No visible application changes have been applied. Mockups use temporary browser CSS and live outside the checkout at `/workspace/design-review/round-1`.

Read `CLAUDE.md`, `docs/potfolio/README.md`, and `docs/potfolio/overview.md`. The required `claude/brand-brief-worldsfair.md` is absent from this branch. Its location has been requested. These are preliminary proposals based on the explicit brand rules in YD's request; brand-brief review is still outstanding.

### 1. Palette, typography, and action sizing

- Proposal: use the specified Solana green and purple, readable dark secondary text, complementary light text, a five-size type scale, and 48px primary/secondary buttons. Hero pot stays unchanged.
- Why: makes reading and actions consistent across themes and screen widths.
- Candidate files: `src/app/globals.css`, `tailwind.config.ts`, `src/components/LandingPage.tsx`.
- Copy changes: none.
- Status: pending.

### 2. POT + BOT cards

- Proposal: left-align the existing text; reduce the oversized words to compact headings; retain the green and purple borders; separate the existing links with a fine divider. No squares containing words.
- Why: gives the liked text proportions a clearer reading order and calmer treatment.
- Candidate files: `src/components/LandingPage.tsx`, `src/app/globals.css` for light counterparts.
- Copy changes: none.
- Status: pending.

### 3. POTfolio creation layout

- Proposal: use a responsive grid for asset/weight rows, full-width sliders under each mobile row, a structured total strip, aligned add-asset controls, a summary panel with separated fee rows, and a full-width green wallet action. Keep every existing control and all text.
- Why: makes basket composition easier to scan and avoids crowded sliders on narrow screens.
- Candidate files: `src/app/portfolios/new/page.tsx` (classes and layout only), `src/app/globals.css` for light counterparts.
- Copy changes: none. Existing wording that conflicts with the newer copy rules is left intact until separately proposed and approved.
- Status: pending.

## Approved

None yet.

## Rejected

None yet.

## Validation and publication

Source implementation, final before/after screenshots, TypeScript and webpack production checks, commits with `design:` prefixes, and the Vercel preview push follow approval. No push has been made. No Vercel branch preview has been claimed.

The proposal gallery is `/workspace/design-review/round-1/index.html`, with a Markdown link index at `/workspace/design-review/round-1/REVIEW.md`. Each proposal has current and browser-only proposed screenshots in dark/light at 1280px/390px. Browser comparisons verify unchanged text and no horizontal page overflow. These checks validate mockups, not a source implementation or live transactions.

Wallet connections and transactions are not part of screenshot review. No plants, thresholds, data hooks, application behavior, or product copy are changed by these proposals.
