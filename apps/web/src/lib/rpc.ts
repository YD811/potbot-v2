import { Connection, type Commitment } from '@solana/web3.js'

/**
 * Resolve the configured Solana RPC URL.
 *
 * Precedence:
 *   1. NEXT_PUBLIC_SOLANA_RPC_URL — explicit override (production env)
 *   2. NEXT_PUBLIC_RPC_URL        — vercel.json convention
 *   3. devnet public endpoint     — safe demo fallback
 *
 * The mainnet public endpoint is intentionally not in the fallback chain —
 * the deployed program is currently devnet-only and a silent mainnet fall-
 * back would route all reads to the wrong cluster.
 */
export function getRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    'https://api.devnet.solana.com'
  )
}

let _connection: Connection | null = null

/**
 * Lazily-cached `Connection` for read-only RPC calls. Rebuilt on first use
 * so SSR + client share the same instance per process. Pass `commitment` to
 * override the default `'confirmed'` level.
 */
export function getRpcConnection(commitment: Commitment = 'confirmed'): Connection {
  if (!_connection) {
    _connection = new Connection(getRpcUrl(), commitment)
  }
  return _connection
}
