/**
 * Supabase client — typed database access for PotBot API
 * Uses service role key for server-side operations
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[supabase] Missing env vars — DB persistence disabled. Set SUPABASE_URL + SUPABASE_SERVICE_KEY')
}

export const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })
  : null

export const isDbEnabled = () => supabase !== null

// ── Type Helpers ────────────────────────────────────────────────────────────

export interface PriceSnapshot {
  mint: string
  price_usd: number
  captured_at?: string
}

export interface NavSnapshot {
  pot_pubkey: string
  nav_usd: number
  total_shares: number
  sol_balance_lamports: number
  captured_at?: string
}

export interface Position {
  pot_pubkey: string
  mint: string
  symbol?: string
  amount: number
  entry_price: number
  entry_value: number
  opened_at?: string
  closed_at?: string | null
  proposal_id?: number
  entry_tx?: string
}

export interface SwapExecution {
  pot_pubkey: string
  proposal_id: number
  from_mint: string
  to_mint: string
  amount_in: number
  min_amount_out: number
  amount_out?: number
  price_impact?: number
  jupiter_route?: unknown
  tx_signature?: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  error?: string
}

export interface AgentLog {
  pot_pubkey: string
  rule_id: string
  rule_name: string
  trigger_desc: string
  action_desc: string
  proposal_created: boolean
  proposal_id?: number
  tx_signature?: string
  error?: string
}

// ── Write Helpers ────────────────────────────────────────────────────────────

export async function insertPriceSnapshot(data: PriceSnapshot) {
  if (!supabase) return
  await supabase.from('price_snapshots').insert(data)
}

export async function insertNavSnapshot(data: NavSnapshot) {
  if (!supabase) return
  const { error } = await supabase.from('nav_snapshots').insert(data)
  if (error) console.error('[db] insertNavSnapshot:', error.message)
}

export async function upsertPositions(potPubkey: string, positions: Position[]) {
  if (!supabase) return
  // Close existing open positions for this pot
  await supabase
    .from('positions')
    .update({ closed_at: new Date().toISOString() })
    .eq('pot_pubkey', potPubkey)
    .is('closed_at', null)
  // Insert new positions
  if (positions.length > 0) {
    const { error } = await supabase.from('positions').insert(
      positions.map(p => ({ ...p, pot_pubkey: potPubkey }))
    )
    if (error) console.error('[db] upsertPositions:', error.message)
  }
}

export async function insertSwapExecution(data: SwapExecution): Promise<number | null> {
  if (!supabase) return null
  const { data: row, error } = await supabase
    .from('swap_executions')
    .insert(data)
    .select('id')
    .single()
  if (error) {
    console.error('[db] insertSwapExecution:', error.message)
    return null
  }
  return row?.id ?? null
}

export async function updateSwapExecution(
  id: number,
  update: Partial<SwapExecution> & { confirmed_at?: string }
) {
  if (!supabase) return
  const { error } = await supabase
    .from('swap_executions')
    .update(update)
    .eq('id', id)
  if (error) console.error('[db] updateSwapExecution:', error.message)
}

export async function insertAgentLog(data: AgentLog) {
  if (!supabase) return
  const { error } = await supabase.from('agent_logs').insert(data)
  if (error) console.error('[db] insertAgentLog:', error.message)
}

export async function upsertPot(data: {
  pubkey: string
  name: string
  emoji?: string
  authority: string
  is_public: boolean
  member_count: number
  trade_count: number
  total_volume: number
  tamagotchi_level: number
  agent_pubkey?: string | null
  agent_max_trade_bps: number
  created_at?: string
}) {
  if (!supabase) return
  const { error } = await supabase
    .from('pots')
    .upsert({ ...data, synced_at: new Date().toISOString() }, { onConflict: 'pubkey' })
  if (error) console.error('[db] upsertPot:', error.message)
}

// ── Read Helpers ────────────────────────────────────────────────────────────

export async function getNavHistory(
  potPubkey: string,
  days = 30
): Promise<Array<{ ts: number; nav: number }>> {
  if (!supabase) return []
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data, error } = await supabase
    .from('nav_snapshots')
    .select('nav_usd, captured_at')
    .eq('pot_pubkey', potPubkey)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true })
  if (error || !data) return []
  return data.map(r => ({
    ts: new Date(r.captured_at).getTime() / 1000,
    nav: Number(r.nav_usd),
  }))
}

export async function getOpenPositions(potPubkey: string): Promise<Position[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .is('closed_at', null)
  if (error || !data) return []
  return data
}

export async function getSwapHistory(
  potPubkey: string,
  limit = 20
): Promise<SwapExecution[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('swap_executions')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .order('executed_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data
}

export async function getAgentLogs(
  potPubkey: string,
  limit = 50
): Promise<AgentLog[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .order('logged_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data
}
