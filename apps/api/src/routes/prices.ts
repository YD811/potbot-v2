import { Hono } from 'hono'
import { getPrices, getCachedPrices } from '../services/price-oracle.js'

export const pricesRouter = new Hono()

// GET /prices?ids=mint1,mint2,...
pricesRouter.get('/', async (c) => {
  const ids = c.req.query('ids')
  if (!ids) {
    // Return all cached prices
    return c.json({ prices: getCachedPrices(), ts: Date.now() })
  }
  const mints = ids.split(',').map(s => s.trim()).filter(Boolean)
  if (mints.length === 0) return c.json({ error: 'No mints provided' }, 400)
  if (mints.length > 50) return c.json({ error: 'Max 50 mints per request' }, 400)

  const prices = await getPrices(mints)
  return c.json({ prices, count: Object.keys(prices).length, ts: Date.now() })
})

// GET /prices/:mint
pricesRouter.get('/:mint', async (c) => {
  const mint = c.req.param('mint')
  const prices = await getPrices([mint])
  const price = prices[mint]
  if (price === undefined) return c.json({ error: 'Price not found', mint }, 404)
  return c.json({ mint, price, ts: Date.now() })
})
