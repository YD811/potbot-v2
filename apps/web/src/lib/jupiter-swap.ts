/**
 * Jupiter v6 Swap integration
 * Docs: https://station.jup.ag/docs/apis/swap-api
 */

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

export const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote'
export const JUPITER_SWAP_URL  = 'https://quote-api.jup.ag/v6/swap'

export const SOL_MINT  = 'So11111111111111111111111111111111111111112'
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

export interface JupiterQuote {
  inputMint: string
  inAmount: string
  outputMint: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: 'ExactIn' | 'ExactOut'
  slippageBps: number
  priceImpactPct: string
  routePlan: Array<{
    swapInfo: {
      ammKey: string
      label: string
      inputMint: string
      outputMint: string
      inAmount: string
      outAmount: string
      feeAmount: string
      feeMint: string
    }
    percent: number
  }>
}

export interface SwapQuoteResult {
  quote: JupiterQuote
  inAmountUi: number
  outAmountUi: number
  priceImpactPct: number
  route: string          // e.g. "SOL → USDC via Orca"
  minOutUi: number       // after slippage
}

/**
 * Fetch a quote from Jupiter v6
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number,   // raw amount in input token's smallest unit
  slippageBps = 50,         // 0.5% default
): Promise<SwapQuoteResult | null> {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: String(Math.floor(amountLamports)),
      slippageBps: String(slippageBps),
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false',
    })

    const res = await fetch(`${JUPITER_QUOTE_URL}?${params}`)
    if (!res.ok) return null
    const quote: JupiterQuote = await res.json()

    const inDecimals  = getDecimals(inputMint)
    const outDecimals = getDecimals(outputMint)

    const inAmountUi  = Number(quote.inAmount)  / Math.pow(10, inDecimals)
    const outAmountUi = Number(quote.outAmount) / Math.pow(10, outDecimals)
    const priceImpact = parseFloat(quote.priceImpactPct) * 100

    const route = quote.routePlan
      .map(r => r.swapInfo.label)
      .filter(Boolean)
      .join(' → ') || 'Jupiter'

    const minOutUi = Number(quote.otherAmountThreshold) / Math.pow(10, outDecimals)

    return { quote, inAmountUi, outAmountUi, priceImpactPct: priceImpact, route, minOutUi }
  } catch {
    return null
  }
}

/**
 * Build, sign and send a swap transaction through Jupiter v6
 */
export async function executeJupiterSwap(
  connection: Connection,
  quote: JupiterQuote,
  userPublicKey: PublicKey,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
): Promise<string> {
  const swapRes = await fetch(JUPITER_SWAP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })

  if (!swapRes.ok) {
    const err = await swapRes.text()
    throw new Error(`Jupiter swap error: ${err}`)
  }

  const { swapTransaction } = await swapRes.json()
  const txBytes = Buffer.from(swapTransaction, 'base64')
  const tx = VersionedTransaction.deserialize(txBytes)
  const signedTx = await signTransaction(tx)
  const rawTx = signedTx.serialize()
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  })

  const latestBlockhash = await connection.getLatestBlockhash()
  await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

  return signature
}

export function getDecimals(mint: string): number {
  const DECIMALS: Record<string, number> = {
    [SOL_MINT]: 9,
    [USDC_MINT]: 6,
    [USDT_MINT]: 6,
    'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u': 5,
    'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 9,
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 9,
    'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7': 6,
    'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ': 6,
  }
  return DECIMALS[mint] ?? 9
}

export function toRawAmount(uiAmount: number, mint: string): number {
  return Math.floor(uiAmount * Math.pow(10, getDecimals(mint)))
}

export function priceImpactColor(pct: number): string {
  if (pct < 0.1) return 'text-green-400'
  if (pct < 1)   return 'text-yellow-400'
  if (pct < 3)   return 'text-orange-400'
  return 'text-red-400'
}
