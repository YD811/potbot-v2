/**
 * AI Agent — Automated Proposal & Voting Engine
 *
 * The agent runs in the background (browser tab) and:
 * 1. Evaluates trigger conditions against live market data
 * 2. Auto-generates swap proposals when conditions are met
 * 3. Auto-votes on proposals based on configured rules
 *
 * Architecture:
 *   AgentConfig → Rules[] → Evaluator → Actions (propose | vote)
 *
 * In production, this would run as an off-chain keeper (Node.js service)
 * or be delegated to a hot wallet with limited signing authority.
 */

/* ── Agent strategy presets ── */

export type StrategyPreset =
  | 'dca'           // Dollar-cost average: buy X tokens every N hours
  | 'trend'         // Trend following: buy on up-momentum, sell on down
  | 'reversion'     // Mean reversion: buy dips, sell peaks
  | 'yield'         // Yield farming: auto-route idle funds to DeFi
  | 'custom'        // User-defined rules only

export const STRATEGY_DESCRIPTIONS: Record<StrategyPreset, string> = {
  dca:      'Buy a fixed amount of target tokens on a regular schedule, regardless of price.',
  trend:    'Follow price momentum — buy when trending up, sell when trend reverses.',
  reversion:'Buy when price dips X% from recent high, sell when it recovers.',
  yield:    'Keep vault funds earning yield. Auto-propose DeFi deposits when idle.',
  custom:   'Build your own rules from scratch.',
}

/* ── Trigger conditions ── */

export type TriggerType =
  | 'price_below'       // token price < threshold
  | 'price_above'       // token price > threshold
  | 'price_drop_pct'    // price dropped X% from last check
  | 'price_rise_pct'    // price rose X% from last check
  | 'time_interval'     // every N minutes
  | 'vault_idle'        // no trades in last N hours
  | 'proposal_created'  // new proposal appeared
  | 'price_impact_ok'   // Jupiter price impact < X%

export interface Trigger {
  id: string
  type: TriggerType
  tokenMint?: string     // which token to watch
  tokenSymbol?: string
  threshold?: number     // price / pct / minutes / hours
  enabled: boolean
}

/* ── Actions ── */

export type ActionType =
  | 'propose_swap'         // create a swap proposal
  | 'propose_limit_order'  // create a limit-order proposal (Jupiter-style trigger)
  | 'propose_dca'          // schedule a DCA over N cycles
  | 'vote_yes'             // vote YES on matching proposals
  | 'vote_no'              // vote NO on matching proposals
  | 'alert'                // just log/notify, don't act on-chain

export interface Action {
  id: string
  type: ActionType
  // ─── propose_swap / propose_limit_order / propose_dca ──────────────────
  fromMint?: string
  fromSymbol?: string
  toMint?: string
  toSymbol?: string
  amountPct?: number       // % of vault balance to use (swap, limit, dca)
  // ─── propose_limit_order only ──────────────────────────────────────────
  triggerPriceUi?: number  // strike price in `toSymbol` per `fromSymbol`
  expiredAt?: number       // unix sec when the order expires (0 = never)
  // ─── propose_dca only ──────────────────────────────────────────────────
  totalCycles?: number       // how many slices (default 7)
  cycleSecondsApart?: number // gap between slices (default 86400 = 1d)
  // ─── vote_* ────────────────────────────────────────────────────────────
  proposalFilter?: 'any' | 'swap_only' | 'by_trusted_member'
  trustedMembers?: string[]
  maxPriceImpactPct?: number   // only vote YES if impact < this
  label: string          // human-readable description
}

/* ── Rule = Trigger + Action ── */

export interface AgentRule {
  id: string
  name: string
  enabled: boolean
  trigger: Trigger
  action: Action
  cooldownMinutes: number    // min time between firings
  lastFiredAt?: number       // unix ms
  fireCount: number
}

/* ── Agent configuration ── */

