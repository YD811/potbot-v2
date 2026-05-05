import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { createServerSupabase } from '@/lib/supabase'
import { getPot, upsertMember, getMember } from '@/lib/db'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com'

/**
 * POST /api/pots/[pubkey]/deposit
 * Body: { wallet: string, amountSol: number, txSignature: string, referrer?: string }
 *
 * Records a deposit ONLY after verifying the on-chain tx:
 *   - tx must be confirmed
 *   - tx must not be an error
 *   - tx signer (fee payer) must match `wallet`
 *   - `txSignature` must not already exist in deposit_log (replay guard)
 *
 * `amountSol` is still caller-supplied (reading it from tx accounts is
 * complex and version-dependent). The on-chain Anchor program is the
 * authoritative source; this DB sync is for UI speed, not custody.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  try {
    const { wallet, amountSol, txSignature, referrer } = await req.json()

    if (!wallet || !amountSol || amountSol <= 0 || !txSignature) {
      return NextResponse.json(
        { error: 'wallet, amountSol, and txSignature are required' },
        { status: 400 },
      )
    }

    // ── 1. Validate wallet is a valid pubkey ─────────────────────────────
    let walletPubkey: PublicKey
    try {
      walletPubkey = new PublicKey(wallet)
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    // ── 2. Replay guard — reject duplicate txSignature ───────────────────
    const db = createServerSupabase()
    const { data: existing_tx } = await db
      .from('deposit_log')
      .select('tx_signature')
      .eq('tx_signature', txSignature)
      .maybeSingle()

    if (existing_tx) {
      return NextResponse.json({ error: 'Transaction already recorded' }, { status: 409 })
    }

    // ── 3. Verify tx on-chain ────────────────────────────────────────────
    const conn = new Connection(RPC_URL, 'confirmed')
    const tx = await conn.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })

    if (!tx) {
      return NextResponse.json(
        { error: 'Transaction not found or not yet confirmed' },
        { status: 404 },
      )
    }

    if (tx.meta?.err) {
      return NextResponse.json(
        { error: 'Transaction failed on-chain' },
        { status: 400 },
      )
    }

    // ── 4. Verify fee payer == wallet ────────────────────────────────────
    // The fee payer (index 0 in static account keys) must be the depositor.
    const staticKeys = tx.transaction.message.staticAccountKeys
    const feePayer = staticKeys[0]
    if (!feePayer || !feePayer.equals(walletPubkey)) {
      return NextResponse.json(
        { error: 'Transaction signer does not match wallet' },
        { status: 403 },
      )
    }

    // ── 5. Record deposit in deposit_log (idempotency table) ─────────────
    await db.from('deposit_log').insert({
      tx_signature: txSignature,
      pot_pubkey: params.pubkey,
      wallet,
      amount_sol: amountSol,
      created_at: new Date().toISOString(),
    })

    // ── 6. Update member + pot in DB ─────────────────────────────────────
    const potPubkey = params.pubkey
    const pot = await getPot(potPubkey)
    if (!pot) {
      return NextResponse.json({ error: 'Pot not found' }, { status: 404 })
    }

    const nav = pot.total_shares > 0 ? pot.balance / pot.total_shares : 1
    const newShares = amountSol / nav

    const existingMember = await getMember(potPubkey, wallet)
    await upsertMember({
      pot_pubkey: potPubkey,
      wallet,
      shares: (existingMember?.shares ?? 0) + newShares,
      deposit_total: (existingMember?.deposit_total ?? 0) + amountSol,
    })

    await db.from('pots').update({
      balance: pot.balance + amountSol,
      total_shares: pot.total_shares + newShares,
      member_count: existingMember ? pot.member_count : pot.member_count + 1,
      updated_at: new Date().toISOString(),
    }).eq('pubkey', potPubkey)

    // ── 7. Track referral ─────────────────────────────────────────────────
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
    console.error('[deposit] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
