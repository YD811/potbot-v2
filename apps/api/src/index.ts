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

const app = new Hono()

// ── Global Middleware ────────────────────────────────────────────────────────
app.use('*', cors({
  origin: (origin) => {
    const allowed = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',')
    return allowed.includes(origin) || origin.endsWith('.vercel.app') ? origin : allowed[0]
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))
app.use('*', secureHeaders())
app.use('*', logger())
app.use('/prices/*', publicLimiter)
app.use('/analytics/*', publicLimiter)
app.use('/yield/*', publicLimiter)

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  status: 'ok',
  version: '1.0.0',
  name: 'PotBot API',
  env: process.env.NODE_ENV ?? 'development',
  ts: Date.now(),
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
  console.log(`   Env: ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`   DB:  ${process.env.SUPABASE_URL ? '✅ Supabase' : '⚠️  In-memory (no SUPABASE_URL)'}`)
  console.log(`   Cache: ${process.env.UPSTASH_REDIS_REST_URL ? '✅ Redis (Upstash)' : '⚠️  In-memory'}`)
  console.log(`   RPC:   ${process.env.RPC_URL ?? 'https://api.devnet.solana.com'}`)
  console.log(`   Executor: ${process.env.EXECUTOR_KEYPAIR ? '✅ Loaded' : '⚠️  Not set (swaps simulated)'}\n`)
})

export default app
