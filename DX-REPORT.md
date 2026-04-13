# Jupiter DX Report — PotBot v2
### Developer Experience Feedback · Solana Frontier 2026

**Submitted by:** PotBot team (YD811)  
**Integration scope:** Swap V2, Trigger API (Limit Orders), Recurring API (DCA), Price API v2  
**Date:** April 2026

---

## 1. What We Built

PotBot is a group trading vault DApp on Solana. Members pool SOL together, vote on trading proposals via on-chain governance, and the AI agent executes approved trades. Jupiter is our **entire execution layer** — every trade that goes through PotBot goes through Jupiter.

We integrated:
- **Swap V2** — for all governance-approved market swaps
- **Trigger API** — for governance-approved limit order proposals
- **Recurring/DCA API** — for governance-approved DCA strategy proposals
- **Price API v2** — for real-time portfolio valuation on the leaderboard

---

## 2. What Worked Well ⭐

### 2.1 Price API v2 — Excellent
The Price API v2 is easily the best part of the Jupiter integration. Single endpoint, no auth required, covers virtually every Solana token, and the `showExtraInfo=true` flag provides confidence levels which we use to warn users about illiquid tokens.

```
GET https://api.jup.ag/price/v2?ids={mints}&showExtraInfo=true
```

**What's great:**
- Zero auth burden — critical for hackathon demos
- Confidence level (`high/medium/low`) — we use this to flag risky proposals
- Batch support — one call for 10+ tokens, saves RPC quota
- Response is clean JSON with consistent structure

**Suggestion:** Add `priceChange24h` to the response so DApps can show gain/loss without calling a separate API.

---

### 2.2 Swap V6 (Legacy) — Solid Foundation
The v6 quote + swap flow worked reliably during our initial integration. The route plan in the quote response is excellent for showing users exactly where their trade is going.

```typescript
// The routePlan display is very useful UX
const route = quote.routePlan
  .map(r => r.swapInfo.label)
  .filter(Boolean)
  .join(' → ')  // e.g. "Orca → Raydium"
```

---

## 3. What Was Challenging ⚠️

### 3.1 Swap V2 Migration — Documentation Gaps

Moving from v6 to the new Swap V2 (`/swap/v2/order` + `/swap/v2/execute`) was harder than expected due to documentation gaps.

**Issues:**

**A. Response field names changed without clear migration guide**
- v6: `outAmount` in the quote
- v2: `outputAmount` in the order response (inconsistent naming)
- We had to guess at field names and handle both in code

**B. Error responses are not standardized**
When the order endpoint fails, the error body varies:
```json
// Sometimes:
{ "error": "insufficient liquidity" }
// Sometimes:
{ "message": "Route not found", "code": 404 }
// Sometimes: plain text
"Bad Request"
```
We had to write `catch-all` error handling. A consistent `{ error: string, code: number }` format would help.

**C. `dynamicSlippage` behavior undocumented**
The `dynamicSlippage: true` flag is mentioned in the docs but the behavior (how it adjusts, what the bounds are) is unclear. We defaulted to `true` but couldn't validate if it was working.

**Suggestion:** Publish a clear v6 → v2 migration guide with a diff of request/response fields.

---

### 3.2 Trigger API (Limit Orders) — Great Concept, API Gaps

The Trigger API is exactly what PotBot needed — governance-approved limit orders are a killer feature. However, the API had several pain points:

**A. No test mode / simulation**
There's no way to test limit order creation without spending real SOL (even on devnet, orders consume real tokens). A `simulate: true` flag would let us test the full flow.

**B. Order status polling is unclear**
```
GET /limit/v2/openOrders?wallet={pubkey}
```
The response includes `orderKey` but the field name isn't consistent in the docs (sometimes `order`, sometimes `orderKey`). We handle both in our code:
```typescript
const orderKey = o.orderKey ?? o.order
```

