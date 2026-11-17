import { NextRequest, NextResponse } from 'next/server'
import { BAG_LEGS, isLegLive } from '@/lib/bag/config'
import { usdPrices, walletBalanceUi } from '@/lib/bag/server'
import { holdPointsForDay, isFullBag } from '@/lib/bag/points'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/bag-hold-points — daily. One snapshot per wallet per UTC day:
 * value of live BAG legs held, capped at what the wallet bought via
 * potbot.fun/bag, ×1.25 for a Full BAG. Idempotent per day.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: 'supabase not configured' })
  }

  const db = createServerSupabase()
  const { data: buys, error } = await db.from('bag_buys').select('wallet, usdc_in')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const bought = new Map<string, number>()
  for (const b of buys ?? []) bought.set(b.wallet, (bought.get(b.wallet) ?? 0) + Number(b.usdc_in))

  const legs = BAG_LEGS.filter(isLegLive)
  const prices = await usdPrices(legs.map(l => l.mint))
  const day = new Date().toISOString().slice(0, 10)

  let written = 0
  for (const [wallet, boughtUsd] of bought) {
    try {
      const balances = await Promise.all(legs.map(l => walletBalanceUi(wallet, l.mint)))
      const values = balances.map((b, i) => b * (prices[legs[i].mint] ?? 0))
      const heldUsd = values.reduce((s, v) => s + v, 0)
      const fullBag = isFullBag(values, legs.map(l => l.weightBps))
      const { eligibleUsd, points } = holdPointsForDay(heldUsd, boughtUsd, fullBag)
      const { error: upErr } = await db.from('bag_hold_snapshots').upsert(
        { wallet, day, held_usd: Math.round(heldUsd * 100) / 100, eligible_usd: eligibleUsd, full_bag: fullBag, points },
        { onConflict: 'wallet,day', ignoreDuplicates: true },
      )
      if (!upErr) written++
    } catch (err) {
      console.error('[cron/bag-hold-points]', wallet, err)
    }
  }

  return NextResponse.json({ ok: true, day, wallets: bought.size, written })
}
