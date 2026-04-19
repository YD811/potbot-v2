import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  let solPrice: number | null = null
  try {
    const priceRes = await fetch(
      'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112',
      { next: { revalidate: 0 } }
    )
    if (priceRes.ok) {
      const data = await priceRes.json()
      solPrice = data?.data?.['So11111111111111111111111111111111111111112']?.price ?? null
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    mode: process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? 'production' : 'demo',
    solPrice,
    agentsEvaluated: 0,
    proposalsCreated: 0,
    latencyMs: Date.now() - t0,
    checkedAt: new Date().toISOString(),
  })
}
