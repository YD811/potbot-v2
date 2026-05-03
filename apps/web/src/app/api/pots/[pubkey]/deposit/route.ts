import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getPot, upsertMember, getMember } from '@/lib/db'

/**
 * POST /api/pots/[pubkey]/deposit
 * Body: { wallet: string, amountSol: number, referrer?: string }
 *
 * Records a deposit: updates member shares, pot balance/member_count, tracks referral.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  try {
    const { wallet, amountSol, referrer } = await req.json()
    if (!wallet || !amountSol || amountSol <= 0) {
      return NextResponse.json({ error: 'wallet and amountSol required' }, { status: 400 })
    }

    const potPubkey = params.pubkey
    const pot = await getPot(potPubkey)
    if (!pot) {
      return NextResponse.json({ error: 'Pot not found' }, { status: 404 })
    }

    // Calculate shares: NAV = balance / total_shares (or 1 if first deposit)
    const balance = Number(pot.balance ?? 0)
    const totalShares = Number(pot.total_shares ?? 0)
    const nav = totalShares > 0 ? balance / totalShares : 1
    const newShares = amountSol / nav

    // Upsert member
    const existing = await getMember(potPubkey, wallet)
    await upsertMember({
      pot_pubkey: potPubkey,
      wallet,
      shares: Number(existing?.shares ?? 0) + newShares,
      deposit_total: Number(existing?.deposit_total ?? 0) + amountSol,
      synced_at: new Date().toISOString(),
    })

    // Update pot
    const db = createServerSupabase()
    await db.from('pots').update({
      balance: balance + amountSol,
      total_shares: totalShares + newShares,
      member_count: existing ? (pot.member_count ?? 0) : (pot.member_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('pubkey', potPubkey)

    // Track referral if present
    if (referrer && referrer !== wallet) {
      const entryFee = amountSol * 0.01
      await db.from('referrals').insert({
        pot_pubkey: potPubkey,
        referrer,
        parent_referrer: '',
        referee: wallet,
        deposit_amount: amountSol,
        level1_earning: entryFee * 0.10,
        level2_earning: 0,
      })
    }

    return NextResponse.json({ ok: true, sharesReceived: newShares })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
