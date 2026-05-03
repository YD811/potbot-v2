import { Connection } from '@solana/web3.js'

export function getRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.devnet.solana.com'
  )
}

export function getRpcConnection(commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'): Connection {
  return new Connection(getRpcUrl(), commitment)
}