**C. Filled orders disappear from /openOrders but there's no /filledOrders equivalent**
We need historical order data for PnL tracking. The missing endpoint:
```
GET /limit/v2/filledOrders?wallet={pubkey}&from={timestamp}
```

**Suggestion:** Add `/limit/v2/orderHistory` that includes both open and filled orders, with `status` field.

---

### 3.3 Recurring/DCA API — Documentation is Sparse

The DCA API is powerful but the documentation is the weakest of the three.

**A. `createDca` request body is underdocumented**
The docs show a minimal example but don't document all optional fields:
- `minOutAmountPerCycle` — when does this take effect?
- `maxOutAmountPerCycle` — range DCA mode? No explanation.
- `expiredAt` — format unclear (unix seconds? ms? slot number?)

We guessed from SDKs and community posts.

**B. DCA account data structure needs a schema**
```
GET /dca/v2/dca?wallet={pubkey}
```
The response `dcaAccounts` array items have fields like `inDeposited`, `inWithdrawn`, `outWithdrawn` — but there's no OpenAPI spec to validate against. Field names differ between the API and the on-chain account layout.

**C. No webhook / event for cycle completion**
For PotBot to notify members when each DCA cycle executes, we need either:
- Webhook support (ideal), or
- A `lastCycleAt` field in the DCA account we can poll

Currently we can only show `nextCycleAt`, not confirm the previous cycle succeeded.

**Suggestion:** Publish an OpenAPI spec for all APIs, and add a DCA webhook endpoint.

---

## 4. Developer Experience Summary

| Area | Score (1-5) | Notes |
|------|------------|-------|
| Price API v2 | ⭐⭐⭐⭐⭐ | Best-in-class. Zero friction. |
| Swap V6 | ⭐⭐⭐⭐ | Solid. Error handling could be better. |
| Swap V2 | ⭐⭐⭐ | Good concept, migration docs missing. |
| Trigger API | ⭐⭐⭐ | Powerful, but gaps in docs + no history. |
| DCA API | ⭐⭐ | Works, but very sparse docs. Needs OpenAPI. |
| Overall Docs | ⭐⭐⭐ | Station docs are helpful but incomplete for new APIs. |

---

## 5. Feature Requests

1. **OpenAPI spec** for all Jupiter APIs — would unlock SDK auto-generation and save hours of guessing
2. **DCA webhook** — notify DApps when each cycle executes
3. **Limit order history** — `/limit/v2/orderHistory` with filled orders
4. **Simulation mode** — test API calls without spending real tokens
5. **Consistent error format** — `{ error: string, code: number, details?: object }` across all endpoints
6. **Price change in Price API** — `priceChange24h` field to reduce extra calls
7. **v6 → v2 migration guide** — clear diff of all changed field names

---

## 6. What Made Jupiter the Right Choice

Despite the DX challenges, Jupiter was absolutely the right choice for PotBot:

1. **Deepest liquidity on Solana** — our group vaults need best execution, not a specific AMM
2. **Three API tiers** (instant/limit/DCA) match our three proposal types perfectly
3. **Price API** powers the entire portfolio analytics layer
4. **Station docs** are public and well-organized, even if incomplete for newer APIs
5. **Developer community** (Discord, Twitter) — we found answers to several questions through community posts when docs fell short

**Jupiter is the Solana trading stack.** PotBot uses it for 100% of swap execution. The governance layer we built on top is what makes it unique — members vote on *which* Jupiter order to execute, not just whether to trade.

---

## 7. Integration Code References

- `apps/web/src/lib/jupiter-v2.ts` — Full Jupiter integration (Swap V2 + Trigger + DCA + Price)
- `apps/web/src/lib/jupiter-swap.ts` — Legacy v6 integration (kept for reference)
- `apps/web/src/components/JupiterSwapPanel.tsx` — Swap UI component
- `apps/web/src/app/pots/[pubkey]/page.tsx` — Governance tab with proposal execution

---

*PotBot v2 · Solana Frontier 2026 · github.com/YD811/potbot-v2*
