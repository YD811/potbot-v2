// apps/keeper/src/worker.ts
// Polls on-chain registry every SYNC_INTERVAL_MS and pushes snapshots to Supabase.
// Also runs a slower leaderboard cache refresh every LEADERBOARD_INTERVAL_MS.
//
// Account classification: Anchor `BorshAccountsCoder` against `idl/pot_vault.json`.
// We compare the first 8 bytes against the discriminators declared in the IDL
// for `PotAccount` and `StrategyAccount`, then decode and project into the
// snapshot shapes that supabase-sync.ts expects.

import { Connection, PublicKey } from '@solana/web3.js'
import { BorshAccountsCoder } from '@coral-xyz/anchor'
import type { Idl } from '@coral-xyz/anchor'
import BN from 'bn.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  syncPotsToSupabase,
  syncStrategiesToSupabase,
  refreshLeaderboardCache,
  type PotSnapshot,
  type StrategySnapshot,
} from './supabase-sync.js'
import { setStrategiesMonitored, recordWorkerMetric } from './index.js'

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID_STR = process.env.POTBOT_PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'
const SYNC_INTERVAL_MS = Number(process.env.KEEPER_SYNC_INTERVAL_MS ?? 30_000)
const LEADERBOARD_INTERVAL_MS = Number(process.env.KEEPER_LEADERBOARD_INTERVAL_MS ?? 5 * 60_000)

// ─── IDL + coder ──────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const idl = JSON.parse(
  readFileSync(join(__dirname, 'idl', 'pot_vault.json'), 'utf-8'),
) as Idl
const coder = new BorshAccountsCoder(idl)

// Anchor-spec discriminators: sha256("account:<PascalCase>")[..8].
// These match the on-chain program at GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK
// and the discriminator field in idl/pot_vault.json.
const POT_DISC = Buffer.from([202, 25, 205, 47, 59, 253, 100, 118])
const STRAT_DISC = Buffer.from([97, 218, 254, 239, 248, 146, 59, 42])

function discMatches(data: Buffer, disc: Buffer): boolean {
  if (data.length < 8) return false
  for (let i = 0; i < 8; i++) if (data[i] !== disc[i]) return false
  return true
}

// ─── Decoded shape helpers ────────────────────────────────────────────────────

interface DecodedPotAccount {
  authority: PublicKey
  name: string
  feeBps: number
  isPublic: boolean
  paused: boolean
  totalDeposits: BN
  totalShares: BN
  memberCount: number
  tradeCount: number
  totalVolume: BN
  nextProposalId: BN
  allowedMints: PublicKey[]
  feeReserve: BN
  agentAuthority: PublicKey
  tamagotchiLevel: number
  tamagotchiXp: BN
  bump: number
  vaultBump: number
}

interface DecodedStrategyAccount {
  pot: PublicKey
  slotId: number
  bump: number
  source: Record<string, unknown>
  status: Record<string, unknown>
  inputMint: PublicKey
  outputMint: PublicKey
  sizeIn: BN
  sizeOut: BN
  entryPriceX64: BN
  trailingHighPriceX64: BN
  pythPriceFeed: PublicKey | null
  stopLossBps: number | null
  takeProfitBps: number | null
  trailingStopBps: number | null
  yieldTarget: Record<string, unknown>
  yieldPosition: unknown
  executorNonce: number
  createdAt: BN
  executedAt: BN
  closedAt: BN
  lastTriggerReason: Record<string, unknown>
  lastPriceUpdateTs: BN
  reserved: number[]
}

const ZERO_PUBKEY = PublicKey.default

function statusToString(
  e: Record<string, unknown> | undefined,
): StrategySnapshot['status'] {
  if (!e) return 'Pending'
  const key = Object.keys(e)[0]?.toLowerCase()
  switch (key) {
    case 'pending':
      return 'Pending'
    case 'active':
      return 'Active'
    case 'parked':
      return 'Parked'
    case 'closed':
      return 'Closed'
    default:
      return 'Pending'
  }
}

function bnToBigInt(bn: BN): bigint {
  return BigInt(bn.toString(10))
}

