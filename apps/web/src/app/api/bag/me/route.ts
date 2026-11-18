import { NextRequest, NextResponse } from 'next/server'
import { isValidWallet, ownPoints, REFERRAL_SHARE, type BuyRow, type SnapshotRow } from '@/lib/bag/points'
import { isOfficial, validateWeights } from '@/lib/bag/recipes'
import { bagDbReady } from '@/lib/bag/recipes-server'
import { createServerSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * GET /api/bag/me?wallet=<pubkey> — the wallet's BAG dashboard: the BAG it
 * joined, who invited it, the wallets it brought (with their buys and
 * points), the BAGs it created, and its own BAG Points.
 *
 * Database only, no RPC reads, so it is fast and works before buying opens.
 * Buy points here skip the 7-day "still holds half" check (that needs live
 * balances); the buy card on /bag shows the checked number once buying is on.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')
  if (!isValidWallet(wallet)) return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  if (!bagDbReady()) return NextResponse.json({ error: 'Not available right now' }, { status: 503 })

  const db = createServerSupabase()
  const [join, referredBy, refs, created, buys, snaps] = await Promise.all([
    db.from('bag_joins').select('slug, created_at').eq('wallet', wallet).order('created_at', { ascending: true }),
    db.from('bag_referrals').select('referrer, created_at').eq('wallet', wallet).maybeSingle(),
    db.from('bag_referrals').select('wallet, created_at').eq('referrer', wallet).order('created_at', { ascending: false }).limit(500),
    db.from('bag_recipes').select('slug, name, weights, created_at').eq('creator', wallet).order('created_at', { ascending: true }),
    db.from('bag_buys').select('signature, leg, usdc_in, out_amount, bag_slug, created_at').eq('wallet', wallet).order('created_at', { ascending: false }).limit(100),
    db.from('bag_hold_snapshots').select('day, held_usd, eligible_usd, full_bag, points').eq('wallet', wallet),
  ])

  const refWallets = (refs.data ?? []).map(r => r.wallet)
  const createdSlugs = (created.data ?? []).map(r => r.slug)
  const joinedRows = join.data ?? []
  const lookupSlugs = [...new Set([...createdSlugs, ...joinedRows.map(j => j.slug)])]

  const [refJoins, refBuys, refSnaps, slugJoins, slugBuys, slugNames] = await Promise.all([
    refWallets.length ? db.from('bag_joins').select('wallet, slug').in('wallet', refWallets) : Promise.resolve({ data: [] as { wallet: string; slug: string }[] }),
    refWallets.length ? db.from('bag_buys').select('wallet, usdc_in, created_at').in('wallet', refWallets) : Promise.resolve({ data: [] as { wallet: string; usdc_in: number; created_at: string }[] }),
    refWallets.length ? db.from('bag_hold_snapshots').select('wallet, points').in('wallet', refWallets) : Promise.resolve({ data: [] as { wallet: string; points: number }[] }),
    lookupSlugs.length ? db.from('bag_joins').select('slug').in('slug', lookupSlugs) : Promise.resolve({ data: [] as { slug: string }[] }),
    lookupSlugs.length ? db.from('bag_buys').select('bag_slug, usdc_in').in('bag_slug', lookupSlugs) : Promise.resolve({ data: [] as { bag_slug: string; usdc_in: number }[] }),
    lookupSlugs.length ? db.from('bag_recipes').select('slug, name').in('slug', lookupSlugs) : Promise.resolve({ data: [] as { slug: string; name: string }[] }),
  ])

  const nameOf = new Map((slugNames.data ?? []).map(r => [r.slug, r.name]))
  const joinsBySlug = new Map<string, number>()
  for (const r of slugJoins.data ?? []) joinsBySlug.set(r.slug, (joinsBySlug.get(r.slug) ?? 0) + 1)
  const volBySlug = new Map<string, number>()
  for (const r of slugBuys.data ?? []) volBySlug.set(r.bag_slug, (volBySlug.get(r.bag_slug) ?? 0) + Number(r.usdc_in))

  // Referees: what each one joined, bought and earned.
  const refJoin = new Map((refJoins.data ?? []).map(r => [r.wallet, r.slug]))
  const refBuyRows = new Map<string, BuyRow[]>()
  for (const b of refBuys.data ?? []) refBuyRows.set(b.wallet, [...(refBuyRows.get(b.wallet) ?? []), b])
  const refHold = new Map<string, number>()
  for (const s of refSnaps.data ?? []) refHold.set(s.wallet, (refHold.get(s.wallet) ?? 0) + Number(s.points))
  const refJoinSlugs = [...new Set([...refJoin.values()])].filter(s => !nameOf.has(s))
  if (refJoinSlugs.length) {
    const { data } = await db.from('bag_recipes').select('slug, name').in('slug', refJoinSlugs)
    for (const r of data ?? []) nameOf.set(r.slug, r.name)
  }

  const referees = (refs.data ?? []).map(r => {
    const p = ownPoints(refBuyRows.get(r.wallet) ?? [], [], Number.MAX_SAFE_INTEGER)
    const confirmed = p.buyConfirmed + (refHold.get(r.wallet) ?? 0)
    const slug = refJoin.get(r.wallet) ?? null
    return {
      wallet: r.wallet,
      since: r.created_at,
      bag: slug ? { slug, name: nameOf.get(slug) ?? slug } : null,
      boughtUsd: p.boughtUsd,
      points: round2(confirmed),
      yourShare: round2(confirmed * REFERRAL_SHARE),
    }
  })

  const ownBuys = buys.data ?? []
  const own = ownPoints((buys.data ?? []) as BuyRow[], (snaps.data ?? []) as SnapshotRow[], Number.MAX_SAFE_INTEGER)
  const referral = round2(referees.reduce((s, r) => s + r.yourShare, 0))

  return NextResponse.json(
    {
      wallet,
      joined: joinedRows.map(j => ({
        slug: j.slug,
        name: nameOf.get(j.slug) ?? j.slug,
        since: j.created_at,
        boughtUsd: round2(ownBuys.filter(b => b.bag_slug === j.slug).reduce((s, b) => s + Number(b.usdc_in), 0)),
      })),
      referredBy: referredBy.data ? { wallet: referredBy.data.referrer, since: referredBy.data.created_at } : null,
      referees,
      totals: {
        referred: referees.length,
        referredBought: round2(referees.reduce((s, r) => s + r.boughtUsd, 0)),
        referredBuyers: referees.filter(r => r.boughtUsd > 0).length,
      },
      created: (created.data ?? [])
        .filter(r => validateWeights(r.weights))
        .map(r => ({
          slug: r.slug,
          name: r.name,
          weights: r.weights,
          official: isOfficial(r),
          joins: joinsBySlug.get(r.slug) ?? 0,
          volumeUsd: round2(volBySlug.get(r.slug) ?? 0),
        })),
      buys: (buys.data ?? []).map(b => ({ signature: b.signature, leg: b.leg, usdc: Number(b.usdc_in), bag: b.bag_slug, at: b.created_at })),
      points: {
        boughtUsd: own.boughtUsd,
        buyConfirmed: own.buyConfirmed,
        buyPending: own.buyPending,
        hold: own.hold,
        referral,
        total: round2(own.buyConfirmed + own.hold + referral),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
