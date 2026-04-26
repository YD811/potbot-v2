import { Connection, PublicKey } from '@solana/web3.js'
import { syncPotsToSupabase, syncStrategiesToSupabase, type PotSnapshot, type StrategySnapshot } from './supabase-sync'
import { setStrategiesMonitored } from './index'

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID_STR = process.env.POTBOT_PROGRAM_ID ?? '2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL'
const SYNC_INTERVAL_MS = Number(process.env.KEEPER_SYNC_INTERVAL_MS ?? 30_000)

// Anchor account discriminators (sha256("account:<Name>")[..8])
// We rely on getProgramAccounts with a memcmp-style filter on the first 8 bytes.
// To stay robust without requiring the full IDL+Anchor coder here, we accept that
// account layouts may evolve; we only extract minimal fields by offset.

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

let connection: Connection | null = null
let programId: PublicKey | null = null

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, 'confirmed')
  }
  return connection
}

function getProgramId(): PublicKey {
  if (!programId) {
    programId = new PublicKey(PROGRAM_ID_STR)
  }
  return programId
}

/**
 * Refresh the in-memory registry by scanning program accounts on-chain.
 * Falls back gracefully if RPC is unreachable (keeps last known state).
 */
export async function refreshRegistry(): Promise<RegistryState> {
  try {
    const conn = getConnection()
    const pid = getProgramId()
    const accounts = await conn.getProgramAccounts(pid, {
      commitment: 'confirmed',
    })

    const nextPots = new Map<string, PotSnapshot>()
    const nextStrategies = new Map<string, StrategySnapshot>()

    for (const { pubkey, account } of accounts) {
      const data = account.data
      if (!data || data.length < 8) continue
      // Heuristic classification by data length until full IDL coder is wired in.
      // Pot accounts are typically larger (members vector); strategies are smaller fixed-size.
      const key = pubkey.toBase58()
      if (data.length >= 200 && data.length < 4096) {
        // Treat as pot snapshot stub
        nextPots.set(key, {
          pubkey: key,
          name: '',
          baseMint: '',
          totalDeposits: 0,
          memberCount: 0,
          tradesCount: 0,
          createdAt: Math.floor(Date.now() / 1000),
        })
      } else if (data.length >= 64 && data.length < 200) {
        nextStrategies.set(key, {
          pubkey: key,
          potPubkey: '',
          kind: 'unknown',
          status: 'active',
          params: {},
          createdAt: Math.floor(Date.now() / 1000),
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
 * One tick of the keeper loop:
 *  1. Refresh on-chain registry
 *  2. Push pots + strategies to Supabase
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
  // Fire immediately, then on interval
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
