import { NextResponse } from 'next/server'
import registry from '@/lib/pot-index/assets.devnet.json'
import { fetchQuotes } from '@/lib/pot-index/quotes.server'

/**
 * GET /api/pot-index/quotes            → display prices for every listed asset
 * GET /api/pot-index/quotes?ids=a,b    → a subset (feed ids, 0x hex)
 * { prices: { [feedId]: { price, conf, publishTime } }, source: 'pyth' | 'coingecko' }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const listed = Object.values(registry.assets as Record<string, { feedId: string }>).map((a) => a.feedId.toLowerCase())
  const want = (new URL(req.url).searchParams.get('ids') ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  const ids = want.length ? want.filter((f) => listed.includes(f)) : listed
  try {
    const q = await fetchQuotes(ids)
    return NextResponse.json(q, { headers: { 'cache-control': 's-maxage=10, stale-while-revalidate=60' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
