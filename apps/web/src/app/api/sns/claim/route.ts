import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { normalizeLabel, validateLabel, toFqdn, type Currency, type ClaimResponse } from '@/lib/sns'
import { buildClaimTransaction, checkAvailability } from '@/lib/sns-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { label?: string; buyer?: string; currency?: string; potPubkey?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const label = normalizeLabel(body.label ?? '')
  const currency: Currency = body.currency === 'USDC' ? 'USDC' : 'SOL'

  const reason = validateLabel(label)
  if (reason) return NextResponse.json({ error: 'invalid_label', reason }, { status: 400 })

  let buyer: PublicKey
  try { buyer = new PublicKey(body.buyer ?? '') } catch { return NextResponse.json({ error: 'invalid_buyer' }, { status: 400 }) }

  if (body.potPubkey) {
    try { new PublicKey(body.potPubkey) } catch { return NextResponse.json({ error: 'invalid_pot' }, { status: 400 }) }
  }

  const availability = await checkAvailability(label)
  if (!availability.available) {
    return NextResponse.json({ error: 'not_available', reason: availability.reason }, { status: 409 })
  }

  if (!process.env.POTBOT_SNS_OWNER_SECRET) {
    return NextResponse.json({ error: 'owner_key_missing', message: 'POTBOT_SNS_OWNER_SECRET is not configured' }, { status: 503 })
  }

  try {
    const { transaction, amount, treasury } = await buildClaimTransaction({ label, buyer, currency })
    const res: ClaimResponse = { transaction, fqdn: toFqdn(label), currency, amount, treasury }
    return NextResponse.json(res, { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    console.error('[sns/claim]', err)
    return NextResponse.json({ error: 'build_tx_failed' }, { status: 500 })
  }
}
