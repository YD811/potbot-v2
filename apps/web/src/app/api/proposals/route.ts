import { NextResponse } from 'next/server'

/**
 * POST /api/proposals
 *
 * Removed. Proposals are created on-chain via the program's `create_proposal`
 * instruction — sign with a member's wallet through the dApp UI, the SDK
 * (`@potbot/sdk`), or the MCP `create_swap_proposal` tool. The previous
 * implementation wrote synthetic-pubkey rows to Supabase that never matched
 * any real on-chain ProposalAccount and confused the indexer.
 *
 * GET /api/proposals/[pubkey] still works (read-only, decoded on-chain state).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Endpoint removed. Create proposals on-chain via the dApp wallet flow, @potbot/sdk, or @potbot/mcp `create_swap_proposal`.',
    },
    { status: 410 },
  )
}
