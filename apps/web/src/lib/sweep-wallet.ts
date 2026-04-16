import { Keypair } from '@solana/web3.js'
import { createHash } from 'crypto'

/**
 * PotBot Sweep Wallet System
 *
 * Each pot gets a unique deterministic deposit address derived from
 * a master secret + pot pubkey. Users can send SOL to this address
 * anonymously (no wallet connection required). The backend monitors
 * these addresses and sweeps funds into the vault PDA.
 *
 * Derivation: SHA-256(MASTER_SECRET + ":" + potPubkey) → 32-byte seed → Keypair
 */

const MASTER_SECRET =
  process.env.SWEEP_MASTER_SECRET ??
  'potbot-v2-sweep-secret-change-in-production'

/** Derives a deterministic sweep keypair for a pot. Server-side only. */
export function deriveSweepKeypair(potPubkey: string): Keypair {
  const seed = createHash('sha256')
    .update(MASTER_SECRET + ':' + potPubkey)
    .digest()
  return Keypair.fromSeed(seed)
}

/** Returns the public deposit address for a pot. Safe to expose. */
export function getSweepAddress(potPubkey: string): string {
  return deriveSweepKeypair(potPubkey).publicKey.toBase58()
}

/** Generates a Solana Pay URI for the deposit address */
export function getSolanaPayUri(
  depositAddress: string,
  amountSol: number,
  label: string
): string {
  const params = new URLSearchParams({
    amount: amountSol.toFixed(4),
    label: encodeURIComponent(label),
    message: encodeURIComponent('PotBot anonymous deposit'),
  })
  return `solana:${depositAddress}?${params.toString()}`
}
