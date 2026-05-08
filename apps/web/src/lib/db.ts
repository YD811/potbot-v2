/**
 * PotBot DB layer — Supabase operations
 *
 * Reads use the anon key (client-safe). Writes use the service-role key
 * (server-side only — never imported into a client component).
 *
 * IMPORTANT: column names below match the live Postgres schema, NOT the
 * earlier doc/spec. Real schema: `pot` (not `pot_pubkey`), no `balance`
 * on pots (it lives in `vault_balances`), no `executed_at` on proposals,
 * no `votes` / `referrals` tables (yet — those reads return empty).
 */

import { supabase, createServerSupabase, isSupabaseConfigured } from './supabase'
import type {
  Pot, Member, Proposal,
  AgentRule, GovernanceSettings,
  LeaderboardEntry,
} from './supabase'

// ─── Pots ────────────────────────────────────────────────────────────────────

export async function getPots(): Promise<Pot[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Pot[]
}

export async function getPot(pubkey: string): Promise<Pot | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .eq('pubkey', pubkey)
    .single()
  if (error) return null
  return data as Pot
}

export async function upsertPot(pot: Partial<Pot> & { pubkey: string }) {
  const db = createServerSupabase()
  const { error } = await db
    .from('pots')
    .upsert({ ...pot, synced_at: new Date().toISOString() })
  if (error) throw error
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function getMembers(potPubkey: string): Promise<Member[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('pot', potPubkey)
  if (error) throw error
  return (data ?? []) as Member[]
}

export async function getMember(potPubkey: string, wallet: string): Promise<Member | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('pot', potPubkey)
    .eq('wallet', wallet)
    .maybeSingle()
  return (data ?? null) as Member | null
}

export async function upsertMember(member: Partial<Member> & { pot: string; wallet: string; id?: string }) {
  const db = createServerSupabase()
  const id = member.id ?? `${member.pot}-${member.wallet}`
  const { error } = await db
    .from('members')
    .upsert({ ...member, id, synced_at: new Date().toISOString() })
  if (error) throw error
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export async function getProposals(potPubkey: string): Promise<Proposal[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('pot', potPubkey)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Proposal[]
}

export async function getProposal(pubkey: string): Promise<Proposal | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.from('proposals').select('*').eq('pubkey', pubkey).maybeSingle()
  return (data ?? null) as Proposal | null
}

export async function createProposal(
  proposal: Omit<Proposal, 'created_at' | 'synced_at'> & { pot: string },
) {
  const db = createServerSupabase()
  const { data, error } = await db
    .from('proposals')
    .insert({ ...proposal, synced_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  // Note: pots.next_proposal_id is on-chain only — no Supabase mirror to bump.
  return data as Proposal
}

export async function updateProposalStatus(
  pubkey: string,
  status: Proposal['status'],
) {
  const db = createServerSupabase()
  const { error } = await db
    .from('proposals')
    .update({ status, synced_at: new Date().toISOString() })
    .eq('pubkey', pubkey)
  if (error) throw error
}

// ─── Votes / Referrals ──────────────────────────────────────────────────────
//
// Both tables intentionally absent from the current Postgres schema. Vote
// tallies live on-chain (VoterRecord PDAs) and are summed into
// proposals.{yes_shares,no_shares} by whichever indexer pushes them. Referral
// tracking is reserved for the protocol-economics phase.
//
// If you need either off-chain table, add the migration first, then add real
// helpers here — don't ship stubs.

// ─── Agent Rules ─────────────────────────────────────────────────────────────

export async function getAgentRules(potPubkey: string): Promise<AgentRule[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('agent_rules')
    .select('*')
    .eq('pot', potPubkey)
    .eq('enabled', true)
  if (error) throw error
  return (data ?? []) as AgentRule[]
}

export async function getAllEnabledRules(): Promise<AgentRule[]> {
  const db = createServerSupabase()
  const { data, error } = await db
    .from('agent_rules')
    .select('*')
    .eq('enabled', true)
  if (error) throw error
  return (data ?? []) as AgentRule[]
}

export async function upsertAgentRule(
  rule: Partial<AgentRule> & { pot: string; name: string },
) {
  const db = createServerSupabase()
  const { error } = await db
    .from('agent_rules')
    .upsert({ ...rule, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function markRuleTriggered(ruleId: string) {
  const db = createServerSupabase()
  // PK on agent_rules is `id` (uuid). Update by id directly — no compound key.
  await db
    .from('agent_rules')
    .update({ last_fired_at: new Date().toISOString() })
    .eq('id', ruleId)
}

// ─── Governance Settings ─────────────────────────────────────────────────────
// (Read helper here returns nullable; supabase.ts has a richer version with
// defaults — prefer that one in UI, this one is for server tools.)

export async function getGovernanceSettingsRaw(potPubkey: string): Promise<GovernanceSettings | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('governance_settings')
    .select('*')
    .eq('pot', potPubkey)
    .maybeSingle()
  return (data ?? null) as GovernanceSettings | null
}

export async function upsertGovernanceSettings(
  settings: Partial<GovernanceSettings> & { pot: string },
) {
  const db = createServerSupabase()
  const { error } = await db
    .from('governance_settings')
    .upsert({ ...settings, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ─── Vault balances ──────────────────────────────────────────────────────────

export async function upsertVaultBalance(args: {
  pot: string
  mint: string
  amount: number | string
  amountUsd?: number | null
}) {
  const db = createServerSupabase()
  const id = `${args.pot}-${args.mint}`
  const { error } = await db
    .from('vault_balances')
    .upsert({
      id,
      pot: args.pot,
      mint: args.mint,
      amount: args.amount,
      amount_usd: args.amountUsd ?? null,
      synced_at: new Date().toISOString(),
    })
  if (error) throw error
}

// ─── Leaderboard cache ───────────────────────────────────────────────────────

export async function getLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('leaderboard_cache')
    .select('*, pots ( name, emoji, description, is_public )')
    .order('pnl_7d_pct', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as LeaderboardEntry[]
}

export async function upsertLeaderboardRow(row: Partial<LeaderboardEntry> & { pot: string }) {
  const db = createServerSupabase()
  const { error } = await db
    .from('leaderboard_cache')
    .upsert({ ...row, refreshed_at: new Date().toISOString() })
  if (error) throw error
}

// ─── Price History ────────────────────────────────────────────────────────────

export async function recordPrice(token: string, price: number) {
  const db = createServerSupabase()
  const { error } = await db.from('price_history').insert({ token, price })
  if (error) throw error
}

export async function getLatestPrice(token = 'SOL'): Promise<number | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('price_history')
    .select('price')
    .eq('token', token)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.price as number | undefined) ?? null
}