function projectPot(addr: PublicKey, decoded: DecodedPotAccount): PotSnapshot {
  return {
    address: addr,
    authority: decoded.authority,
    agentAuthority: decoded.agentAuthority.equals(ZERO_PUBKEY)
      ? null
      : decoded.agentAuthority,
    paused: decoded.paused,
    feeReserveLamports: bnToBigInt(decoded.feeReserve),
    allowedMints: decoded.allowedMints,
  }
}

function projectStrategy(
  addr: PublicKey,
  decoded: DecodedStrategyAccount,
): StrategySnapshot {
  const executedAtNum = decoded.executedAt.toNumber()
  return {
    address: addr,
    pot: decoded.pot,
    slotId: decoded.slotId,
    status: statusToString(decoded.status),
    inputMint: decoded.inputMint,
    outputMint: decoded.outputMint,
    priceFeedId: decoded.pythPriceFeed
      ? decoded.pythPriceFeed.toBase58()
      : null,
    entryPriceX64: decoded.entryPriceX64,
    trailingHighPriceX64: decoded.trailingHighPriceX64,
    stopLossBps: decoded.stopLossBps,
    takeProfitBps: decoded.takeProfitBps,
    trailingStopBps: decoded.trailingStopBps,
    sizeIn: decoded.sizeIn,
    sizeOut: decoded.sizeOut,
    executorNonce: decoded.executorNonce,
    executedAt: executedAtNum === 0 ? null : executedAtNum,
  }
}

// ─── Connection / program-id memoization ──────────────────────────────────────

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

// ─── State ────────────────────────────────────────────────────────────────────

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
 * Refresh registry from chain via Anchor IDL discriminator decoding.
 * Replaces the prior data-length heuristic — accounts whose first 8 bytes
 * don't match a known discriminator are skipped (so e.g. MemberAccount or
 * ProposalAccount don't get mis-classified).
 */
export async function refreshRegistry(): Promise<RegistryState> {
  try {
    const conn = getConnection()
    const pid = getProgramId()
    const accounts = await conn.getProgramAccounts(pid, { commitment: 'confirmed' })

    const nextPots = new Map<string, PotSnapshot>()
    const nextStrategies = new Map<string, StrategySnapshot>()

    for (const { pubkey, account } of accounts) {
      const data = account.data as Buffer
      if (!data || data.length < 8) continue

      if (discMatches(data, POT_DISC)) {
        try {
          const decoded = coder.decode<DecodedPotAccount>('PotAccount', data)
          nextPots.set(pubkey.toBase58(), projectPot(pubkey, decoded))
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `[keeper.worker] PotAccount decode failed at ${pubkey.toBase58()}:`,
            (err as Error).message,
          )
        }
      } else if (discMatches(data, STRAT_DISC)) {
        try {
          const decoded = coder.decode<DecodedStrategyAccount>(
            'StrategyAccount',
            data,
          )
          nextStrategies.set(pubkey.toBase58(), projectStrategy(pubkey, decoded))
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `[keeper.worker] StrategyAccount decode failed at ${pubkey.toBase58()}:`,
            (err as Error).message,
          )
        }
      }
      // else: not a Pot or Strategy — skip silently (could be Member, Proposal, Voter, Delegate, …)
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
    console.warn(
      '[keeper.worker] leaderboard refresh failed:',
      (err as Error).message,
    )
  }
}

let tickTimer: NodeJS.Timeout | null = null
let leaderboardTimer: NodeJS.Timeout | null = null

export function startWorker(): void {
  if (tickTimer) return
  // eslint-disable-next-line no-console
  console.log(
    '[keeper.worker] tick interval=' +
      SYNC_INTERVAL_MS +
      'ms, leaderboard interval=' +
      LEADERBOARD_INTERVAL_MS +
      'ms',
  )

  void tick()
  tickTimer = setInterval(() => {
    void tick()
  }, SYNC_INTERVAL_MS)
  tickTimer.unref()

  void leaderboardTick()
  leaderboardTimer = setInterval(() => {
    void leaderboardTick()
  }, LEADERBOARD_INTERVAL_MS)
  leaderboardTimer.unref()
}

export function stopWorker(): void {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  if (leaderboardTimer) {
    clearInterval(leaderboardTimer)
    leaderboardTimer = null
  }
}
