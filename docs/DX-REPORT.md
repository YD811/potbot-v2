# Jupiter Developer Experience Report
### PotBot v2 — Solana Frontier 2026

> **Written by:** YD (Yehor Dolinskiy), PotBot team  
> **Period:** March–April 2026  
> **APIs used:** Swap V2, Trigger (Limit Orders), DCA (Recurring), Price v2, Tokens list

---

## TL;DR

Jupiter is PotBot's execution engine. Every collective trade decision the group votes on goes through Jupiter. The developer experience has significantly improved with the Swap V2 unified API, and the Trigger + DCA APIs unlock use cases that no other Solana DApp has implemented for group governance. A few rough edges remain — detailed below.

---

## 1. Swap V2 — Migration from v6

### What changed

The old v6 flow required two sequential API calls:
```
GET  /v6/quote  →  POST /v6/swap  →  sign  →  send
```

Swap V2 reduces this to:
```
POST /swap/v2/order  →  sign  →  POST /swap/v2/execute
```

### What worked well

- **Single round-trip** for order creation is a meaningful improvement. In v6, race conditions between `/quote` and `/swap` occasionally caused slippage errors when prices moved in the ~100ms gap. V2 eliminates this.
- **`dynamicSlippage: true`** is excellent. We no longer need to choose a fixed slippage BPS; Jupiter adapts to pool depth. For a group trading vault where the manager isn't always present to monitor slippage, this is critical.
- **`dynamicComputeUnitLimit: true`** saves members money on compute. Visible improvement on complex multi-hop routes.
- **`prioritizationFeeLamports: 'auto'`** removes the "what fee should I set" question entirely. Proposal executions now land reliably without manual fee tuning.
- **`wrapAndUnwrapSol: true`** is a lifesaver. PotBot vaults hold SOL; without auto-wrap every swap would need a pre-instruction to convert SOL → wSOL.
- The `/execute` endpoint's ability to handle the full send+confirm flow server-side means our frontend doesn't need to manage RPC connection state for execution.

### Issues encountered

**1. `/execute` endpoint occasionally returns 5xx on Devnet**  
Solution: we added a fallback to `connection.sendRawTransaction()` when `/execute` returns non-200. This should be documented as the recommended pattern.

**2. Response field naming inconsistency**  
The order response returns `inputAmount` / `outputAmount`, but the v6 quote used `inAmount` / `outAmount`. Caused a silent bug where our UI showed 0 output amount until we noticed the field rename.

**Request:** standardise `inAmount`/`outAmount` across both versions for smoother migrations.

**3. No `requestId` in error responses**  
When `/execute` fails, the error body doesn't include the `requestId` we sent. Makes tracing production failures harder.

---

## 2. Trigger API (Limit Orders)

### Use case in PotBot

> "Vote to buy 10 SOL of JUP when JUP hits $0.85."

Members propose a limit order. If governance approves, the AI agent submits the order to Jupiter Trigger on behalf of the vault. This is the **first DApp implementing democratically-governed limit orders** on Solana.

### What worked well

- **Clean REST interface** — `createOrder` / `openOrders` / `cancelOrder` is a minimal, predictable API surface.
- **`expiredAt` parameter** maps perfectly to our governance voting window — we set the order to expire after the proposal's execution deadline.
- **On-chain settlement** means members can verify the order exists without trusting PotBot's backend.

### Issues encountered

**1. `openOrders` endpoint returns empty array for new orders with ~10s delay**  
The order is created on-chain but doesn't appear in `openOrders?wallet=...` immediately. We added a 12s polling delay before showing "order confirmed" in the UI. A confirmation webhook or websocket would improve UX significantly.

**2. No SDK — raw REST only**  
For Swap v6 we could use `@jup-ag/core`. For Trigger, there's only the REST API. For a hackathon this is fine; for production we'd want typed SDK functions with error handling built in.

**3. `inAmount` / `outAmount` semantics for price encoding**  
The limit price isn't a direct parameter — it's derived from `inAmount / outAmount`. This is elegant but non-obvious. A `triggerPriceUi` helper function would reduce errors.

Suggested addition to docs:
```typescript
// "Buy X outputToken when price drops to targetPriceInInputPerOutput"
const outAmount = inAmount / targetPriceInInputPerOutput
```

---

## 3. DCA API (Recurring Orders)

### Use case in PotBot

> "Vote to DCA 20 SOL into BTC over 10 daily purchases."

Conservative pots can propose systematic, emotion-free accumulation strategies. After governance approval, the AI agent sets up the DCA order on behalf of the vault.

### What worked well

- `cycleSecondsApart` is flexible — hourly, daily, weekly, or any custom interval.
- `minOutAmountPerCycle` / `maxOutAmountPerCycle` allow price guards per cycle, which we surface in the proposal UI.
- The `dca?wallet=...` endpoint gives us full order state including `nextCycleAt` — essential for showing members "next purchase in 14h 23m".

### Issues encountered

**1. No way to pause a DCA mid-run**  
Closing the DCA is all-or-nothing. If governance votes to "pause" a DCA strategy, the only option is cancel and recreate. A `pauseDca` instruction would be useful.

**2. `inDeposited` vs `inWithdrawn` mismatch on Devnet**  
During testing on Devnet, `inWithdrawn` sometimes exceeded `inDeposited` in the API response, likely a Devnet indexer issue. Caused negative remaining-balance display in our holdings tab.

**3. `dcaAccounts` field not in docs**  
The response to `GET /dca/v2/dca?wallet=...` wraps results in a `dcaAccounts` array, but the API docs showed a different field name. Had to discover this by inspecting the actual response.

