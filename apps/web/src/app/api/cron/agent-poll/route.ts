import { NextRequest, NextResponse } from 'next/server'
import { getAllEnabledRules, markRuleTriggered, createProposal, getPot } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const t0 = Date.now()
  let solPrice: number | null = null
  try {
    const priceRes = await fetch('https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112', { next: { revalidate: 0 } })
    if (priceRes.ok) {
      const data = await priceRes.json()
      solPrice = data?.data?.['So11111111111111111111111111111111111111112']?.price ?? null
    }
  } catch {}

  let agentsEvaluated = 0, proposalsCreated = 0
  try {
    const rules = await getAllEnabledRules()
    agentsEvaluated = rules.length
    for (const rule of rules) {
      if (rule.last_triggered_at) {
        const cooldownMs = (rule.cooldown_minutes ?? 60) * 60_000
        if (Date.now() - new Date(rule.last_triggered_at).getTime() < cooldownMs) continue
      }
      let triggered = false
      if (solPrice !== null) {
        if (rule.trigger_type === 'price_above' && rule.trigger_threshold !== null) triggered = solPrice > rule.trigger_threshold
        else if (rule.trigger_type === 'price_below' && rule.trigger_threshold !== null) triggered = solPrice < rule.trigger_threshold
      }
      if (rule.trigger_type === 'time_interval') triggered = true
      if (triggered && rule.action_type === 'propose_swap') {
        const pot = await getPot(rule.pot_pubkey)
        if (pot) {
          await createProposal({
            pubkey: `agent-${rule.pot_pubkey.slice(0, 8)}-${Date.now()}`,
            pot_pubkey: rule.pot_pubkey,
            proposal_id: pot.next_proposal_id,
            type: 'swap',
            description: `[AI Agent] Swap ${rule.action_amount}% → ${rule.action_token} (${rule.name})`,
            status: 'active',
            yes_shares: 0, no_shares: 0,
            total_shares_snapshot: pot.total_shares,
            proposer: 'agent',
            entry_price: solPrice,
            expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
          })
          await markRuleTriggered(rule.pot_pubkey, rule.rule_id)
          proposalsCreated++
        }
      }
    }
  } catch (e) { console.error('[agent-poll] DB error:', e) }

  return NextResponse.json({
    ok: true,
    mode: process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? 'production' : 'demo',
    solPrice, agentsEvaluated, proposalsCreated,
    latencyMs: Date.now() - t0,
    checkedAt: new Date().toISOString(),
  })
}