export interface AgentConfig {
  potPubkey: string
  enabled: boolean
  strategy: StrategyPreset
  rules: AgentRule[]
  /** Only create proposals — never auto-vote */
  proposeOnly: boolean
  /** Max proposals per day */
  maxProposalsPerDay: number
  /** Max auto-votes per day */
  maxVotesPerDay: number
  /** Require price impact < X% for any swap proposal */
  globalMaxPriceImpactPct: number
  createdAt: number
}

/* ── Activity log ── */

export type LogLevel = 'info' | 'success' | 'warn' | 'error'

export interface AgentLogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  ruleId?: string
  ruleName?: string
  txSig?: string
}

/* ── Rule evaluation result ── */

export interface EvalResult {
  rule: AgentRule
  triggered: boolean
  reason: string
  marketData?: Record<string, number>
}

/* ── Market snapshot ── */

export interface MarketSnapshot {
  prices: Record<string, number>        // mint → USD price
  priceChangePct: Record<string, number> // mint → % change vs last snapshot
  timestamp: number
}

/* ── Evaluator ── */

export function evaluateRule(
  rule: AgentRule,
  snapshot: MarketSnapshot
): EvalResult {
  if (!rule.enabled) {
    return { rule, triggered: false, reason: 'Rule disabled' }
  }

  // Cooldown check
  if (rule.lastFiredAt) {
    const elapsed = (Date.now() - rule.lastFiredAt) / 60000 // minutes
    if (elapsed < rule.cooldownMinutes) {
      return {
        rule,
        triggered: false,
        reason: `Cooldown: ${Math.ceil(rule.cooldownMinutes - elapsed)}m remaining`,
      }
    }
  }

  const { trigger } = rule
  const mint = trigger.tokenMint ?? ''
  const price = snapshot.prices[mint] ?? 0
  const changePct = snapshot.priceChangePct[mint] ?? 0
  const threshold = trigger.threshold ?? 0

  switch (trigger.type) {
    case 'price_below':
      return {
        rule,
        triggered: price > 0 && price < threshold,
        reason: price < threshold
          ? `✅ ${trigger.tokenSymbol} price $${price.toFixed(6)} < $${threshold}`
          : `❌ $${price.toFixed(6)} ≥ $${threshold}`,
        marketData: { price },
      }

    case 'price_above':
      return {
        rule,
        triggered: price > threshold,
        reason: price > threshold
          ? `✅ ${trigger.tokenSymbol} price $${price.toFixed(6)} > $${threshold}`
          : `❌ $${price.toFixed(6)} ≤ $${threshold}`,
        marketData: { price },
      }

    case 'price_drop_pct':
      return {
        rule,
        triggered: changePct < -threshold,
        reason: changePct < -threshold
          ? `✅ ${trigger.tokenSymbol} dropped ${changePct.toFixed(2)}% (> -${threshold}%)`
          : `❌ Change: ${changePct.toFixed(2)}% (threshold -${threshold}%)`,
        marketData: { changePct },
      }

    case 'price_rise_pct':
      return {
        rule,
        triggered: changePct > threshold,
        reason: changePct > threshold
          ? `✅ ${trigger.tokenSymbol} rose +${changePct.toFixed(2)}% (> +${threshold}%)`
          : `❌ Change: +${changePct.toFixed(2)}% (threshold +${threshold}%)`,
        marketData: { changePct },
      }

    case 'time_interval':
      // Always triggered (cooldown handles frequency)
      return {
        rule,
        triggered: true,
        reason: `⏱ Time interval: every ${trigger.threshold}m`,
      }

    case 'vault_idle':
      // Simplified: always fires (would check last trade time on-chain)
      return {
        rule,
        triggered: true,
        reason: `💤 Vault idle for ${threshold}+ hours`,
      }

    case 'proposal_created':
      // Handled externally by proposal watcher
      return {
        rule,
        triggered: false,
        reason: 'Waiting for new proposals…',
      }

    default:
      return { rule, triggered: false, reason: 'Unknown trigger type' }
  }
}

/* ── Strategy preset → default rules ── */

const SOL  = 'So11111111111111111111111111111111111111112'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'

function uid() { return Math.random().toString(36).slice(2, 9) }

