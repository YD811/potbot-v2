/**
 * PotBot DB layer — Supabase operations
 *
 * All writes use the service-role key (server-side only).
 * All reads use the anon key (client-safe).
 */

import { supabase, createServerSupabase, isSupabaseConfigured } from './supabase'
import type {
  DbPot, DbMember, DbProposal, DbVote,
  DbReferral, DbAgentRule, DbGovernanceSettings,
} from './supabase'

// ─── Pots ────────────────────────────────────────────────────────────────────

export async function getPots(): Promise<DbPot[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .order('balance', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPot(pubkey: string): Promise<DbPot | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .eq('pubkey', pubkey)
    .single()
  if (error) return null
  return data
}

export async function upsertPot(pot: Partial<DbPot> & { pubkey: string }) {
  const db = createServerSupabase()
  const { error } = await db
    .from('pots')
    .upsert({ ...pot, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function updatePotBalance(pubkey: string, delta: number) {
  const db = createServerSupabase()
  const { error } = await db.rpc('increment_pot_balance', { p_pubkey: pubkey, p_delta: delta })
  if (error) {
    // fallback: read then write
    const { data } = await db.from('pots').select('balance').eq('pubkey', pubkey).single()
    if (data) {
      await db.from('pots').update({ balance: data.balance + delta, updated_at: new Date().toISOString() }).eq('pubkey', pubkey)
    }
  }
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function getMembers(potPubkey: string): Promise<DbMember[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('pot_pubkey', potPubkey)
  if (error) throw error
  return data ?? []
}

export async function getMember(potPubkey: string, wallet: string): Promise<DbMember | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .eq('wallet', wallet)
    .single()
  return data ?? null
}

export async function upsertMember(member: Omit<DbMember, 'id' | 'joined_at'> & { id?: string }) {
  const db = createServerSupabase()
  const { error } = await db.from('members').upsert(member, { onConflict: 'pot_pubkey,wallet' })
  if (error) throw error
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export async function getProposals(potPubkey: string): Promise<DbProposal[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProposal(pubkey: string): Promise<DbProposal | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.from('proposals').select('*').eq('pubkey', pubkey).single()
  return data ?? null
}

export async function createProposal(proposal: Omit<DbProposal, 'created_at' | 'executed_at'>) {
  const db = createServerSupabase()
  const { data, error } = await db.from('proposals').insert(proposal).select().single()
  if (error) throw error
  // bump next_proposal_id on pot
  await db.from('pots')
    .update({ next_proposal_id: proposal.proposal_id + 1, updated_at: new Date().toISOString() })
    .eq('pubkey', proposal.pot_pubkey)
  return data
}

export async function updateProposalStatus(pubkey: string, status: string) {
  const db = createServerSupabase()
  const update: Record<string, unknown> = { status }
  if (status === 'executed') update.executed_at = new Date().toISOString()
  const { error } = await db.from('proposals').update(update).eq('pubkey', pubkey)
  if (error) throw error
}

// ─── Votes ───────────────────────────────────────────────────────────────────

export async function getVotes(proposalPubkey: string): Promise<DbVote[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('proposal_pubkey', proposalPubkey)
  if (error) throw error
  return data ?? []
}

export async function castVote(vote: Omit<DbVote, 'id' | 'voted_at'>) {
  const db = createServerSupabase()
  const { error } = await db.from('votes').upsert(vote, { onConflict: 'proposal_pubkey,voter' })
  if (error) throw error
  // update proposal tallies
  const votes = await getVotes(vote.proposal_pubkey)
  const yes = votes.filter(v => v.approve).reduce((s, v) => s + v.shares, 0)
  const no = votes.filter(v => !v.approve).reduce((s, v) => s + v.shares, 0)
  await db.from('proposals').update({ yes_shares: yes, no_shares: no }).eq('pubkey', vote.proposal_pubkey)
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export async function getReferrals(potPubkey: string, wallet: string): Promise<DbReferral[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .or(`referrer.eq.${wallet},parent_referrer.eq.${wallet}`)
  if (error) throw error
  return data ?? []
}

export async function trackReferral(referral: Omit<DbReferral, 'id' | 'created_at'>) {
  const db = createServerSupabase()
  const { error } = await db.from('referrals').insert(referral)
  if (error) throw error
}

// ─── Agent Rules ─────────────────────────────────────────────────────────────

export async function getAgentRules(potPubkey: string): Promise<DbAgentRule[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('agent_rules')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .eq('enabled', true)
  if (error) throw error
  return data ?? []
}

export async function getAllEnabledRules(): Promise<DbAgentRule[]> {
  const db = createServerSupabase()
  const { data, error } = await db
    .from('agent_rules')
    .select('*')
    .eq('enabled', true)
  if (error) throw error
  return data ?? []
}

export async function upsertAgentRule(rule: Omit<DbAgentRule, 'id' | 'created_at'> & { id?: string }) {
  const db = createServerSupabase()
  const { error } = await db.from('agent_rules').upsert(rule, { onConflict: 'pot_pubkey,rule_id' })
  if (error) throw error
}

export async function markRuleTriggered(potPubkey: string, ruleId: string) {
  const db = createServerSupabase()
  await db.from('agent_rules')
    .update({ last_fired_at: new Date().toISOString(), last_triggered_at: new Date().toISOString() })
    .eq('pot_pubkey', potPubkey)
    .eq('rule_id', ruleId)
}

// ─── Governance Settings ─────────────────────────────────────────────────────

export async function getGovernanceSettings(potPubkey: string): Promise<DbGovernanceSettings | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('governance_settings')
    .select('*')
    .eq('pot_pubkey', potPubkey)
    .single()
  return data ?? null
}

export async function upsertGovernanceSettings(settings: DbGovernanceSettings) {
  const db = createServerSupabase()
  const { error } = await db.from('governance_settings')
    .upsert({ ...settings, updated_at: new Date().toISOString() })
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
    .single()
  return data?.price ?? null
}
