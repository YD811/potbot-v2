/**
 * Jupiter integrations for PotBot v2
 *
 * Covers:
 *  1. Swap V2  — unified /order + /execute (replaces v6 /quote + /swap)
 *  2. Trigger  — limit orders (Jupiter Trigger API)
 *  3. Recurring — DCA orders (Jupiter Recurring/DCA API)
 *  4. Price v2 — real-time token prices
 *
 * All api.jup.ag calls are routed through /api/jupiter/* proxy so the
 * JUPITER_API_KEY stays server-side and is never exposed to the browser.
 *
 * Docs:
 *  - https://dev.jup.ag/docs/swap-api
 *  - https://dev.jup.ag/docs/trigger-api
 *  - https://dev.jup.ag/docs/dca-api
 */

import {
  Connection,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js'

// ── Base paths (via /api/jupiter proxy — adds Authorization header server-side)
// tokens.jup.ag is a different domain and does not require auth
export const JUP_SWAP_V2_BASE  = '/api/jupiter/swap/v2'
export const JUP_TRIGGER_BASE  = '/api/jupiter/limit/v2'
export const JUP_DCA_BASE      = '/api/jupiter/dca/v2'
export const JUP_PRICE_BASE    = '/api/jupiter/price/v2'
export const JUP_TOKENS_BASE   = 'https://tokens.jup.ag'   // direct — no auth needed

// ── Known mints ────────────────────────────────────────────────────────────────
export const SOL_MINT    = 'So11111111111111111111111111111111111111112'
export const USDC_MINT   = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const USDT_MINT   = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
export const JUP_MINT    = 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7'
export const WIF_MINT    = 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ'
export const BONK_MINT   = 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u'
export const JITOSL_MINT = 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'
export const MSOL_MINT   = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'

const TOKEN_DECIMALS: Record<string, number> = {
  [SOL_MINT]:    9,
  [USDC_MINT]:   6,
  [USDT_MINT]:   6,
  [JUP_MINT]:    6,
  [WIF_MINT]:    6,
  [BONK_MINT]:   5,
  [JITOSL_MINT]: 9,
  [MSOL_MINT]:   9,
}

export function getDecimals(mint: string): number {
  return TOKEN_DECIMALS[mint] ?? 9
}

export function toRawAmount(uiAmount: number, mint: string): number {
  return Math.floor(uiAmount * Math.pow(10, getDecimals(mint)))
}

export function toUiAmount(raw: number | string, mint: string): number {
  return Number(raw) / Math.pow(10, getDecimals(mint))
}

export function priceImpactColor(pct: number): string {
  if (pct < 0.1) return 'text-green-400'
  if (pct < 1)   return 'text-yellow-400'
  if (pct < 3)   return 'text-orange-400'
  return 'text-red-400'
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. SWAP V2
// ══════════════════════════════════════════════════════════════════════════════

export interface SwapV2OrderParams {
  inputMint: string
  outputMint: string
  amount: number          // raw input amount (lamports / smallest unit)
  slippageBps?: number    // default 50 (0.5%)
  userPublicKey: string
  /** Enable v2 dynamic slippage (recommended) */
  dynamicSlippage?: boolean
}

export interface SwapV2OrderResult {
  transaction:    string   // base64-encoded VersionedTransaction
  inputMint:      string
  outputMint:     string
  inAmount:       string
  outAmount:      string
  priceImpactPct: string
  routePlan:      Array<{ label: string; percent: number }>
  minOutAmount:   string
}

/**
 * Get a swap order from Jupiter Swap V2 (unified API)
 * Returns a serialized transaction ready to sign and execute.
 */
export async function getSwapV2Order(
  params: SwapV2OrderParams,
): Promise<SwapV2OrderResult | null> {
  try {
    const res = await fetch(`${JUP_SWAP_V2_BASE}/order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputMint:                params.inputMint,
        outputMint:               params.outputMint,
        amount:                   String(params.amount),
        slippageBps:              params.slippageBps ?? 50,
        userPublicKey:            params.userPublicKey,
        dynamicSlippage:          params.dynamicSlippage ?? true,
        dynamicComputeUnitLimit:  true,
        prioritizationFeeLamports: 'auto',
        wrapAndUnwrapSol:         true,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      transaction:    data.transaction,
      inputMint:      params.inputMint,
      outputMint:     params.outputMint,
      inAmount:       data.inputAmount  ?? String(params.amount),
      outAmount:      data.outputAmount ?? '0',
      priceImpactPct: data.priceImpactPct ?? '0',
      routePlan:      data.routePlan ?? [],
      minOutAmount:   data.otherAmountThreshold ?? '0',
    }
  } catch {
    return null
  }
}

/**
 * Execute a Swap V2 order — sign + send via /execute endpoint.
 * Falls back to direct sendRawTransaction if /execute returns an error.
 */
export async function executeSwapV2(
  connection: Connection,
  orderResult: SwapV2OrderResult,
  userPublicKey: PublicKey,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
): Promise<string> {
  const txBytes   = Buffer.from(orderResult.transaction, 'base64')
  const tx        = VersionedTransaction.deserialize(txBytes)
  const signedTx  = await signTransaction(tx)
  const signedB64 = Buffer.from(signedTx.serialize()).toString('base64')

  const execRes = await fetch(`${JUP_SWAP_V2_BASE}/execute`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signedTransaction: signedB64,
      requestId: crypto.randomUUID(),
    }),
  })

  if (!execRes.ok) {
    // Fallback: send directly via RPC
    const rawTx    = signedTx.serialize()
    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight:        false,
      preflightCommitment:  'confirmed',
      maxRetries:           3,
    })
    const lbh = await connection.getLatestBlockhash()
    await connection.confirmTransaction({ signature, ...lbh }, 'confirmed')
    return signature
  }

  const execData = await execRes.json()
  return execData.signature ?? execData.txid ?? ''
}


// ══════════════════════════════════════════════════════════════════════════════
// 2. TRIGGER ORDERS (Limit Orders)
// ══════════════════════════════════════════════════════════════════════════════

export interface TriggerOrderParams {
  inputMint:  string
  outputMint: string
  inAmount:   string   // raw input amount
  outAmount:  string   // raw desired output amount (encodes target price)
  maker:      string   // vault pubkey
  expiredAt?: number   // unix timestamp
}

export interface TriggerOrderResult {
  order: string        // order account pubkey
  tx:    string        // base64 transaction to sign
}

export interface TriggerOrderData {
  orderKey:          string
  inputMint:         string
  outputMint:        string
  inAmount:          string
  outAmount:         string
  remainingInAmount: string
  status:            'open' | 'filled' | 'cancelled' | 'expired'
  createdAt:         number
}

export async function createTriggerOrder(
  params: TriggerOrderParams,
): Promise<TriggerOrderResult | null> {
  try {
    const res = await fetch(`${JUP_TRIGGER_BASE}/createOrder`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputMint:  params.inputMint,
        outputMint: params.outputMint,
        inAmount:   params.inAmount,
        outAmount:  params.outAmount,
        maker:      params.maker,
        payer:      params.maker,
        expiredAt:  params.expiredAt ?? null,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { order: data.order, tx: data.tx }
  } catch {
    return null
  }
}

export async function getTriggerOrders(walletPubkey: string): Promise<TriggerOrderData[]> {
  try {
    const res = await fetch(`${JUP_TRIGGER_BASE}/openOrders?wallet=${walletPubkey}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.orders ?? []).map((o: any) => ({
      orderKey:          o.orderKey ?? o.order,
      inputMint:         o.inputMint,
      outputMint:        o.outputMint,
      inAmount:          o.inAmount,
      outAmount:         o.outAmount,
      remainingInAmount: o.remainingInAmount ?? o.inAmount,
      status:            'open' as const,
      createdAt:         o.createdAt,
    }))
  } catch {
    return []
  }
}

export async function cancelTriggerOrder(
  orderKey: string,
  maker:     string,
): Promise<string | null> {
  try {
    const res = await fetch(`${JUP_TRIGGER_BASE}/cancelOrder`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: orderKey, maker }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.tx ?? null
  } catch {
    return null
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// 3. DCA / RECURRING ORDERS
// ══════════════════════════════════════════════════════════════════════════════

export interface DCAOrderParams {
  inputMint:           string
  outputMint:          string
  inAmount:            string   // total raw amount
  inAmountPerCycle:    string   // raw amount per execution
  cycleSecondsApart:   number   // 3600=hourly, 86400=daily, 604800=weekly
  payer:               string   // vault pubkey
  minOutAmountPerCycle?: string
  maxOutAmountPerCycle?: string
}

export interface DCAOrderResult {
  dcaKey: string
  tx:     string
}

export interface DCAOrderData {
  dcaKey:            string
  inputMint:         string
  outputMint:        string
  inAmountPerCycle:  string
  cycleSecondsApart: number
  inDeposited:       string
  inWithdrawn:       string
  outWithdrawn:      string
  nextCycleAt:       number
  status:            'active' | 'closed'
}

export async function createDCAOrder(
  params: DCAOrderParams,
): Promise<DCAOrderResult | null> {
  try {
    const res = await fetch(`${JUP_DCA_BASE}/createDca`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payer:               params.payer,
        user:                params.payer,
        inputMint:           params.inputMint,
        outputMint:          params.outputMint,
        inAmount:            params.inAmount,
        inAmountPerCycle:    params.inAmountPerCycle,
        cycleSecondsApart:   params.cycleSecondsApart,
        minOutAmountPerCycle: params.minOutAmountPerCycle ?? null,
        maxOutAmountPerCycle: params.maxOutAmountPerCycle ?? null,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { dcaKey: data.dcaKey ?? data.dca, tx: data.tx }
  } catch {
    return null
  }
}

export async function getDCAOrders(walletPubkey: string): Promise<DCAOrderData[]> {
  try {
    const res = await fetch(`${JUP_DCA_BASE}/dca?wallet=${walletPubkey}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.dcaAccounts ?? []).map((d: any) => ({
      dcaKey:            d.publicKey ?? d.dcaKey,
      inputMint:         d.inputMint,
      outputMint:        d.outputMint,
      inAmountPerCycle:  d.inAmountPerCycle,
      cycleSecondsApart: d.cycleSecondsApart,
      inDeposited:       d.inDeposited,
      inWithdrawn:       d.inWithdrawn,
      outWithdrawn:      d.outWithdrawn,
      nextCycleAt:       d.nextCycleAt,
      status:            d.status ?? 'active',
    }))
  } catch {
    return []
  }
}

/** Human-readable DCA description for proposal title */
export function describeDCA(params: {
  inputSymbol:       string
  outputSymbol:      string
  amountPerCycle:    number
  totalCycles:       number
  cycleSecondsApart: number
}): string {
  const interval =
    params.cycleSecondsApart >= 604800 ? 'weekly' :
    params.cycleSecondsApart >= 86400  ? 'daily'  :
    params.cycleSecondsApart >= 3600   ? 'hourly' : 'custom'
  return `DCA: ${params.amountPerCycle} ${params.inputSymbol} → ${params.outputSymbol} · ${interval} × ${params.totalCycles} cycles`
}


// ══════════════════════════════════════════════════════════════════════════════
// 4. PRICE API v2
// ══════════════════════════════════════════════════════════════════════════════

export interface TokenPrice {
  mint:       string
  price:      number
  confidence: number  // 1 = high, 0.7 = medium, 0.4 = low
}

export async function getTokenPrices(
  mints: string[],
): Promise<Record<string, TokenPrice>> {
  if (mints.length === 0) return {}
  try {
    const url = `${JUP_PRICE_BASE}?ids=${mints.join(',')}&showExtraInfo=true`
    const res = await fetch(url)
    if (!res.ok) return {}
    const json = await res.json()
    const result: Record<string, TokenPrice> = {}
    for (const [mint, data] of Object.entries<any>(json.data ?? {})) {
      result[mint] = {
        mint,
        price:      data.price ?? 0,
        confidence:
          data.extraInfo?.confidenceLevel === 'high'   ? 1   :
          data.extraInfo?.confidenceLevel === 'medium' ? 0.7 : 0.4,
      }
    }
    return result
  } catch {
    return {}
  }
}

export async function getPortfolioUSD(
  holdings: Array<{ mint: string; amount: number }>,
): Promise<{ total: number; byMint: Record<string, number> }> {
  const mints  = [...new Set(holdings.map(h => h.mint))]
  const prices = await getTokenPrices(mints)
  let total = 0
  const byMint: Record<string, number> = {}
  for (const holding of holdings) {
    const price = prices[holding.mint]?.price ?? 0
    const value = holding.amount * price
    byMint[holding.mint] = (byMint[holding.mint] ?? 0) + value
    total += value
  }
  return { total, byMint }
}


// ══════════════════════════════════════════════════════════════════════════════
// 5. PROPOSAL HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export type JupiterProposalType = 'Swap' | 'LimitOrder' | 'DCA' | 'CancelOrder'

export interface SwapProposalMeta {
  type: 'Swap'
  inputMint: string; outputMint: string
  inputSymbol: string; outputSymbol: string
  amountUi: number; slippageBps: number
}

export interface LimitOrderProposalMeta {
  type: 'LimitOrder'
  inputMint: string; outputMint: string
  inputSymbol: string; outputSymbol: string
  inAmountUi: number; triggerPriceUi: number; outAmountUi: number
  expiredAt?: number
}

export interface DCAProposalMeta {
  type: 'DCA'
  inputMint: string; outputMint: string
  inputSymbol: string; outputSymbol: string
  amountPerCycleUi: number; totalCycles: number
  cycleSecondsApart: number; totalAmountUi: number
}

export type JupiterProposalMeta =
  | SwapProposalMeta
  | LimitOrderProposalMeta
  | DCAProposalMeta

export function buildProposalDescription(meta: JupiterProposalMeta): string {
  switch (meta.type) {
    case 'Swap':
      return `Swap ${meta.amountUi} ${meta.inputSymbol} → ${meta.outputSymbol}`
    case 'LimitOrder':
      return (
        `Limit Order: Buy ${meta.outAmountUi.toFixed(2)} ${meta.outputSymbol} ` +
        `when 1 ${meta.outputSymbol} ≤ ${meta.triggerPriceUi.toFixed(4)} ${meta.inputSymbol} ` +
        `(spend ${meta.inAmountUi} ${meta.inputSymbol})`
      )
    case 'DCA':
      return describeDCA({
        inputSymbol:       meta.inputSymbol,
        outputSymbol:      meta.outputSymbol,
        amountPerCycle:    meta.amountPerCycleUi,
        totalCycles:       meta.totalCycles,
        cycleSecondsApart: meta.cycleSecondsApart,
      })
  }
}
