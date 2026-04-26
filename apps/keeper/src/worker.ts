// apps/keeper/src/worker.ts
// Polls on-chain registry every SYNC_INTERVAL_MS and pushes snapshots to Supabase.
// Also runs a slower leaderboard cache refresh every LEADERBOARD_INTERVAL_MS.

import { Connection, PublicKey } from '@solana/web3.js'
import {
  syncPotsToSupabase,
  syncStrategiesToSupabase,
  refreshLeaderboardCache,
  type PotSnapshot,
  type StrategySnapshot,
} from './supabase-sync'
import { setStrategiesMonitored, recordWorkerMetric } from './index'

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID_STR = process.env.POTBOT_PROGRAM_ID ?? '2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL'
const SYNC_INTERVAL_MS = Number(process.env.KEEPER_SYNC_INTERVAL_MS ?? 30_000)
const LEADERBOARD_INTERVAL_MS = Number(process.env.KEEPER_LEADERBOARD_INTERVAL_MS ?? 5 * 60_000)

let connection: Connection | null = null
let programId: PublicKey | null = null

function getConnection(): Connection {
  if (!connection) connection = new Connection(RPC_URL, 'confirmed')
  return connection
}

function getProgramId(): PublicKey {
  if (!programId) programId = new PublicKey(PROGRAM_ID_STR)
  return programId
}

interface RegistryState {
  pots: Map<string, PotSnapshot>
  strategies: Map<string, StrategySnapshot>
  lastRefreshTs: number
  lastLeaderboardTs: number
  lastError: string | null
}

const state: RegistryState = {
  pots: new Map(),
  strategies: new Map(),
  lastRefreshTs: 0,
  lastLeaderboardTs: 0,
  lastError: null,
}

/**
 * Refresh registry from chain. This is intentionally minimal: we discover all
 * accounts owned by the program and classify them by data length so the keeper
 * has *something* to sync without requiring a full Anchor coder here. Replace
 * with `program.account.potAccount.all()` once the IDL is wired in.
 */
export async function refreshRegistry(): Promise<RegistryState> {
  try {
    const conn = getConnection()
    const pid = getProgramId()
    const accounts = await conn.getProgramAccounts(pid, { commitment: 'confirmed' })

    const nextPots = new Map<string, PotSnapshot>()
    const nextStrategies = new Map<string, StrategySnapshot>()

    for (const { pubkey, account } of accounts) {
      const data = account.data
      if (!data || data.length < 8) continue
      const addr = pubkey
      if (data.length >= 200 && data.length < 4096) {
        nextPots.set(pubkey.toBase58(), {
          address: addr,
          authority: addr,
          agentAuthority: null,
          paused: false,
          feeReserveLamports: 0,
          allowedMints: [],
        })
      } else if (data.length >= 64 && data.length < 200) {
        nextStrategies.set(pubkey.toBase58(), {
          address: addr,
          pot: addr,
          slotId: 0,
          status: 'Pending',
          inputMint: addr,
          outputMint: addr,
          priceFeedId: null,
          entryPriceX64: { toString: () => '0' },
          trailingHighPriceX64: { toString: () => '0' },
          stopLossBps: null,
          takeProfitBps: null,
          trailingStopBps: null,
          sizeIn: { toString: () => '0' },
          sizeOut: { toString: () => '0' },
          executorNonce: 0,
          executedAt: null,
        })
      }
    }

    state.pots = nextPots
    state.strategies = nextStrategies
    state.lastRefreshTs = Math.floor(Date.now() / 1000)
    state.lastError = null

    setStrategiesMonitored(Array.from(nextStrategies.keys()))
  } catch (err) {
    state.lastError = (err as Error).message
    // eslint-disable-next-line no-console
    console.warn('[keeper.worker] refreshRegistry failed:', state.lastError)
  }
  return state
}

export function getRegistrySnapshot(): RegistryState {
  return state
}

/** One tick: refresh the registry, then push to Supabase. */
export async function tick(): Promise<void> {
  const start = Date.now()
  await refreshRegistry()
  const pots = Array.from(state.pots.values())
  const strategies = Array.from(state.strategies.values())

  const results = await Promise.allSettled([
    pots.length > 0 ? syncPotsToSupabase(pots) : Promise.resolve(),
    strategies.length > 0 ? syncStrategiesToSupabase(strategies) : Promise.resolve(),
  ])

  for (const r of results) {
    if (r.status === 'rejected') {
      // eslint-disable-next-line no-console
      console.warn('[keeper.worker] sync failure:', r.reason)
    }
  }

  recordWorkerMetric({
    ticks: 1,
    lastTickMs: Date.now() - start,
    potsSynced: pots.length,
    strategiesSynced: strategies.length,
  })
}

/** Slower job: refresh the leaderboard cache. */
export async function leaderboardTick(): Promise<void> {
  try {
    await refreshLeaderboardCache()
    state.lastLeaderboardTs = Math.floor(Date.now() / 1000)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[keeper.worker] leaderboard refresh failed:', (err as Error).message)
  }
}

let tickTimer: NodeJS.Timeout | null = null
let leaderboardTimer: NodeJS.Timeout | null = null

export function startWorker(): void {
  if (tickTimer) return
  // eslint-disable-next-line no-console
  console.log('[keeper.worker] tick interval=' + SYNC_INTERVAL_MS + 'ms, leaderboard interval=' + LEADERBOARD_INTERVAL_MS + 'ms')

  void tick()
  tickTimer = setInterval(() => { void tick() }, SYNC_INTERVAL_MS)
  tickTimer.unref()

  void leaderboardTick()
  leaderboardTimer = setInterval(() => { void leaderboardTick() }, LEADERBOARD_INTERVAL_MS)
  leaderboardTimer.unref()
}

export function stopWorker(): void {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
  if (leaderboardTimer) { clearInterval(leaderboardTimer); leaderboardTimer = null }
}
