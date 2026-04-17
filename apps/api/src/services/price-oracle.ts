/**
 * Price Oracle — Jupiter Price API v2 with in-memory LRU cache
 * Hot tokens (SOL, USDC, major): 5s TTL
 * Other tokens: 60s TTL
 */

const CACHE = new Map<string, { price: number; ts: number }>()
const HOT_TTL_MS = 5_000
const COLD_TTL_MS = 60_000

const HOT_MINTS = new Set([
  'So11111111111111111111111111111111111111112',        // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',    // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',    // USDT
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',    // mSOL
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',   // ETH (Wormhole)
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',   // BONK
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',   // JitoSOL
])

export async function getPrices(mints: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  const missing: string[] = []
  const now = Date.now()

  for (const mint of mints) {
    const cached = CACHE.get(mint)
    const ttl = HOT_MINTS.has(mint) ? HOT_TTL_MS : COLD_TTL_MS
    if (cached && now - cached.ts < ttl) {
      result[mint] = cached.price
    } else {
      missing.push(mint)
    }
  }

  if (missing.length === 0) return result

  try {
    const url = `https://api.jup.ag/price/v2?ids=${missing.join(',')}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`Jupiter Price API ${res.status}`)
    const data = await res.json() as { data: Record<string, { price: number }> }
    const ts = Date.now()
    for (const mint of missing) {
      const price = data.data[mint]?.price ?? 0
      if (price > 0) {
        result[mint] = price
        CACHE.set(mint, { price, ts })
      }
    }
  } catch (e) {
    console.error('[price-oracle] fetch error:', e)
    // Return stale cache if fresh fetch fails
    for (const mint of missing) {
      const stale = CACHE.get(mint)
      if (stale) result[mint] = stale.price
    }
  }

  return result
}

export async function getPrice(mint: string): Promise<number> {
  const prices = await getPrices([mint])
  return prices[mint] ?? 0
}

export function getCachedPrices(): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [mint, { price }] of CACHE) {
    result[mint] = price
  }
  return result
}

// Pre-warm cache with common tokens on startup
export async function warmCache() {
  const mints = [...HOT_MINTS]
  await getPrices(mints)
  console.log('[price-oracle] Cache warmed with', mints.length, 'tokens')
}
