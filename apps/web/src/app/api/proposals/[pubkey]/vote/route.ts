import { NextResponse } from 'next/server'

/**
 * POST /api/proposals/[pubkey]/vote
 *
 * Removed. Voting is on-chain only — sign and submit a `vote` (or
 * `vote_as_delegate`) transaction with the member's wallet via the
 * @potbot/sdk or @potbot/mcp `vote_on_proposal` tool. There is no
 * off-chain `votes` table; tallies live in proposals.{yes_shares,no_shares}
 * which the indexer populates from on-chain VoterRecord PDAs.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Endpoint removed. Vote on-chain via the dApp wallet flow or the MCP `vote_on_proposal` tool.',
    },
    { status: 410 },
  )
}
