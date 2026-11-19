import { NextResponse } from 'next/server'
import { BAG_LEGS, isLegLive } from '@/lib/bag/config'
import { usdPrices } from '@/lib/bag/server'

export const revalidate = 30

/**
 * Which legs can be bought right now. A leg needs a configured mint AND a
 * Jupiter price: a token that exists but has no market yet (for example a
 * tokenized stock before it starts trading) is reported as not tradable.
 */
export async function GET() {
  const configured = BAG_LEGS.filter(isLegLive)
  const prices = await usdPrices(configured.map(l => l.mint)).catch(() => ({} as Record<string, number>))
  const legs = BAG_LEGS.map(l => {
    const price = prices[l.mint]
    const tradable = isLegLive(l) && typeof price === 'number' && price > 0
    return { key: l.key, configured: isLegLive(l), tradable, priceUsd: tradable ? price : null }
  })
  return NextResponse.json({ legs, at: new Date().toISOString() }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } })
}
