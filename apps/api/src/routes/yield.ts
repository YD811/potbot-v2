import { Hono } from 'hono'
import { getYieldOpportunities } from '../services/yield-aggregator.js'

export const yieldRouter = new Hono()

// GET /yield/opportunities — all yield opportunities sorted by APY
yieldRouter.get('/opportunities', async (c) => {
  const riskFilter = c.req.query('risk') as 'low' | 'medium' | 'high' | undefined
  const protocolFilter = c.req.query('protocol')
  const tokenFilter = c.req.query('token')?.toUpperCase()

  let opportunities = await getYieldOpportunities()

  if (riskFilter) opportunities = opportunities.filter(o => o.risk === riskFilter)
  if (protocolFilter) opportunities = opportunities.filter(o => o.protocol.toLowerCase() === protocolFilter.toLowerCase())
  if (tokenFilter) opportunities = opportunities.filter(o => o.token.toUpperCase() === tokenFilter)

  return c.json({
    opportunities,
    count: opportunities.length,
    filters: { risk: riskFilter, protocol: protocolFilter, token: tokenFilter },
    ts: Date.now(),
  })
})

// GET /yield/best/:token — best yield for a specific token
yieldRouter.get('/best/:token', async (c) => {
  const token = c.req.param('token').toUpperCase()
  const opportunities = await getYieldOpportunities()
  const filtered = opportunities
    .filter(o => o.token.toUpperCase() === token)
    .slice(0, 5)
  return c.json({ token, opportunities: filtered, bestApy: filtered[0]?.apy ?? 0 })
})
