/**
 * Rate Limiting Middleware
 * 
 * Limits:
 *   - Public endpoints: 60 req/min per IP
 *   - Webhook endpoints: 300 req/min per IP  (Helius sends bursts)
 *   - Agent trigger: 10 req/min per IP
 * 
 * Uses sliding window algorithm with in-memory store.
 * For production at scale: replace with Redis-backed rate limiting.
 */
import type { Context, MiddlewareHandler, Next } from 'hono'

interface WindowEntry {
  count: number
  windowStart: number
}

const windows = new Map<string, WindowEntry>()

// Prune expired windows every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windows) {
    if (now - entry.windowStart > 120_000) windows.delete(key)
  }
}, 300_000)

function getClientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

export function rateLimit(options: {
  requests: number
  windowMs: number
  keyPrefix?: string
}): MiddlewareHandler {
  const { requests, windowMs, keyPrefix = 'rl' } = options

  return async (c: Context, next: Next) => {
    const ip = getClientIp(c)
    const key = `${keyPrefix}:${ip}`
    const now = Date.now()

    const entry = windows.get(key)

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      windows.set(key, { count: 1, windowStart: now })
      c.header('X-RateLimit-Limit', String(requests))
      c.header('X-RateLimit-Remaining', String(requests - 1))
      return next()
    }

    entry.count++
    const remaining = Math.max(0, requests - entry.count)
    c.header('X-RateLimit-Limit', String(requests))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header('X-RateLimit-Reset', String(Math.ceil((entry.windowStart + windowMs) / 1000)))

    if (entry.count > requests) {
      return c.json(
        { error: 'Too many requests', retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000) },
        429
      )
    }

    return next()
  }
}

// Pre-configured limiters
export const publicLimiter = rateLimit({ requests: 60,  windowMs: 60_000, keyPrefix: 'pub' })
export const webhookLimiter = rateLimit({ requests: 300, windowMs: 60_000, keyPrefix: 'wh'  })
export const agentLimiter = rateLimit({ requests: 10,  windowMs: 60_000, keyPrefix: 'ag'  })
export const priceLimiter = rateLimit({ requests: 120, windowMs: 60_000, keyPrefix: 'pr'  })
