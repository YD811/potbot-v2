// apps/keeper/src/supabase-sync.ts
// Syncs on-chain state snapshots to Supabase after every registry refresh
// Uses service role key -- full write access, runs server-side only.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Snapshot types (adapt to your actual on-chain data structures) ──────────

export interface PotSnapshot {
  address: { toBase58(): string }
  authority: { toBase58(): string }
  agentAuthority?: { toBase58(): string } | null
  paused: boolean
  feeReserveLamports: bigint | number
  allowedMints: Array<{ toBase58(): string }>
}

export interface StrategySnapshot {
  address: { toBase58(): string }
  pot: { toBase58(): string }
  slotId: bigint | number
  status: 'Pending' | 'Active' | 'Parked' | 'Closed'
  inputMint: { toBase58(): string }
  outputMint: { toBase58(): string }
  priceFeedId?: string | null
  entryPriceX64: { toString(): string }
  trailingHighPriceX64: { toString(): string }
  stopLossBps?: number | null
  takeProfitBps?: number | null
  trailingStopBps?: number | null
  sizeIn: { toString(): string }
  sizeOut: { toString(): string }
  executorNonce: number
  executedAt?: number | null
}

// ─── Singleton Supabase client ────────────────────────────────────────────────

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set')
  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}

// ─── Sync functions ───────────────────────────────────────────────────────────

export async function syncPotsToSupabase(pots: PotSnapshot[]): Promise<void> {
  if (pots.length === 0) return
  const db = getClient()

  const rows = pots.map((p) => ({
    pubkey: p.address.toBase58(),
    authority: p.authority.toBase58(),
    agent_authority: p.agentAuthority?.toBase58() ?? null,
    paused: p.paused,
    fee_reserve_lamports: Number(p.feeReserveLamports),
    allowed_mints: p.allowedMints.map((m) => m.toBase58()),
    synced_at: new Date().toISOString(),
  }))

  const { error } = await db
    .from('pots')
    .upsert(rows, { onConflict: 'pubkey', ignoreDuplicates: false })

  if (error) throw new Error('syncPots: ' + error.message)
}

export async function syncStrategiesToSupabase(strategies: StrategySnapshot[]): Promise<void> {
  if (strategies.length === 0) return
  const db = getClient()

  const rows = strategies.map((s) => ({
    address: s.address.toBase58(),
    pot: s.pot.toBase58(),
    slot_id: Number(s.slotId),
    status: s.status,
    input_mint: s.inputMint.toBase58(),
    output_mint: s.outputMint.toBase58(),
    price_feed_id: s.priceFeedId ?? null,
    entry_price_x64: s.entryPriceX64.toString(),
    trailing_high_x64: s.trailingHighPriceX64.toString(),
    stop_loss_bps: s.stopLossBps ?? null,
    take_profit_bps: s.takeProfitBps ?? null,
    trailing_stop_bps: s.trailingStopBps ?? null,
    size_in: s.sizeIn.toString(),
    size_out: s.sizeOut.toString(),
    executor_nonce: s.executorNonce,
    executed_at: s.executedAt ?? null,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await db
    .from('strategies')
    .upsert(rows, { onConflict: 'address', ignoreDuplicates: false })

  if (error) throw new Error('syncStrategies: ' + error.message)
}

export async function logTradeToSupabase(params: {
  potPubkey: string
  strategyAddress: string
  signature: string
  inputMint: string
  outputMint: string
  amountIn: bigint
  amountOut: bigint
  priceUsdEntry: number | null
  priceUsdExit: number | null
  triggerReason: string
}): Promise<void> {
  const db = getClient()

  const pnlUsd =
    params.priceUsdEntry != null && params.priceUsdExit != null
      ? Number(params.amountOut) * params.priceUsdExit / 1e9 -
        Number(params.amountIn) * params.priceUsdEntry / 1e9
      : null

  const pnlPct =
    pnlUsd != null && params.priceUsdEntry != null && Number(params.amountIn) > 0
      ? (pnlUsd / (Number(params.amountIn) * params.priceUsdEntry / 1e9)) * 100
      : null

  const { error } = await db.from('trade_log').insert({
    pot: params.potPubkey,
    strategy: params.strategyAddress,
    signature: params.signature,
    input_mint: params.inputMint,
    output_mint: params.outputMint,
    amount_in: params.amountIn.toString(),
    amount_out: params.amountOut.toString(),
    price_usd_entry: params.priceUsdEntry,
    price_usd_exit: params.priceUsdExit,
    pnl_usd: pnlUsd,
    pnl_pct: pnlPct,
    trigger_reason: params.triggerReason,
    executed_at: new Date().toISOString(),
  })

  if (error && !error.message.includes('duplicate')) {
    throw new Error('logTrade: ' + error.message)
  }
}

// ─── Convenience: sync both pots and strategies in one call ──────────────────

export async function syncAllToSupabase(
  pots: PotSnapshot[],
  strategies: StrategySnapshot[],
): Promise<void> {
  const results = await Promise.allSettled([
    syncPotsToSupabase(pots),
    syncStrategiesToSupabase(strategies),
  ])

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[supabase-sync] error:', result.reason)
    }
  }
}
