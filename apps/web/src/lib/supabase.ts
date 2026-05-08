// apps/web/src/lib/supabase.ts
// Supabase client for PotBot v2 web app
// Reads: anon key (public)
// Writes: anon key (governance_settings, agent_rules, pots_metadata)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

/** True when browser-facing Supabase env vars are configured */
export const isSupabaseConfigured: boolean = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

/** Server-side Supabase client with full service-role access.
 * Only use in API routes and cron jobs -- never expose to browser.
 */
export function createServerSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing Supabase server env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    )
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

// ─── Types ──────────────────────────────────────────────────────

export interface Pot {
  pubkey: string
  authority: string
  agent_authority: string | null
  paused: boolean
  fee_reserve_lamports: number
  allowed_mints: string[]
  name: string | null
  emoji: string
  description: string | null
  is_public: boolean
  synced_at: string
  created_at: string
}

export interface Strategy {
  address: string
  pot: string
  slot_id: number | null
  status: 'Pending' | 'Active' | 'Parked' | 'Closed'
  input_mint: string
  output_mint: string
  price_feed_id: string | null
  entry_price_x64: string | null
  trailing_high_x64: string | null
  stop_loss_bps: number | null
  take_profit_bps: number | null
  trailing_stop_bps: number | null
  size_in: string
  size_out: string
  executor_nonce: number
  synced_at: string
}

export interface Member {
  id: string
  pot: string
  wallet: string
  shares: string
  deposit_total: string
  synced_at: string
}

export interface Proposal {
  pubkey: string
  pot: string
  proposal_id: number
  proposal_type: string | null
  description: string | null
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Expired' | null
  yes_shares: string
  no_shares: string
  total_shares_snap: string
  price_usd_at_creation: number | null
  synced_at: string
  created_at: string
}

export interface GovernanceSettings {
  pot: string
  quorum_pct: number
  approval_pct: number
  voting_window_hours: number
  risk_level: 'conservative' | 'moderate' | 'aggressive'
  max_swap_pct: number
  max_budget_grant_pct: number
  require_admin_co_sign: boolean
  updated_at: string
  updated_by: string | null
}

export interface AgentRule {
  id: string
  pot: string
  name: string
  enabled: boolean
  trigger_type: 'price_above' | 'price_below' | 'time_interval' | 'balance_above' | 'balance_below'
  trigger_threshold: number | null
  trigger_token: string | null
  trigger_interval_minutes: number | null
  action_type: 'propose_swap' | 'vote_yes' | 'alert'
  action_amount: number | null
  action_token: string | null
  cooldown_minutes: number
  last_fired_at: string | null
  created_at: string
  updated_at: string
}

export interface LeaderboardEntry {
  pot: string
  total_volume_usd: number
  pnl_7d_usd: number
  pnl_7d_pct: number
  pnl_all_time_usd: number
  member_count: number
  trade_count: number
  last_trade_at: string | null
  refreshed_at: string
  // joined from pots
  pots?: Pick<Pot, 'name' | 'emoji' | 'description' | 'is_public'>
}

export interface TradeLogEntry {
  id: string
  pot: string
  strategy: string
  signature: string
  input_mint: string
  output_mint: string
  amount_in: string
  amount_out: string
  price_usd_entry: number | null
  price_usd_exit: number | null
  pnl_usd: number | null
  pnl_pct: number | null
  trigger_reason: string | null
  executed_at: string
}

// ─── Governance helpers ─────────────────────────────────────────

export const DEFAULT_GOV_SETTINGS: Omit<GovernanceSettings, 'pot' | 'updated_at' | 'updated_by'> = {
  quorum_pct: 51,
  approval_pct: 66,
  voting_window_hours: 48,
  risk_level: 'moderate',
  max_swap_pct: 25,
  max_budget_grant_pct: 10,
  require_admin_co_sign: false,
}

export async function getGovernanceSettings(potPubkey: string): Promise<GovernanceSettings> {
  const { data, error } = await supabase
    .from('governance_settings')
    .select('*')
    .eq('pot', potPubkey)
    .single()

  if (error || !data) {
    return {
      pot: potPubkey,
      updated_at: new Date().toISOString(),
      updated_by: null,
      ...DEFAULT_GOV_SETTINGS,
    }
  }
  return data as GovernanceSettings
}

export async function saveGovernanceSettings(
  potPubkey: string,
  settings: Omit<GovernanceSettings, 'pot' | 'updated_at'>,
  walletAddress?: string,
): Promise<void> {
  const { error } = await supabase
    .from('governance_settings')
    .upsert({
      pot: potPubkey,
      ...settings,
      updated_at: new Date().toISOString(),
      updated_by: walletAddress ?? null,
    }, { onConflict: 'pot' })

  if (error) throw new Error('saveGovernanceSettings: ' + error.message)
}

// ─── Agent rules helpers ────────────────────────────────────────

export async function getAgentRules(potPubkey: string): Promise<AgentRule[]> {
  const { data, error } = await supabase
    .from('agent_rules')
    .select('*')
    .eq('pot', potPubkey)
    .order('created_at', { ascending: true })

  if (error) throw new Error('getAgentRules: ' + error.message)
  return (data ?? []) as AgentRule[]
}

export async function upsertAgentRule(
  potPubkey: string,
  rule: Omit<AgentRule, 'pot' | 'created_at' | 'updated_at'>,
): Promise<AgentRule> {
  const payload = {
    ...rule,
    pot: potPubkey,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('agent_rules')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw new Error('upsertAgentRule: ' + error.message)
  return data as AgentRule
}

export async function deleteAgentRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('agent_rules')
    .delete()
    .eq('id', ruleId)

  if (error) throw new Error('deleteAgentRule: ' + error.message)
}

// ─── Leaderboard ────────────────────────────────────────────────

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_cache')
    .select('*, pots(name, emoji, description, is_public)')
    .order('pnl_7d_usd', { ascending: false })
    .limit(limit)

  if (error) throw new Error('getLeaderboard: ' + error.message)
  return (data ?? []) as LeaderboardEntry[]
}

// ─── Trade log ──────────────────────────────────────────────────

export async function getTradeLog(potPubkey: string, limit = 50): Promise<TradeLogEntry[]> {
  const { data, error } = await supabase
    .from('trade_log')
    .select('*')
    .eq('pot', potPubkey)
    .order('executed_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error('getTradeLog: ' + error.message)
  return (data ?? []) as TradeLogEntry[]
}

// ─── Pot metadata ───────────────────────────────────────────────

export async function upsertPotMetadata(
  pubkey: string,
  meta: { name: string; emoji: string; description?: string; is_public?: boolean; authority: string },
): Promise<void> {
  const { error } = await supabase
    .from('pots')
    .upsert({
      pubkey,
      name: meta.name,
      emoji: meta.emoji,
      description: meta.description ?? null,
      is_public: meta.is_public ?? true,
      authority: meta.authority,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'pubkey' })

  if (error) throw new Error('upsertPotMetadata: ' + error.message)
}

// (Legacy `Db*` type aliases removed — they encoded a different set of
// column names that never matched the live Postgres schema. Use the
// canonical types `Pot`, `Member`, `Proposal`, `AgentRule`,
// `GovernanceSettings` directly.)
