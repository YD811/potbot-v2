import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { pricesRouter } from './routes/prices.js'
import { analyticsRouter } from './routes/analytics.js'
import { agentRouter } from './routes/agent.js'
import { yieldRouter } from './routes/yield.js'
import { createWebhooksRouter } from './routes/webhooks.js'
import { warmCache } from './services/price-oracle.js'
import { startAgentCron } from './services/agent-cron.js'
import { publicLimiter } from './middleware/rate-limit.js'
import { analyticsGate } from './middleware/x402.js'

const app = new Hono()

function normalizeOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes(origin)) return true

  // Allow only Vercel preview URLs for this project naming convention.
  return /^https:\/\/potbot(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin)
}

// ── Global Middleware ────────────────────────────────────────────────────────
app.use('*', cors({
  origin: (origin) => {
    const allowed = normalizeOrigins(
      process.env.CORS_ORIGINS ??
      'http://localhost:3000,https://potbot.fun,https://www.potbot.fun',
    )

    // Non-browser callers may omit Origin. In that case return the primary configured origin.
    if (!origin) return allowed[0] ?? 'http://localhost:3000'
    return isAllowedOrigin(origin, allowed) ? origin : allowed[0] ?? origin
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-PAYMENT'],
  exposeHeaders: ['X-PAYMENT-RESPONSE', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
}))
app.use('*', secureHeaders())
app.use('*', logger())
app.use('/prices/*',    publicLimiter)
app.use('/analytics/*', publicLimiter)
app.use('/yield/*',     publicLimiter)

// x402 micropayment gate — activate with X402_ENABLED=true + X402_PAYMENT_ADDRESS=<token_account>
// When enabled: analytics calls require 0.001 USDC per request
// When disabled (default): all calls are free
app.use('/analytics/*', analyticsGate)

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  status:    'ok',
  version:   '1.0.0',
  name:      'PotBot API',
  env:       process.env.NODE_ENV ?? 'development',
  x402:      process.env.X402_ENABLED === 'true' ? 'enabled' : 'disabled',
  ts:        Date.now(),
}))

app.route('/prices',    pricesRouter)
app.route('/analytics', analyticsRouter)
app.route('/agent',     agentRouter)
app.route('/yield',     yieldRouter)
app.route('/webhooks',  createWebhooksRouter())

// ── Error Handlers ───────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found', path: c.req.path }, 404))
app.onError((err, c) => {
  console.error('[api] Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ── Startup ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001)

warmCache().catch(console.error)
startAgentCron()

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n🚀 PotBot API v1.0.0`)
  console.log(`   http://localhost:${PORT}`)
  console.log(`   Env:      ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`   DB:       ${process.env.SUPABASE_URL ? '✅ Supabase' : '⚠️  In-memory'}`)
  console.log(`   Cache:    ${process.env.UPSTASH_REDIS_REST_URL ? '✅ Redis (Upstash)' : '⚠️  In-memory'}`)
  console.log(`   RPC:      ${process.env.RPC_URL ?? 'https://api.devnet.solana.com'}`)
  console.log(`   Executor: ${process.env.EXECUTOR_KEYPAIR ? '✅ Loaded' : '⚠️  Not set (swaps simulated)'}`)
  console.log(`   x402:     ${process.env.X402_ENABLED === 'true' ? `✅ Enabled (${ process.env.X402_PAYMENT_ADDRESS?.slice(0,8) ?? '?'}...)` : '⚠️  Disabled (set X402_ENABLED=true)'}`)
  console.log()
})

export default app
