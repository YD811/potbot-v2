/**
 * Redis Cache Layer — Upstash Redis for serverless/edge caching
 * 
 * Falls back to in-memory Map if Redis is not configured.
 * Use Upstash for production: https://upstash.com (free tier: 10,000 requests/day)
 * 
 * Cached data:
 *   - Token prices (TTL: 5s for hot tokens, 60s for others)
 *   - Yield opportunities (TTL: 5 minutes)
 *   - Vault analytics (TTL: 10s)
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
    // Prune expired entries periodically
    if (this.store.size > 10_000) this.prune()
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'))
    return [...this.store.keys()].filter(k => regex.test(k))
  }

  private prune() {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}

// Redis client using Upstash REST API (no native Redis required)
class UpstashCache {
  private url: string
  private token: string

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  private async cmd<T>(args: unknown[]): Promise<T | null> {
    try {
      const res = await fetch(`${this.url}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(2000),
      })
      if (!res.ok) return null
      const data = await res.json() as { result: T }
      return data.result
    } catch {
      return null
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.cmd<string>(['GET', key])
    if (!raw) return null
    try { return JSON.parse(raw) as T } catch { return null }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const ttlSeconds = Math.ceil(ttlMs / 1000)
    await this.cmd(['SET', key, JSON.stringify(value), 'EX', ttlSeconds])
  }

  async del(key: string): Promise<void> {
    await this.cmd(['DEL', key])
  }

  async keys(pattern: string): Promise<string[]> {
    const result = await this.cmd<string[]>(['KEYS', pattern])
    return result ?? []
  }
}

// Singleton cache instance
const cache: MemoryCache | UpstashCache = (
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new UpstashCache(
        process.env.UPSTASH_REDIS_REST_URL,
        process.env.UPSTASH_REDIS_REST_TOKEN
      )
    : new MemoryCache()
)

if (process.env.UPSTASH_REDIS_REST_URL) {
  console.log('[cache] Using Upstash Redis')
} else {
  console.log('[cache] Using in-memory cache (set UPSTASH_REDIS_* for Redis)')
}

// ── Cache Key Namespaces ─────────────────────────────────────────────────────

export const CacheKeys = {
  price:     (mint: string)      => `price:${mint}`,
  prices:    ()                  => 'prices:bulk',
  analytics: (pubkey: string)   => `analytics:${pubkey}`,
  yield:     ()                  => 'yield:opportunities',
  agent:     (pubkey: string)   => `agent:rules:${pubkey}`,
} as const

export const CacheTTL = {
  PRICE_HOT:   5_000,   // 5s  — SOL, USDC, major tokens
  PRICE_COLD:  60_000,  // 60s — other tokens
  ANALYTICS:   10_000,  // 10s — vault analytics
  YIELD:       300_000, // 5m  — yield opportunities
  AGENT_RULES: 60_000,  // 1m  — agent rules
} as const

// ── Public API ───────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  return cache.get<T>(key)
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  return cache.set(key, value, ttlMs)
}

export async function cacheDel(key: string): Promise<void> {
  return cache.del(key)
}

export async function getCachedPrices(): Promise<Record<string, number>> {
  return (await cacheGet<Record<string, number>>(CacheKeys.prices())) ?? {}
}

export async function setCachedPrices(prices: Record<string, number>): Promise<void> {
  await cacheSet(CacheKeys.prices(), prices, CacheTTL.PRICE_HOT)
  // Also set individual prices
  await Promise.all(
    Object.entries(prices).map(([mint, price]) =>
      cacheSet(CacheKeys.price(mint), price, CacheTTL.PRICE_HOT)
    )
  )
}
