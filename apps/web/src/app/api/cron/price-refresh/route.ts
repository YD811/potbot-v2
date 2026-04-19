import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const JUPITER_PRICE_URL =
  'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const t0 = Date.now()
    const res = await fetch(JUPITER_PRICE_URL, { next: { revalidate: 0 } })
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Jupiter returned ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    const solMint = 'So11111111111111111111111111111111111111112'
    const price = data?.data?.[solMint]?.price ?? null
    return NextResponse.json({ ok: true, price, latencyMs: Date.now() - t0, refreshedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