export function buildDefaultRules(strategy: StrategyPreset, potPubkey: string): AgentRule[] {
  switch (strategy) {
    case 'dca':
      return [
        {
          id: uid(), name: 'DCA Buy SOL every 4h', enabled: true,
          trigger: { id: uid(), type: 'time_interval', tokenMint: SOL, tokenSymbol: 'SOL', threshold: 240, enabled: true },
          action: { id: uid(), type: 'propose_swap', fromMint: USDC, fromSymbol: 'USDC', toMint: SOL, toSymbol: 'SOL', amountPct: 10, label: 'DCA: Buy 10% vault in SOL' },
          cooldownMinutes: 240, fireCount: 0,
        },
      ]

    case 'trend':
      return [
        {
          id: uid(), name: 'Buy on +3% rise', enabled: true,
          trigger: { id: uid(), type: 'price_rise_pct', tokenMint: SOL, tokenSymbol: 'SOL', threshold: 3, enabled: true },
          action: { id: uid(), type: 'propose_swap', fromMint: USDC, fromSymbol: 'USDC', toMint: SOL, toSymbol: 'SOL', amountPct: 20, label: 'Trend: Buy SOL on momentum' },
          cooldownMinutes: 60, fireCount: 0,
        },
        {
          id: uid(), name: 'Sell on -3% drop', enabled: true,
          trigger: { id: uid(), type: 'price_drop_pct', tokenMint: SOL, tokenSymbol: 'SOL', threshold: 3, enabled: true },
          action: { id: uid(), type: 'propose_swap', fromMint: SOL, fromSymbol: 'SOL', toMint: USDC, toSymbol: 'USDC', amountPct: 20, label: 'Trend: Sell SOL on reversal' },
          cooldownMinutes: 60, fireCount: 0,
        },
      ]

    case 'reversion':
      return [
        {
          id: uid(), name: 'Buy dip -5%', enabled: true,
          trigger: { id: uid(), type: 'price_drop_pct', tokenMint: SOL, tokenSymbol: 'SOL', threshold: 5, enabled: true },
          action: { id: uid(), type: 'propose_swap', fromMint: USDC, fromSymbol: 'USDC', toMint: SOL, toSymbol: 'SOL', amountPct: 25, label: 'Reversion: Buy the dip' },
          cooldownMinutes: 120, fireCount: 0,
        },
        {
          id: uid(), name: 'Take profit +10%', enabled: true,
          trigger: { id: uid(), type: 'price_rise_pct', tokenMint: SOL, tokenSymbol: 'SOL', threshold: 10, enabled: true },
          action: { id: uid(), type: 'propose_swap', fromMint: SOL, fromSymbol: 'SOL', toMint: USDC, toSymbol: 'USDC', amountPct: 30, label: 'Reversion: Take profit' },
          cooldownMinutes: 120, fireCount: 0,
        },
      ]

    case 'yield':
      return [
        {
          id: uid(), name: 'Auto-vote low-impact swaps', enabled: true,
          trigger: { id: uid(), type: 'proposal_created', enabled: true },
          action: { id: uid(), type: 'vote_yes', proposalFilter: 'swap_only', maxPriceImpactPct: 1.0, label: 'Vote YES on swaps with < 1% impact' },
          cooldownMinutes: 0, fireCount: 0,
        },
        {
          id: uid(), name: 'Alert when vault idle > 24h', enabled: true,
          trigger: { id: uid(), type: 'vault_idle', threshold: 24, enabled: true },
          action: { id: uid(), type: 'alert', label: 'Vault is idle — consider DeFi routing' },
          cooldownMinutes: 360, fireCount: 0,
        },
      ]

    default:
      return []
  }
}

export function createDefaultConfig(potPubkey: string, strategy: StrategyPreset): AgentConfig {
  return {
    potPubkey,
    enabled: false,
    strategy,
    rules: buildDefaultRules(strategy, potPubkey),
    proposeOnly: true,   // safe default
    maxProposalsPerDay: 5,
    maxVotesPerDay: 10,
    globalMaxPriceImpactPct: 2.0,
    createdAt: Date.now(),
  }
}
