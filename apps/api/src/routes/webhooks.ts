import { Hono } from 'hono'
import { HeliusProcessor } from '../services/helius.js'
import { JupiterExecutor } from '../services/jupiter-executor.js'
import { webhookLimiter } from '../middleware/rate-limit.js'

export function createWebhooksRouter() {
  const router = new Hono()

  const executor = new JupiterExecutor({
    rpcUrl:           process.env.RPC_URL ?? 'https://api.devnet.solana.com',
    executorKeypair:  process.env.EXECUTOR_KEYPAIR,
    slippageBps:      Number(process.env.SWAP_SLIPPAGE_BPS ?? 50),
  })

  const processor = new HeliusProcessor(
    executor,
    process.env.PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK',
    process.env.HELIUS_WEBHOOK_SECRET
  )

  // POST /webhooks/helius — receives real-time on-chain events from Helius
  router.post('/helius', webhookLimiter, async (c) => {
    const rawBody = await c.req.text()
    const signature = c.req.header('helius-signature') ?? ''

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && !processor.verifySignature(rawBody, signature)) {
      return c.json({ error: 'Invalid webhook signature' }, 401)
    }

    let events
    try {
      events = JSON.parse(rawBody)
      if (!Array.isArray(events)) events = [events]
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    // Process async — respond immediately to Helius
    c.executionCtx?.waitUntil(processor.processEvents(events))
    // For non-Cloudflare: fire and forget
    processor.processEvents(events).catch(console.error)

    return c.json({ ok: true, received: events.length })
  })

  // GET /webhooks/executor-status — check executor wallet health
  router.get('/executor-status', async (c) => {
    const balance = await executor.getExecutorBalance()
    const pubkey = executor.getExecutorPublicKey()
    return c.json({
      executorPubkey: pubkey,
      balanceSol: balance,
      healthy: balance > 0.1,
      warning: balance < 0.1 ? 'Low executor balance — top up to ensure swap execution' : null,
    })
  })

  // POST /webhooks/setup — register Helius webhook (run once)
  router.post('/setup', async (c) => {
    const apiKey = process.env.HELIUS_API_KEY
    const webhookUrl = process.env.HELIUS_WEBHOOK_URL

    if (!apiKey || !webhookUrl) {
      return c.json({ error: 'Set HELIUS_API_KEY and HELIUS_WEBHOOK_URL in env' }, 400)
    }

    try {
      const { registerHeliusWebhook } = await import('../services/helius.js')
      await registerHeliusWebhook({
        apiKey,
        webhookUrl: `${webhookUrl}/webhooks/helius`,
        programId: process.env.PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK',
      })
      return c.json({ ok: true, webhookUrl: `${webhookUrl}/webhooks/helius` })
    } catch (e) {
      return c.json({ error: String(e) }, 500)
    }
  })

  return router
}
