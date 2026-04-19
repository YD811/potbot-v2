import { NextRequest, NextResponse } from 'next/server'
import { createProposal, getPot } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { potPubkey, type, description, proposer, totalSharesSnapshot, expiresInHours = 24 } = await req.json()
    if (!potPubkey || !type || !description || !proposer) {
      return NextResponse.json({ error: 'potPubkey, type, description, proposer required' }, { status: 400 })
    }
    const pot = await getPot(potPubkey)
    if (!pot) return NextResponse.json({ error: 'Pot not found' }, { status: 404 })

    const proposalPubkey = `prop-${potPubkey.slice(0, 8)}-${pot.next_proposal_id}-${Date.now()}`
    const proposal = await createProposal({
      pubkey: proposalPubkey,
      pot_pubkey: potPubkey,
      proposal_id: pot.next_proposal_id,
      type,
      description,
      status: 'active',
      yes_shares: 0,
      no_shares: 0,
      total_shares_snapshot: totalSharesSnapshot ?? pot.total_shares,
      proposer,
      entry_price: null,
      expires_at: new Date(Date.now() + expiresInHours * 3_600_000).toISOString(),
    })
    return NextResponse.json({ ok: true, proposal })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
