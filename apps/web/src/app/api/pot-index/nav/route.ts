import { NextResponse } from 'next/server'
import { readNav, readNavAll, recordNav } from '@/lib/pot-index/nav-history.server'

/**
 * GET  /api/pot-index/nav?mint=<index mint>&range=24h|7d|30d|all   → { points, stats }
 * GET  /api/pot-index/nav?all=1                                     → { series: { [mint]: points } } (7 days)
 * POST /api/pot-index/nav { mint }                                  → records a snapshot if the last one is older than 10 min
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RANGES: Record<string, number> = { '24h': 86_400, '7d': 7 * 86_400, '30d': 30 * 86_400, all: 365 * 86_400 }

export async function GET(req: Request) {
  const url = new URL(req.url)
  try {
    if (url.searchParams.get('all')) {
      const series = await readNavAll(Math.floor(Date.now() / 1000) - RANGES['7d'])
      return NextResponse.json({ series }, { headers: { 'cache-control': 's-maxage=120, stale-while-revalidate=600' } })
    }
    const mint = url.searchParams.get('mint') ?? ''
    if (mint.length < 32) return NextResponse.json({ error: 'mint required' }, { status: 400 })
    const range = url.searchParams.get('range') ?? '7d'
    const span = RANGES[range] ?? RANGES['7d']
    const now = Math.floor(Date.now() / 1000)
    const points = await readNav(mint, now - span)
    const first = points[0]
    const last = points[points.length - 1]
    const at = (secAgo: number) => {
      const cutoff = now - secAgo
      let best = null
      for (const p of points) {
        if (p.t <= cutoff) best = p
        else break
      }
      return best ?? first ?? null
    }
    const pct = (from: { price: number } | null) => (from && last && from.price > 0 ? (last.price / from.price - 1) * 100 : null)
    const stats = {
      last: last?.price ?? null,
      change24h: pct(at(86_400)),
      change7d: pct(at(7 * 86_400)),
      changeRange: pct(first ?? null),
      since: first?.t ?? null,
      points: points.length,
    }
    return NextResponse.json({ points, stats }, { headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=300' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { mint?: string }
    const mint = body.mint ?? ''
    if (mint.length < 32 || mint.length > 44) return NextResponse.json({ error: 'mint required' }, { status: 400 })
    const r = await recordNav([mint])
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
