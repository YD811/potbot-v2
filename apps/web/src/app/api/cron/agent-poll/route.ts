import { NextRequest, NextResponse } from 'next/server'
import { getAllEnabledRules, markRuleTriggered, createProposal, getPot } from '@/lib/db'

/**
 * GET /api/cron/agent-poll
 *
 * Vercel Cron Job — runs every 5 minutes.
 * Server-side heartbeat that checks if any vault agents have pending
 * rule evaluations (e.g. SOL price threshold triggers).
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

  // Load all enabled agent rules from Supabase and evaluate them
  let agentsEvaluated = 0
  let proposalsCreated = 0

  try {
    const rules = await getAllEnabledRules()
    agentsEvaluated = rules.length

    for (const rule of rules) {
      // Check cooldown
      if (rule.last_triggered_at) {
        const lastMs = new Date(rule.last_triggered_at).getTime()
        const cooldownMs = (rule.cooldown_minutes ?? 60) * 60_000
        if (Date.now() - lastMs < cooldownMs) continue
      }

      let triggered = false

      // Evaluate trigger conditions
      if (solPrice !== null) {
        if (rule.trigger_type === 'price_above' && rule.trigger_threshold !== null) {
          triggered = solPrice > rule.trigger_threshold
        } else if (rule.trigger_type === 'price_below' && rule.trigger_threshold !== null) {
          triggered = solPrice < rule.trigger_threshold
        }
      }

      if (rule.trigger_type === 'time_interval') {
        triggered = true // always fires if cooldown passed
      }

      if (triggered && rule.action_type === 'propose_swap') {
        const pot = await getPot(rule.pot_pubkey)
        if (pot) {
          const proposalPubkey = `agent-${rule.pot_pubkey.slice(0, 8)}-${Date.now()}`
          const token = rule.action_token ?? 'USDC'
          await createProposal({
            pubkey: proposalPubkey,
            pot_pubkey: rule.pot_pubkey,
            proposal_id: pot.next_proposal_id,
            type: 'swap',
            description: `[AI Agent] Swap ${rule.action_amount}% → ${token} (${rule.name})`,
            status: 'active',
            yes_shares: 0,
            no_shares: 0,
            total_shares_snapshot: pot.total_shares,
            proposer: 'agent',
            entry_price: solPrice,
            expires_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          })
          await markRuleTriggered(rule.pot_pubkey, rule.rule_id)
          proposalsCreated++
        }
      }
    }
  } catch (dbErr) {
    console.error('[agent-poll] DB error:', dbErr)
  }

  return NextResponse.json({
    ok: true,
    mode: process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? 'production' : 'demo',
    solPrice,
    agentsEvaluated,
    proposalsCreated,
    latencyMs: Date.now() - t0,
    checkedAt: new Date().toISOString(),
  })
}
