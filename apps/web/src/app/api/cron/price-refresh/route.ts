import { NextRequest, NextResponse } from 'next/server'
import { recordPrice } from '@/lib/db'

/**
 * GET /api/cron/price-refresh
 *
 * Vercel Cron Job — runs every minute.
 * Warms the SOL price cache by fetching from Jupiter so that
 * the first user of each minute gets a fresh price without waiting.
 *
 * Configure in vercel.json:
 *   { "path": "/api/cron/price-refresh", "schedule": "* * * * *" }
 *
 * Protected by CRON_SECRET header set by Vercel automatically.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JUPITER_PRICE_URL =
  'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (set automatically when cron is configured)
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const t0 = Date.now()
    const res = await fetch(JUPITER_PRICE_URL, {
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Jupiter returned ${res.status}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const solMint = 'So11111111111111111111111111111111111111112'
    const price: number | null = data?.data?.[solMint]?.price ?? null

    if (price !== null) {
      try {
        await recordPrice('SOL', price)
      } catch (dbErr) {
        console.error('[price-refresh] DB write failed:', dbErr)
      }
    }

    return NextResponse.json({
      ok: true,
      price,
      latencyMs: Date.now() - t0,
      refreshedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
