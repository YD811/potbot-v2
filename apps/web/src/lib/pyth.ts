/**
 * Pyth Network price feed integration for PotBot.
 *
 * Priority:
 *  1. Pyth pull oracle (most accurate, composable on-chain)
 *  2. Jupiter Price API v2 (already proxied, used as fallback)
 *
 * Pyth feed IDs (mainnet + devnet):
 *  SOL/USD  — 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d
 *  BTC/USD  — 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
 *  ETH/USD  — 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
 *  USDC/USD — 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a
 */

const PYTH_HERMES_BASE = 'https://hermes.pyth.network'

const PYTH_FEED_IDS: Record<string, string> = {
  SOL:  '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BTC:  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH:  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
}

export interface PriceData {
  symbol: string
  price: number       // USD price
  confidence: number  // ± confidence interval
  publishTime: number // unix timestamp
  source: 'pyth' | 'jupiter'
}

/**
 * Fetch latest price from Pyth Hermes (REST pull API).
 * Returns null if feed not available.
 */
export async function fetchPythPrice(symbol: string): Promise<PriceData | null> {
  const feedId = PYTH_FEED_IDS[symbol.toUpperCase()]
  if (!feedId) return null

  try {
    const res = await fetch(
      `${PYTH_HERMES_BASE}/v2/updates/price/latest?ids[]=${feedId}&parsed=true`,
      { next: { revalidate: 5 } } // 5s cache in Next.js
    )
    if (!res.ok) return null
    const data = await res.json()
    const parsed = data.parsed?.[0]
    if (!parsed) return null

    const rawPrice = Number(parsed.price.price)
    const exponent = Number(parsed.price.expo)
    const price = rawPrice * Math.pow(10, exponent)
    const conf = Number(parsed.price.conf) * Math.pow(10, exponent)

    return {
      symbol,
      price,
      confidence: conf,
      publishTime: Number(parsed.price.publish_time),
      source: 'pyth',
    }
  } catch {
    return null
  }
}

/**
 * Fetch price from Jupiter (fallback for non-Pyth tokens).
 * Uses the existing /api/jupiter proxy to keep API key server-side.
 */
export async function fetchJupiterPrice(mintAddress: string): Promise<PriceData | null> {
  try {
    const res = await fetch(`/api/jupiter/price/v2?ids=${mintAddress}&showExtraInfo=false`)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.data?.[mintAddress]
    if (!item) return null
    return {
      symbol: mintAddress.slice(0, 6),
      price: Number(item.price),
      confidence: 0,
      publishTime: Math.floor(Date.now() / 1000),
      source: 'jupiter',
    }
  } catch {
    return null
  }
}

/**
 * Get SOL/USD price — tries Pyth first, falls back to Jupiter.
 */
export async function getSolUsdPrice(): Promise<number> {
  const pyth = await fetchPythPrice('SOL')
  if (pyth && pyth.price > 0) return pyth.price

  // Jupiter fallback: SOL mint address (mainnet)
  const SOL_MINT = 'So11111111111111111111111111111111111111112'
  const jup = await fetchJupiterPrice(SOL_MINT)
  return jup?.price ?? 0
}

/**
 * Get prices for a list of token mint addresses.
 * Uses Jupiter Price API v2 (supports any SPL token).
 */
export async function getTokenPrices(
  mintAddresses: string[]
): Promise<Record<string, number>> {
  if (mintAddresses.length === 0) return {}
  try {
    const ids = mintAddresses.join(',')
    const res = await fetch(`/api/jupiter/price/v2?ids=${ids}`)
    if (!res.ok) return {}
    const data = await res.json()
    const result: Record<string, number> = {}
    for (const [mint, info] of Object.entries(data.data ?? {})) {
      result[mint] = Number((info as any).price ?? 0)
    }
    return result
  } catch {
    return {}
  }
}
