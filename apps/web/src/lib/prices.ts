import { useQuery } from '@tanstack/react-query'

// Jupiter Price API v2
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2'

export const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  So11111111111111111111111111111111111111112: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
  },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': {
    symbol: 'JitoSOL',
    name: 'Jito Staked SOL',
    decimals: 9,
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: 'mSOL',
    name: 'Marinade Staked SOL',
    decimals: 9,
  },
  WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk: {
    symbol: 'WEN',
    name: 'Wen',
    decimals: 5,
  },
}

export interface TokenPrice {
  id: string
  mintSymbol: string
  vsToken: string
  vsTokenSymbol: string
  price: number
}

export interface JupiterPriceResponse {
  data: Record<string, { id: string; mintSymbol: string; vsToken: string; vsTokenSymbol: string; price: string }>
  timeTaken: number
}

async function fetchPrices(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {}
  const ids = mints.join(',')
  const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`)
  if (!res.ok) throw new Error(`Jupiter price API error: ${res.status}`)
  const json: JupiterPriceResponse = await res.json()
  const result: Record<string, number> = {}
  for (const [mint, data] of Object.entries(json.data)) {
    result[mint] = parseFloat(data.price)
  }
  return result
}

/** Hook to fetch prices for a list of mints */
export function useTokenPrices(mints: string[]) {
  return useQuery({
    queryKey: ['jupiter-prices', ...mints.sort()],
    queryFn: () => fetchPrices(mints),
    enabled: mints.length > 0,
    staleTime: 15_000,   // 15 seconds
    refetchInterval: 30_000, // 30 seconds
    retry: 2,
  })
}

/** Hook to fetch a single token price in USD */
export function useTokenPrice(mint: string) {
  const { data, ...rest } = useTokenPrices([mint])
  return { price: data?.[mint], ...rest }
}

/** Hook to fetch SOL price */
export function useSolPrice() {
  return useTokenPrice('So11111111111111111111111111111111111111112')
}

/** Convert lamports to SOL and then to USD */
export function lamportsToUsd(lamports: number, solPriceUsd: number): number {
  return (lamports / 1e9) * solPriceUsd
}

/** Format USD amount */
export function formatUsd(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`
  return `$${amount.toFixed(2)}`
}

/** Format token amount with decimals */
export function formatTokenAmount(amount: number, decimals: number, symbol?: string): string {
  const val = amount / Math.pow(10, decimals)
  const formatted = val >= 1000
    ? val.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : val.toFixed(4)
  return symbol ? `${formatted} ${symbol}` : formatted
}
