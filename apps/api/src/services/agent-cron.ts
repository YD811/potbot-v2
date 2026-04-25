/**
 * Agent Cron — evaluates AI agent rules every 60 seconds
 * Detects trigger conditions and prepares on-chain proposals
 */
import cron from 'node-cron'
import { PublicKey } from '@solana/web3.js'
import { getPrices } from './price-oracle.js'
import {
  buildCreateSwapProposalIx,
  loadAgentKeypair,
  proposalPda,
  readPotHeader,
  sendSignedIx,
} from './anchor-ix.js'
import type { AgentRule, AgentEvalContext } from '../types.js'

const NETWORK = process.env.SOLANA_NETWORK ?? 'devnet'

export interface AgentLog {
  id: string
  potPubkey: string
  ruleId: string
  ruleName: string
  triggerDesc: string
  actionDesc: string
  proposalCreated: boolean
  proposalId?: string
  error?: string
  ts: number
}

// In-memory log — replace with Supabase in production
const agentLogs: AgentLog[] = []
const MAX_LOGS = 1000

// Registry: potPubkey → { rules, agentKeypair }
const agentRegistry = new Map<string, {
  rules: AgentRule[]
  lastEvaluated?: number
}>()

export function registerAgent(potPubkey: string, rules: AgentRule[]) {
  agentRegistry.set(potPubkey, { rules })
  console.log(`[agent-cron] Registered agent for pot ${potPubkey.slice(0, 8)}... (${rules.length} rules)`)
}

export function unregisterAgent(potPubkey: string) {
  agentRegistry.delete(potPubkey)
}

export function getAgentLogs(potPubkey: string, limit = 50): AgentLog[] {
  return agentLogs
    .filter(l => l.potPubkey === potPubkey)
    .slice(-limit)
    .reverse()
}

let cronStarted = false

export function startAgentCron() {
  if (cronStarted) return
  cronStarted = true

  // Evaluate every 60 seconds
  cron.schedule('*/60 * * * * *', async () => {
    const pots = [...agentRegistry.keys()]
    if (pots.length === 0) return
    console.log(`[agent-cron] Evaluating ${pots.length} pot(s)`)
    for (const potPubkey of pots) {
      const entry = agentRegistry.get(potPubkey)
      if (entry) await evaluateAgentRules(potPubkey, entry.rules)
    }
  })

  console.log('[agent-cron] Started — evaluates every 60s')
}

async function evaluateAgentRules(potPubkey: string, rules: AgentRule[]) {
  const WATCHED_MINTS = [
    'So11111111111111111111111111111111111111112',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    ...rules.filter(r => r.trigger.token).map(r => r.trigger.token!),
  ]

  const prices = await getPrices([...new Set(WATCHED_MINTS)])
  const ctx: AgentEvalContext = { prices, ts: Date.now() }

  for (const rule of rules) {
    if (!rule.enabled) continue

    // Check cooldown
    const cooldownMs = rule.cooldownMinutes * 60_000
    if (rule.lastTriggeredAt && ctx.ts - rule.lastTriggeredAt < cooldownMs) continue

    const triggered = evaluateTrigger(rule, ctx)
    if (!triggered) continue

    try {
      const log = await executeRuleAction(potPubkey, rule, ctx)
      rule.lastTriggeredAt = ctx.ts
      agentLogs.push(log)
      if (agentLogs.length > MAX_LOGS) agentLogs.splice(0, agentLogs.length - MAX_LOGS)
      console.log(`[agent-cron] Rule triggered: ${rule.name} on pot ${potPubkey.slice(0, 8)}`)
    } catch (e) {
      const errLog: AgentLog = {
        id: crypto.randomUUID(),
        potPubkey,
        ruleId: rule.id,
        ruleName: rule.name,
        triggerDesc: describeTrigger(rule),
        actionDesc: describeAction(rule),
        proposalCreated: false,
        error: String(e),
        ts: Date.now(),
      }
      agentLogs.push(errLog)
    }
  }
}

