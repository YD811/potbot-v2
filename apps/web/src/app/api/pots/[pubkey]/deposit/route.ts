import { NextResponse } from 'next/server'

/**
 * POST /api/pots/[pubkey]/deposit
 *
 * Removed. Deposits go on-chain via the program's `deposit` instruction —
 * sign with the depositor's wallet through the dApp UI, the SDK
 * (`@potbot/sdk`'s `useDeposit`/`buildDepositIx`), or the MCP
 * `join_strategy_vault` tool. The previous version tried to mirror
 * `pot.balance` / `pot.total_shares` / `pot.member_count` columns that
 * don't exist on the live `pots` table and wrote to a `deposit_log` table
 * that was never provisioned.
 *
 * Off-chain analytics (NAV history, member tally) are populated by the
 * Helius webhook → Supabase indexer, not by ad-hoc POSTs from the client.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Endpoint removed. Deposit on-chain via the dApp wallet flow, @potbot/sdk, or @potbot/mcp `join_strategy_vault`.',
    },
    { status: 410 },
  )
}
