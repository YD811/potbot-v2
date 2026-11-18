import { NextResponse } from 'next/server'
import { buyPointsFor, BUY_VESTING_DAYS } from '@/lib/bag/points'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'

export const runtime = 'nodejs'
export const revalidate = 300

/**
 * GET /api/bag/leaderboard — top 50 wallets by points (beta approximation:
 * vested buy points + hold points; referral bonus and the hold-ratio check
 * are applied on each wallet's own page).
 */
export async function GET() {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ rows: [] })
  }
  const db = createServerSupabase()
  const [buys, snaps] = await Promise.all([
    db.from('bag_buys').select('wallet, usdc_in, created_at').eq('side', 'buy'),
    db.from('bag_hold_snapshots').select('wallet, points'),
  ])
  const totals = new Map<string, number>()
  const vestMs = BUY_VESTING_DAYS * 86_400_000
  for (const b of buys.data ?? []) {
    if (Date.now() - new Date(b.created_at).getTime() < vestMs) continue
    totals.set(b.wallet, (totals.get(b.wallet) ?? 0) + buyPointsFor(b))
  }
  for (const s of snaps.data ?? []) totals.set(s.wallet, (totals.get(s.wallet) ?? 0) + Number(s.points))

  const rows = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([wallet, points], i) => ({ rank: i + 1, wallet: `${wallet.slice(0, 4)}…${wallet.slice(-4)}`, points: Math.round(points) }))

  return NextResponse.json({ rows, wallets: totals.size })
}
