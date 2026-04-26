// apps/keeper/src/worker.ts
// Polls on-chain registry every SYNC_INTERVAL_MS and pushes snapshots to Supabase.

import { Connection, PublicKey } from '@solana/web3.js'
import {
  syncPotsToSupabase,
  syncStrategiesToSupabase,
  type PotSnapshot,
  type StrategySnapshot,
} from './supabase-sync'
import { setStrategiesMonitored } from './index'

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID_STR = process.env.POTBOT_PROGRAM_ID ?? '2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL'
const SYNC_INTERVAL_MS = Number(process.env.KEEPER_SYNC_INTERVAL_MS ?? 30_000)

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
}

const state: RegistryState = {
  pots: new Map(),
  strategies: new Map(),
  lastRefreshTs: 0,
}

/**
 * Refresh registry from chain. This is intentionally minimal: we discover all
 * accounts owned by the program and classify them by data length so the keeper
 * has *something* to sync without requiring a full Anchor coder here. As the
 * IDL stabilises, swap this for a proper account decoder.
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
        // Pot stub: real fields filled in once Anchor coder is wired.
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

    setStrategiesMonitored(Array.from(nextStrategies.keys()))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[keeper.worker] refreshRegistry failed:', (err as Error).message)
  }
  return state
}

export function getRegistrySnapshot(): RegistryState {
  return state
}

/**
 * One tick: refresh the registry, then push to Supabase.
 */
export async function tick(): Promise<void> {
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
}

let timer: NodeJS.Timeout | null = null

export function startWorker(): void {
  if (timer) return
  // eslint-disable-next-line no-console
  console.log('[keeper.worker] starting tick loop, interval=' + SYNC_INTERVAL_MS + 'ms')
  void tick()
  timer = setInterval(() => {
    void tick()
  }, SYNC_INTERVAL_MS)
  timer.unref()
}

export function stopWorker(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
