import { NextRequest, NextResponse } from 'next/server'
import { getAllEnabledRules, markRuleTriggered } from '@/lib/db'

/**
 * GET /api/cron/agent-poll
 *
 * Vercel Cron job — runs every 5 minutes.
 *
 * Reads enabled `agent_rules` from Supabase, evaluates trigger conditions
 * against the live SOL price, and (for rules whose cooldown has elapsed and
 * whose trigger fired) marks `last_fired_at` so the cooldown clock starts.
 *
 * NOTE: This cron does NOT create on-chain proposals. The previous version
 * tried to write off-chain "proposal" rows with synthetic pubkeys; that
 * never matched what the dApp actually displays (real proposals live in
 * ProposalAccount PDAs on-chain). To actually fire an AI proposal from a
 * triggered rule you need an `AGENT_KEYPAIR` registered as the pot's
 * delegate (`register_delegate` ix) and the agent must build + sign + send
 * a real `create_proposal` tx — that lives in the dedicated executor
 * service (or the @potbot/mcp `create_swap_proposal` tool when invoked by a
 * connected AI client). This cron is the heartbeat that decides "this rule
 * SHOULD fire now"; the fan-out is delegated.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30  // seconds

export async function GET(req: NextRequest) {
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
      'https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112',
      { next: { revalidate: 0 } },
    )
    if (priceRes.ok) {
      const data = await priceRes.json()
      solPrice = data?.['So11111111111111111111111111111111111111112']?.usdPrice ?? null
    }
  } catch {
    // Price fetch failed — skip rule evaluation this tick
  }

  let agentsEvaluated = 0
  let triggersFired = 0
  const fired: Array<{ id: string; pot: string; trigger_type: string }> = []

  try {
    const rules = await getAllEnabledRules()
    agentsEvaluated = rules.length

    for (const rule of rules) {
      // Cooldown check (last_fired_at is the canonical column)
      if (rule.last_fired_at) {
        const lastMs = new Date(rule.last_fired_at).getTime()
        const cooldownMs = (rule.cooldown_minutes ?? 60) * 60_000
        if (Date.now() - lastMs < cooldownMs) continue
      }

      let triggered = false
      if (solPrice !== null) {
        if (rule.trigger_type === 'price_above' && rule.trigger_threshold !== null) {
          triggered = solPrice > rule.trigger_threshold
        } else if (rule.trigger_type === 'price_below' && rule.trigger_threshold !== null) {
          triggered = solPrice < rule.trigger_threshold
        }
      }
      if (rule.trigger_type === 'time_interval') {
        triggered = true
      }

      if (triggered) {
        await markRuleTriggered(rule.id)
        triggersFired++
        fired.push({ id: rule.id, pot: rule.pot, trigger_type: rule.trigger_type })
        console.log(`[agent-poll] rule ${rule.id} fired (pot=${rule.pot} trigger=${rule.trigger_type})`)
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
    triggersFired,
    fired,
    latencyMs: Date.now() - t0,
    checkedAt: new Date().toISOString(),
  })
}
