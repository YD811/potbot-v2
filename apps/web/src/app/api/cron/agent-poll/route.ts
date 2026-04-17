import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/agent-poll
 *
 * Vercel Cron Job — runs every 5 minutes.
 * Server-side heartbeat that checks if any vault agents have pending
 * rule evaluations (e.g. SOL price threshold triggers).
 *
 * In production this would:
 *   1. Fetch current SOL/token prices from Jupiter
 *   2. Load all vault agent configs from a DB (Supabase)
 *   3. Evaluate each enabled agent's rules
 *   4. For triggered rules: create_swap_proposal via the MCP server / Anchor program
 *
 * In demo/devnet mode it just logs a heartbeat — agents run client-side
 * via the useAIAgent hook.
 *
 * Configure in vercel.json:
 *   { "path": "/api/cron/agent-poll", "schedule": "every 5 minutes" }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30  // seconds

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()

  // Fetch current SOL price as a basis for rule evaluation
  let solPrice: number | null = null
  try {
    const priceRes = await fetch(
      'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112',
      { next: { revalidate: 0 } }
    )
    if (priceRes.ok) {
      const data = await priceRes.json()
      solPrice = data?.data?.['So11111111111111111111111111111111111111112']?.price ?? null
    }
  } catch {
    // Price fetch failed — skip rule evaluation this tick
  }

  // TODO (production): load agent configs from Supabase, evaluate rules,
  // submit proposals via program when triggered.
  // For demo mode: agents run client-side — this endpoint just confirms
  // the cron is healthy.

  return NextResponse.json({
    ok: true,
    mode: process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? 'production' : 'demo',
    solPrice,
    agentsEvaluated: 0,   // will be non-zero once DB integration is wired
    proposalsCreated: 0,
    latencyMs: Date.now() - t0,
    checkedAt: new Date().toISOString(),
  })
}