function evaluateTrigger(rule: AgentRule, ctx: AgentEvalContext): boolean {
  const { type, threshold, interval, token } = rule.trigger
  const tokenPrice = token ? (ctx.prices[token] ?? 0) : 0

  switch (type) {
    case 'price_above':
      return tokenPrice > 0 && tokenPrice > (threshold ?? 0)
    case 'price_below':
      return tokenPrice > 0 && tokenPrice < (threshold ?? Infinity)
    case 'time_interval': {
      const intervalMs = (interval ?? 60) * 60_000
      return ctx.ts - (rule.lastTriggeredAt ?? 0) >= intervalMs
    }
    case 'pnl_above':
    case 'pnl_below':
    case 'balance_above':
    case 'balance_below':
      // Needs on-chain data — skip until devnet is live
      return false
    default:
      return false
  }
}

async function executeRuleAction(
  potPubkey: string,
  rule: AgentRule,
  _ctx: AgentEvalContext
): Promise<AgentLog> {
  const baseLog: AgentLog = {
    id: crypto.randomUUID(),
    potPubkey,
    ruleId: rule.id,
    ruleName: rule.name,
    triggerDesc: describeTrigger(rule),
    actionDesc: describeAction(rule),
    proposalCreated: false,
    ts: Date.now(),
  }

  // Only propose_swap is wired to chain right now. Other action types remain
  // log-only until their builders are added.
  if (rule.action.type !== 'propose_swap') return baseLog

  const agent = loadAgentKeypair()
  if (!agent) {
    return { ...baseLog, error: 'AGENT_KEYPAIR not set — running in dry-run mode' }
  }

  const { token: fromMint, toToken: toMint, amount } = rule.action
  if (!fromMint || !toMint || !amount) {
    return { ...baseLog, error: 'propose_swap rule missing token / toToken / amount' }
  }

  let pot: PublicKey
  let from: PublicKey
  let to: PublicKey
  try {
    pot = new PublicKey(potPubkey)
    from = new PublicKey(fromMint)
    to = new PublicKey(toMint)
  } catch (err: any) {
    return { ...baseLog, error: `Invalid pubkey in rule: ${err.message ?? String(err)}` }
  }

  const header = await readPotHeader(pot)
  if (!header) return { ...baseLog, error: `PotAccount not found at ${potPubkey}` }

  const ix = buildCreateSwapProposalIx({
    pot,
    proposer: agent.publicKey,
    proposalId: header.nextProposalId,
    fromMint: from,
    toMint: to,
    amountInLamports: BigInt(Math.round(amount)),
    minAmountOutLamports: 0n,
    description: `[agent] ${rule.name}`.slice(0, 200),
  })

  const proposalKey = proposalPda(pot, header.nextProposalId)

  try {
    const sig = await sendSignedIx(ix, agent)
    return {
      ...baseLog,
      proposalCreated: true,
      proposalId: sig,
      actionDesc: `${baseLog.actionDesc} → proposal #${header.nextProposalId} (${proposalKey.toBase58().slice(0, 8)}…) tx ${sig.slice(0, 12)}…`,
    }
  } catch (err: any) {
    return {
      ...baseLog,
      error: `On-chain create_proposal failed: ${err.message ?? String(err)}`,
    }
  }
}

function describeTrigger(rule: AgentRule): string {
  const { type, threshold, interval, token } = rule.trigger
  const tokenLabel = token?.slice(0, 6) ?? 'token'
  switch (type) {
    case 'price_above': return `${tokenLabel} price > $${threshold}`
    case 'price_below': return `${tokenLabel} price < $${threshold}`
    case 'time_interval': return `every ${interval}m`
    default: return type
  }
}

function describeAction(rule: AgentRule): string {
  const { type, amount, token, toToken, protocol } = rule.action
  switch (type) {
    case 'propose_swap': return `propose swap ${amount ?? '?'} ${token?.slice(0, 6) ?? ''} → ${toToken?.slice(0, 6) ?? ''}`
    case 'dca_buy': return `DCA buy ${token?.slice(0, 6) ?? ''} ($${amount})`
    case 'yield_deposit': return `deposit to ${protocol ?? 'yield'}`
    case 'vote_yes': return 'auto-vote YES'
    case 'alert': return 'send alert'
    default: return type
  }
}