**Request:** update SDK docs with accurate response shapes.

---

## 4. Price API v2

### What worked well

- **`showExtraInfo=true`** with `confidenceLevel` is excellent. We use it to visually flag low-confidence prices in the vault's holdings tab (showing an ⚠️ icon when confidence is `low`).
- **Batch mint support** — fetching 10+ token prices in a single request is efficient and well-documented.
- **Latency** is consistently <100ms for batch requests. Essential for real-time portfolio valuation on the leaderboard.

### Issues encountered

**1. No websocket / streaming endpoint**  
Prices are fetched via polling every 30s. For live trading, a websocket feed would be preferable. (We're aware this may be in the roadmap.)

**2. Missing mints return no error — silently absent from response**  
If we request a price for a mint that Jupiter doesn't cover, the mint is simply absent from `data`. We now filter `undefined` prices, but a `notFound: string[]` array in the response would make this explicit.

---

## 5. API Key Integration

### Our approach

We proxied all `api.jup.ag` calls through a Next.js API route (`/api/jupiter/[...path]`) so the API key stays server-side and is never exposed in the browser bundle. The proxy adds `Authorization: Bearer ${JUPITER_API_KEY}` on every request.

### Feedback

- **Rate limits without a key are tight** during demo/testing (got 429s running multiple browser tabs). The free tier limit is not clearly documented — we'd appreciate explicit numbers.
- **Key management UI** at dev.jup.ag is clean and well-done. Key revocation and usage stats are present.
- **Suggestion:** document the recommended proxy pattern for Next.js apps (it's a common architecture and non-obvious how to pass the key securely from the browser).

---

## 6. Overall Developer Experience Score

| Dimension              | Score | Notes |
|------------------------|-------|-------|
| **Documentation**      | 7/10  | Core flows well-documented; DCA response shapes need updates |
| **API Design**         | 9/10  | REST is clean and predictable; Swap V2 is a genuine improvement |
| **Reliability**        | 8/10  | Devnet occasional 5xx on /execute; Mainnet solid |
| **SDK / Tooling**      | 6/10  | Swap SDK exists; Trigger + DCA are REST-only |
| **Error Messages**     | 6/10  | Some errors are opaque; missing requestId in failure responses |
| **Rate Limits**        | 7/10  | Free tier tight; limits not documented |
| **Overall**            | **7.5/10** | Strong foundation, minor rough edges |

---

## 7. Top Requests for Jupiter Team

1. **Typed SDK for Trigger + DCA** — REST-only APIs are fine for demos but error-prone in production.
2. **Webhook / Websocket for order state changes** — currently polling `openOrders` every 30s.
3. **Standardise `inAmount`/`outAmount` field names** across Swap v6 → v2 migration.
4. **`requestId` in error responses** from `/execute` for production tracing.
5. **Document rate limits by tier** explicitly in the API reference.
6. **`pauseDca` instruction** for mid-run strategy adjustments.
7. **Proxy pattern guide for Next.js** in the authentication docs.

---

## 8. Code Samples (PotBot Implementation)

### Swap V2 with fallback
```typescript
// From apps/web/src/lib/jupiter-v2.ts
export async function executeSwapV2(connection, orderResult, userPublicKey, signTransaction) {
  const tx       = VersionedTransaction.deserialize(Buffer.from(orderResult.transaction, 'base64'))
  const signedTx = await signTransaction(tx)
  const b64      = Buffer.from(signedTx.serialize()).toString('base64')

  const execRes = await fetch('/api/jupiter/swap/v2/execute', {
    method: 'POST',
    body: JSON.stringify({ signedTransaction: b64, requestId: crypto.randomUUID() }),
  })

  if (!execRes.ok) {
    // Fallback: direct RPC send
    const sig = await connection.sendRawTransaction(signedTx.serialize(), { maxRetries: 3 })
    const lbh = await connection.getLatestBlockhash()
    await connection.confirmTransaction({ signature: sig, ...lbh }, 'confirmed')
    return sig
  }

  return (await execRes.json()).signature
}
```

### Governance-approved limit order
```typescript
// After proposal passes → AI agent executes:
const order = await createTriggerOrder({
  inputMint:  SOL_MINT,
  outputMint: JUP_MINT,
  inAmount:   String(toRawAmount(2.0, SOL_MINT)),      // 2 SOL
  outAmount:  String(toRawAmount(2.0 / 0.85, JUP_MINT)), // target: 0.85 SOL/JUP
  maker:      vaultPubkey,
  expiredAt:  Math.floor(Date.now() / 1000) + 7 * 86400, // 7 days
})
// Vault signs + sends order.tx
```

### AI-proposed DCA strategy
```typescript
// Agent creates proposal: "DCA: 0.5 SOL → JUP · daily × 10 cycles"
const meta: DCAProposalMeta = {
  type: 'DCA', inputMint: SOL_MINT, outputMint: JUP_MINT,
  inputSymbol: 'SOL', outputSymbol: 'JUP',
  amountPerCycleUi: 0.5, totalCycles: 10,
  cycleSecondsApart: 86400, totalAmountUi: 5.0,
}
await createProposal({ description: buildProposalDescription(meta), ... })
// On execution: governance calls createDCAOrder() with vault as payer
```

---

*Document version: 1.0 — April 2026*  
*PotBot v2 — Solana Frontier 2026 hackathon submission*  
*GitHub: https://github.com/YD811/potbot-v2*
