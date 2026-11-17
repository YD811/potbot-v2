import 'server-only'
import { Connection } from '@solana/web3.js'
import type { NextRequest } from 'next/server'
import { blockedCountries } from './config'

/**
 * Server-side helpers for BAG. Mainnet only, independent of the site's
 * NEXT_PUBLIC_SOLANA_NETWORK (the pot program stays on devnet).
 */

const JUP_SWAP_V2 = 'https://api.jup.ag/swap/v2'

export function bagRpcUrl(): string {
  return process.env.BAG_RPC_URL || 'https://api.mainnet-beta.solana.com'
}

let _conn: Connection | null = null
export function bagConnection(): Connection {
  if (!_conn) _conn = new Connection(bagRpcUrl(), 'confirmed')
  return _conn
}

/** Country from Vercel's edge header. Empty when unknown (local dev). */
export function requestCountry(req: NextRequest): string {
  return (req.headers.get('x-vercel-ip-country') ?? '').toUpperCase()
}

export function isGeoBlocked(req: NextRequest): boolean {
  const c = requestCountry(req)
  return c !== '' && blockedCountries().has(c)
}

function jupHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' }
  const key = process.env.JUPITER_API_KEY
  if (key) h['x-api-key'] = key
  return h
}

export interface JupOrder {
  transaction: string | null
  requestId: string
  inAmount: string
  outAmount: string
  priceImpactPct?: string
  priceImpact?: number
  router?: string
  feeBps?: number
  feeMint?: string
  referralAccount?: string
  errorCode?: number
  errorMessage?: string
  error?: string
}

export async function jupOrder(params: {
  inputMint: string
  outputMint: string
  amount: string
  taker: string
  slippageBps: number
}): Promise<JupOrder> {
  const q = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    taker: params.taker,
    slippageBps: String(params.slippageBps),
  })
  const referral = process.env.BAG_JUP_REFERRAL_ACCOUNT
  const feeBps = Number(process.env.BAG_JUP_REFERRAL_FEE_BPS ?? '50')
  // Jupiter accepts 50–255 bps for referral fees.
  if (referral && feeBps >= 50 && feeBps <= 255) {
    q.set('referralAccount', referral)
    q.set('referralFee', String(feeBps))
  }
  const res = await fetch(`${JUP_SWAP_V2}/order?${q}`, { headers: jupHeaders(), cache: 'no-store' })
  const body = (await res.json().catch(() => ({}))) as JupOrder
  if (!res.ok) return { ...body, transaction: null, error: body.error ?? `Jupiter order failed (${res.status})` }
  return body
}

export interface JupExecute {
  status: 'Success' | 'Failed'
  signature?: string
  code?: number
  totalInputAmount?: string
  totalOutputAmount?: string
  error?: string
}

export async function jupExecute(signedTransaction: string, requestId: string): Promise<JupExecute> {
  const res = await fetch(`${JUP_SWAP_V2}/execute`, {
    method: 'POST',
    headers: jupHeaders(),
    body: JSON.stringify({ signedTransaction, requestId }),
    cache: 'no-store',
  })
  const body = (await res.json().catch(() => ({}))) as JupExecute
  if (!res.ok) return { status: 'Failed', error: body.error ?? `Jupiter execute failed (${res.status})` }
  return body
}

/** USD prices for mints via Jupiter Price v3 (keyless lite endpoint). */
export async function usdPrices(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {}
  const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${mints.join(',')}`, {
    next: { revalidate: 15 },
  })
  if (!res.ok) return {}
  const json = (await res.json().catch(() => ({}))) as Record<string, { usdPrice?: number }>
  const out: Record<string, number> = {}
  for (const [mint, row] of Object.entries(json)) {
    if (typeof row?.usdPrice === 'number') out[mint] = row.usdPrice
  }
  return out
}

/** Sum of a wallet's balance for a mint across all its token accounts (both token programs). */
export async function walletBalanceUi(owner: string, mint: string): Promise<number> {
  const { PublicKey } = await import('@solana/web3.js')
  const res = await bagConnection().getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) })
  let total = 0
  for (const a of res.value) {
    const amt = (a.account.data as any)?.parsed?.info?.tokenAmount?.uiAmount
    if (typeof amt === 'number') total += amt
  }
  return total
}
