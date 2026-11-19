import { NextRequest, NextResponse } from 'next/server'
import { BAG_LEGS, isLegLive, isLegRestricted } from '@/lib/bag/config'
import { requestCountry, usdPrices } from '@/lib/bag/server'

// Must run on each request: a build-time snapshot would keep a new leg off forever.
export const dynamic = 'force-dynamic'

/**
 * Which legs can be bought right now, for this visitor. A leg needs a
 * configured mint, a Jupiter price (a market), and must be offered in the
 * visitor's country.
 */
export async function GET(req: NextRequest) {
  const country = requestCountry(req)
  const configured = BAG_LEGS.filter(isLegLive)
  const prices = await usdPrices(configured.map(l => l.mint)).catch(() => ({} as Record<string, number>))
  const legs = BAG_LEGS.map(l => {
    const price = prices[l.mint]
    const hasMarket = isLegLive(l) && typeof price === 'number' && price > 0
    const restricted = isLegRestricted(l, country)
    const reason = !isLegLive(l) ? 'not-configured' : restricted ? 'region' : !hasMarket ? 'market' : null
    return { key: l.key, configured: isLegLive(l), tradable: reason === null, reason, priceUsd: hasMarket ? price : null }
  })
  return NextResponse.json({ legs, at: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=20' } })
}
