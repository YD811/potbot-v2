/**
 * RPC + cluster configuration for PotBot web.
 *
 * Env variables (client-side, prefixed with NEXT_PUBLIC_):
 *   NEXT_PUBLIC_SOLANA_NETWORK   "devnet" | "mainnet-beta" | "localnet"  (default: devnet)
 *   NEXT_PUBLIC_RPC_URL          override; otherwise derived from network
 *   NEXT_PUBLIC_HELIUS_API_KEY   required for mainnet if no RPC_URL
 *   NEXT_PUBLIC_PROGRAM_ID       program id override (defaults to SDK const)
 *
 * Why env-aware: during hackathon cut we flip a single Vercel env var to
 * switch the production site from devnet to mainnet-beta. vercel.json
 * holds the devnet defaults so PR previews work out of the box.
 */

import { Connection, PublicKey, Commitment, clusterApiUrl } from '@solana/web3.js'
import { PROGRAM_ID as SDK_PROGRAM_ID } from '@potbot/sdk'

export type Cluster = 'devnet' | 'mainnet-beta' | 'localnet'

export function getCluster(): Cluster {
  const raw =
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SOLANA_NETWORK
      : undefined) ?? 'devnet'
  if (raw === 'mainnet-beta' || raw === 'mainnet') return 'mainnet-beta'
  if (raw === 'localnet' || raw === 'local') return 'localnet'
  return 'devnet'
}

export function isMainnet(): boolean {
  return getCluster() === 'mainnet-beta'
}

export function isDevnet(): boolean {
  return getCluster() === 'devnet'
}

export function getRpcUrl(): string {
  const override = process.env.NEXT_PUBLIC_RPC_URL
  if (override) return override
  const cluster = getCluster()
  if (cluster === 'localnet') return 'http://127.0.0.1:8899'
  if (cluster === 'mainnet-beta') {
    const key = process.env.NEXT_PUBLIC_HELIUS_API_KEY
    if (key) return `https://mainnet.helius-rpc.com/?api-key=${key}`
    console.warn(
      '[rpc-config] mainnet without NEXT_PUBLIC_HELIUS_API_KEY — falling back to public RPC (rate-limited, not production-safe)',
    )
    return clusterApiUrl('mainnet-beta')
  }
  return clusterApiUrl('devnet')
}

export function getProgramId(): PublicKey {
  const override = process.env.NEXT_PUBLIC_PROGRAM_ID
  if (override) {
    try {
      return new PublicKey(override)
    } catch {
      console.warn(
        '[rpc-config] NEXT_PUBLIC_PROGRAM_ID is not a valid pubkey; falling back to SDK default',
      )
    }
  }
  return SDK_PROGRAM_ID
}

export function getCommitment(): Commitment {
  return (process.env.NEXT_PUBLIC_COMMITMENT as Commitment) ?? 'confirmed'
}

/** Cached singleton read-only connection. */
let _conn: Connection | null = null
export function getConnection(): Connection {
  if (!_conn) _conn = new Connection(getRpcUrl(), getCommitment())
  return _conn
}

export function resetConnection(): void {
  _conn = null
}

/** Display-safe summary (masks Helius key). */
export function rpcConfigSummary(): {
  cluster: Cluster
  rpcUrl: string
  programId: string
  commitment: Commitment
  explorer: string
} {
  const cluster = getCluster()
  const url = getRpcUrl().replace(/api-key=[^&]+/, 'api-key=***')
  return {
    cluster,
    rpcUrl: url,
    programId: getProgramId().toBase58(),
    commitment: getCommitment(),
    explorer:
      cluster === 'mainnet-beta'
        ? 'https://solscan.io'
        : `https://solscan.io/?cluster=${cluster}`,
  }
}

/** Build a per-cluster Solscan link to an account or tx. */
export function solscanUrl(
  kind: 'account' | 'tx',
  id: string,
): string {
  const base = 'https://solscan.io'
  const cluster = getCluster()
  const suffix = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`
  return `${base}/${kind}/${id}${suffix}`
}
