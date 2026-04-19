import { NextRequest, NextResponse } from 'next/server'
import { getPot, getMember, upsertMember } from '@/lib/db'
import { createServerSupabase } from '@/lib/supabase'

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
    if (!pot) return NextResponse.json({ error: 'Pot not found' }, { status: 404 })

    const nav = pot.total_shares > 0 ? pot.balance / pot.total_shares : 1
    const newShares = amountSol / nav
    const existing = await getMember(potPubkey, wallet)

    await upsertMember({
      pot_pubkey: potPubkey,
      wallet,
      shares: (existing?.shares ?? 0) + newShares,
      deposit_total: (existing?.deposit_total ?? 0) + amountSol,
    })

    const db = createServerSupabase()
    await db.from('pots').update({
      balance: pot.balance + amountSol,
      total_shares: pot.total_shares + newShares,
      member_count: existing ? pot.member_count : pot.member_count + 1,
      updated_at: new Date().toISOString(),
    }).eq('pubkey', potPubkey)

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
