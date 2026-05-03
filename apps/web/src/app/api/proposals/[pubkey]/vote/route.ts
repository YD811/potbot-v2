import { NextRequest, NextResponse } from 'next/server'
import { castVote, getProposal, getMember } from '@/lib/db'

/**
 * POST /api/proposals/[pubkey]/vote
 * Body: { voter: string, approve: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  try {
    const { voter, approve } = await req.json()
    if (!voter || approve === undefined) {
      return NextResponse.json({ error: 'voter and approve required' }, { status: 400 })
    }

    const proposal = await getProposal(params.pubkey)
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }
    if (proposal.status !== 'active') {
      return NextResponse.json({ error: 'Proposal is not active' }, { status: 400 })
    }

    // Get voter's shares for voting power
    const member = await getMember(proposal.pot_pubkey, voter)
    const shares = Number(member?.shares ?? 0)

    await castVote({
      proposal_pubkey: params.pubkey,
      voter,
      approve,
      shares,
    })

    return NextResponse.json({ ok: true, sharesUsed: shares })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
