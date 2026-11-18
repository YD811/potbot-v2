import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { BAG_LEGS, USDC_MINT, isLegLive } from '@/lib/bag/config'
import { bagConnection, usdPrices, walletBalanceRaw, walletBalanceUi } from '@/lib/bag/server'
import { isFullBag, isValidWallet, ownPoints, withReferral, type BuyRow, type SnapshotRow } from '@/lib/bag/points'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/bag/holdings?wallet=<pubkey> — positions, weights and BAG Points. */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')
  if (!isValidWallet(wallet)) return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })

  const legs = BAG_LEGS.filter(isLegLive)
  const [prices, balances, usdc, lamports] = await Promise.all([
    usdPrices(legs.map(l => l.mint)),
    Promise.all(legs.map(l => walletBalanceRaw(wallet, l.mint).catch(() => 0n))),
    walletBalanceUi(wallet, USDC_MINT).catch(() => 0),
    bagConnection().getBalance(new PublicKey(wallet)).catch(() => 0),
  ])

  const positions = legs.map((l, i) => {
    const price = prices[l.mint] ?? 0
    const ui = Number(balances[i]) / 10 ** l.decimals
    return { leg: l.key, symbol: l.symbol, mint: l.mint, balance: ui, raw: balances[i].toString(), priceUsd: price, valueUsd: ui * price }
  })
  const totalUsd = positions.reduce((s, p) => s + p.valueUsd, 0)
  const fullBag = isFullBag(positions.map(p => p.valueUsd), legs.map(l => l.weightBps))

  let points = null
  let referrals = 0
  if (isSupabaseConfigured && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createServerSupabase()
    const [buys, snaps, refs] = await Promise.all([
      db.from('bag_buys').select('usdc_in, created_at').eq('wallet', wallet).eq('side', 'buy'),
      db.from('bag_hold_snapshots').select('day, held_usd, eligible_usd, full_bag, points').eq('wallet', wallet),
      db.from('bag_referrals').select('wallet').eq('referrer', wallet),
    ])
    const own = ownPoints((buys.data ?? []) as BuyRow[], (snaps.data ?? []) as SnapshotRow[], totalUsd)
    referrals = refs.data?.length ?? 0
    const refereeConfirmed = await refereesConfirmedPoints(db, (refs.data ?? []).map(r => r.wallet))
    points = withReferral(own, refereeConfirmed)
  }

  return NextResponse.json(
    { wallet, positions, totalUsd, fullBag, points, referrals, usdc, sol: lamports / 1e9 },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * Referees' confirmed points. Approximation for the beta: hold points
 * (from snapshots) plus vested buy points; it ignores the referee's
 * current-holdings check to keep this to two queries.
 */
async function refereesConfirmedPoints(db: ReturnType<typeof createServerSupabase>, wallets: string[]): Promise<number> {
  if (wallets.length === 0) return 0
  const [buys, snaps] = await Promise.all([
    db.from('bag_buys').select('wallet, usdc_in, created_at').in('wallet', wallets).eq('side', 'buy'),
    db.from('bag_hold_snapshots').select('points').in('wallet', wallets),
  ])
  const own = ownPoints((buys.data ?? []) as BuyRow[], [], Number.MAX_SAFE_INTEGER)
  const hold = (snaps.data ?? []).reduce((s, r: { points: number | string }) => s + Number(r.points), 0)
  return own.buyConfirmed + hold
}
