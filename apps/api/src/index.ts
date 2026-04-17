import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { pricesRouter } from './routes/prices.js'
import { analyticsRouter } from './routes/analytics.js'
import { agentRouter } from './routes/agent.js'
import { yieldRouter } from './routes/yield.js'
import { warmCache } from './services/price-oracle.js'
import { startAgentCron } from './services/agent-cron.js'

const app = new Hono()

app.use('*', cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
app.use('*', logger())

// Routes
app.get('/health', (c) => c.json({
  status: 'ok',
  version: '1.0.0',
  name: 'PotBot API',
  ts: Date.now(),
}))

app.route('/prices', pricesRouter)
app.route('/analytics', analyticsRouter)
app.route('/agent', agentRouter)
app.route('/yield', yieldRouter)

// 404 handler
app.notFound((c) => c.json({ error: 'Not found', path: c.req.path }, 404))

// Error handler
app.onError((err, c) => {
  console.error('[api] Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

const PORT = Number(process.env.PORT ?? 3001)

// Warm price cache and start agent cron
warmCache().catch(console.error)
startAgentCron()

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 PotBot API running at http://localhost:${PORT}`)
  console.log(`   Routes: /health  /prices  /analytics  /agent  /yield`)
})

export default app
