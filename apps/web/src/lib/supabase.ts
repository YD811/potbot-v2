import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Browser / client-side Supabase client (anon key) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Server-side Supabase client with full service-role access.
 *  Only use in API routes and cron jobs — never expose to browser.
 */
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } }
  )
}

/** True when Supabase env vars are configured */
export const isSupabaseConfigured: boolean = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export interface DbPot {
  pubkey: string; name: string; emoji: string; authority: string
  balance: number; total_shares: number; member_count: number
  trade_count: number; total_volume: number; is_public: boolean
  yield_strategy: number; governance_level: number; next_proposal_id: number
  tamagotchi_emoji: string; created_at: string; updated_at: string
}
export interface DbMember {
  id: string; pot_pubkey: string; wallet: string
  shares: number; deposit_total: number; joined_at: string
}
export interface DbProposal {
  pubkey: string; pot_pubkey: string; proposal_id: number; type: string
  description: string | null; status: string; yes_shares: number
  no_shares: number; total_shares_snapshot: number; proposer: string | null
  entry_price: number | null; created_at: string
  expires_at: string | null; executed_at: string | null
}
export interface DbVote {
  id: string; proposal_pubkey: string; voter: string
  approve: boolean; shares: number; voted_at: string
}
export interface DbReferral {
  id: string; pot_pubkey: string; referrer: string; parent_referrer: string
  referee: string; deposit_amount: number; level1_earning: number
  level2_earning: number; created_at: string
}
export interface DbAgentRule {
  id: string; pot_pubkey: string; rule_id: string; name: string
  enabled: boolean; trigger_type: string; trigger_threshold: number | null
  trigger_interval: number | null; action_type: string; action_amount: number
  action_token: string; cooldown_minutes: number
  last_triggered_at: string | null; created_at: string
}
export interface DbGovernanceSettings {
  pot_pubkey: string; quorum_pct: number; approval_pct: number
  voting_window_hours: number; risk_level: string; max_swap_pct: number
  max_budget_grant_pct: number; require_admin_co_sign: boolean; updated_at: string
}
export interface DbPriceHistory {
  id: string; token: string; price: number; recorded_at: string
}
