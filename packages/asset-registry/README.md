# @potbot/asset-registry

Curated, **verifiable** asset registry + NAV/pricing services for PotBot Pots.

This is an **off-chain data & service layer**. It does *not* touch the on-chain
program and does *not* widen its attack surface. Wiring real multi-asset swaps /
LP into Pots on mainnet is Phase 2 and gated behind the program audit.

## Why it exists

A Pot can target up to **10 assets** with weights that sum to **100% (10000 bps)**.
To do that safely we need a trustworthy list of which Solana tokens are allowed,
their decimals, risk tier, and how to price them. This package is that list plus
the validation and NAV math around it.

## Safety model (read this first)

The #1 risk in an asset registry is a **wrong or malicious mint address** — a user
could deposit into a scam token. So:

1. **Nothing is trusted by default.** Every seed row loads as
   `verified=false, enabled=false`. The DB enforces this too: a row can only be
   `enabled` when it is `verified` **and** has a non-null `mint`
   (`assets_enable_requires_verified_mint` CHECK).
2. **Unknown mints are `null`, never guessed.** The seed only carries a candidate
   mint for majors we're confident about; everything else is `pending_verification`.
3. **`resolve-mints` verifies against Jupiter.** It checks each candidate mint
   resolves on the Jupiter token list *and* the symbol matches, then fills
   authoritative `decimals`. A mismatch clears the mint (kept pending).
4. **Enabling is a deliberate human step.** No script flips `enabled`. You review
   the resolver report, then set `enabled=true` per asset in the DB.
5. **NAV never fabricates a price.** If no price provider can price a holding, it
   is marked `unpriced`, contributes 0, and `NavResult.complete` becomes `false`.

## Layout

```
src/
  types.ts                 # all types (mirror the registry.* SQL schema)
  constants.ts             # invariants + seed hydration + isAssetAddable()
  seed/assets.seed.ts      # ~100 assets across 10 categories (mostly pending)
  validation/potValidation.ts  # the 8 composition rules
  nav/
    navService.ts          # NAV = Σ value(holding), ordered price fallback
    lpInterface.ts         # LP valuation interface + safe placeholder
  adapters/
    jupiterPrice.ts        # PriceProvider over Jupiter Price API v2
    jupiterTokens.ts       # mint verification over Jupiter Tokens API
    meteora.ts             # LP adapter interface (placeholder, Phase 2)
    raydium.ts             # LP adapter interface (placeholder, Phase 2)
scripts/resolve-mints.ts   # verify candidate mints (report only)
test/                      # node:test unit tests (validation + NAV)
```

DB schema: `../../supabase/migrations/20260629120000_asset_registry.sql`
(schema `registry`, isolated from the existing `public.pots`).

## Categories

`sol_lst · stablecoin · xstock · blue_chip · defi · ai · infrastructure · meme · rwa · yield`

## Validation rules

| Rule | Meaning |
|------|---------|
| max 10 assets | `MAX_ASSETS_PER_POT` |
| weights sum to 10000 bps | exact 100% |
| addable only | `enabled && verified && mint && supportsNav` |
| per-asset cap | weight ≤ `asset.maxPotWeightBps` |
| positive weights | each weight > 0 |
| no duplicates | one row per asset |
| risk ack | `riskTier ≥ 4` requires `acknowledgeRisk` |
| strategy support | `lp`/`lend` only if asset supports it |

## NAV calculation

```
NAV(USD) = Σ holdings of:
  direct:  (amountRaw / 10^decimals) * priceUsd        # price via fallback chain
  LP:      lpAdapter.getPositionValueUsd(position)      # Phase 2; else unpriced
```

Price fallback chain is an ordered list of `PriceProvider`s
(e.g. `[JupiterPriceProvider, PythProvider, CacheProvider]`); first valid hit wins.

```ts
import { NavService, JupiterPriceProvider } from '@potbot/asset-registry';
const nav = new NavService({ providers: [new JupiterPriceProvider()] });
const result = await nav.computeNav(holdings);
if (!result.complete) console.warn('partial NAV; unpriced:', result.unpriced);
```

## Commands

```bash
npm test                       # node:test unit tests (validation + NAV)
npm run resolve-mints          # verify seed mints vs Jupiter (report only)
npm run resolve-mints -- --write resolved-assets.json
npm run typecheck
```

## Operational flow to go live with an asset

1. Add/adjust the row in `seed/assets.seed.ts`.
2. `npm run resolve-mints` → review VERIFIED / MISMATCH / PENDING.
3. Insert/refresh rows in `registry.assets` (verified set, mint filled).
4. **Manually** `update registry.assets set enabled = true where id = ...`
   after a human review.
5. Add `registry.asset_pairs` rows for LP/swap routes (Phase 2).

## Security TODO (before exposing via Supabase anon key)

RLS is currently **disabled** on `registry.*`. Before the web app reads these
with the anon key, enable RLS with read-only public policies and restrict writes
to the service role. See the SQL in the project setup notes.
