import { NextRequest, NextResponse } from 'next/server'
import { recordNav } from '@/lib/pot-index/nav-history.server'

/**
 * GET /api/cron/potfolio-nav — Vercel cron, every 15 minutes: one NAV snapshot per live POTfolio.
 * Protected by CRON_SECRET in production; open on preview deployments so the history can be
 * exercised there (it only writes values the server computed itself).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const prod = process.env.VERCEL_ENV === 'production'
  if (prod && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const r = await recordNav()
    return NextResponse.json({ ok: true, ...r, at: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
