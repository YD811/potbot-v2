/**
 * Jupiter Token List
 *
 * Strict list (~1500 verified tokens): token.jup.ag/strict
 * Full list (200k+ tokens):            token.jup.ag/all
 *
 * We use the strict list by default for safety.
 * Users can toggle to "all" if they want to trade unverified tokens.
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

const STRICT_LIST_URL = 'https://token.jup.ag/strict'
const FULL_LIST_URL   = 'https://token.jup.ag/all'

export interface JupiterToken {
  address: string       // mint address (base58)
  chainId: number       // 101 = mainnet
  decimals: number
  name: string
  symbol: string
  logoURI?: string
  tags: string[]        // "verified", "community", "strict", etc.
  extensions?: {
    coingeckoId?: string
    website?: string
    twitter?: string
  }
}

/* ── Fetch token lists ── */

async function fetchTokenList(url: string): Promise<JupiterToken[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Jupiter token list error: ${res.status}`)
  return res.json()
}

/** Fetch Jupiter strict token list — cached 1 hour */
export function useJupiterTokens(mode: 'strict' | 'all' = 'strict') {
  const url = mode === 'strict' ? STRICT_LIST_URL : FULL_LIST_URL
  return useQuery({
    queryKey: ['jupiter-tokens', mode],
    queryFn: () => fetchTokenList(url),
    staleTime: 60 * 60 * 1000,  // 1 hour
    retry: 2,
    select: (tokens) => {
      // Sort: verified first, then alphabetically
      return [...tokens].sort((a, b) => {
        const aVerified = a.tags.includes('verified') || a.tags.includes('strict') ? 0 : 1
        const bVerified = b.tags.includes('verified') || b.tags.includes('strict') ? 0 : 1
        if (aVerified !== bVerified) return aVerified - bVerified
        return a.symbol.localeCompare(b.symbol)
      })
    },
  })
}

/* ── Token search ── */

/** Search tokens by symbol, name, or mint address */
export function searchTokens(
  tokens: JupiterToken[],
  query: string,
  limit = 50
): JupiterToken[] {
  if (!query.trim()) return tokens.slice(0, limit)

  const q = query.trim().toLowerCase()

  // Exact mint address match — return immediately
  const byAddress = tokens.find((t) => t.address.toLowerCase() === q)
  if (byAddress) return [byAddress]

  const scored = tokens.map((t) => {
    const sym = t.symbol.toLowerCase()
    const name = t.name.toLowerCase()
    let score = 0

    if (sym === q) score = 100                          // exact symbol
    else if (sym.startsWith(q)) score = 80              // symbol prefix
    else if (name.startsWith(q)) score = 60             // name prefix
    else if (sym.includes(q)) score = 40                // symbol contains
    else if (name.includes(q)) score = 20               // name contains
    else if (t.address.toLowerCase().startsWith(q)) score = 10  // address prefix

    return { token: t, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.token)
}

/* ── Pinned / popular tokens ── */

export const PINNED_MINTS = [
  'So11111111111111111111111111111111111111112',    // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // JitoSOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  // mSOL
  'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk',  // WEN
  '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4', // JUP
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',  // RENDER
]

export function getPinnedTokens(tokens: JupiterToken[]): JupiterToken[] {
  const map = new Map(tokens.map((t) => [t.address, t]))
  return PINNED_MINTS.map((m) => map.get(m)).filter(Boolean) as JupiterToken[]
}

/* ── Jupiter Quote API ── */

export interface JupiterQuote {
  inputMint: string
  outputMint: string
  inAmount: string         // raw units
  outAmount: string        // raw units
  priceImpactPct: string
  marketInfos: unknown[]
  slippageBps: number
  otherAmountThreshold: string
  swapMode: string
  routePlan: RoutePlan[]
}

export interface RoutePlan {
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
}

export interface QuoteParams {
  inputMint: string
  outputMint: string
  amount: number         // raw lamports/units
  slippageBps?: number   // default 50 = 0.5%
}

export async function getJupiterQuote(params: QuoteParams): Promise<JupiterQuote> {
  const { inputMint, outputMint, amount, slippageBps = 50 } = params
  const url = new URL('https://quote-api.jup.ag/v6/quote')
  url.searchParams.set('inputMint', inputMint)
  url.searchParams.set('outputMint', outputMint)
  url.searchParams.set('amount', String(amount))
  url.searchParams.set('slippageBps', String(slippageBps))
  url.searchParams.set('onlyDirectRoutes', 'false')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Jupiter quote error: ${res.status}`)
  return res.json()
}

/** Hook: get live quote for a swap pair */
export function useJupiterQuote(params: QuoteParams | null) {
  return useQuery({
    queryKey: ['jupiter-quote', params],
    queryFn: () => getJupiterQuote(params!),
    enabled: !!params && params.amount > 0,
    staleTime: 15_000,
    refetchInterval: 20_000,
    retry: 1,
  })
}
