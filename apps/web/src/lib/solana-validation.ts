import { PublicKey } from '@solana/web3.js'

/**
 * @solana/web3.js's PublicKey constructor stack-overflows on certain
 * near-base58 strings (typically 43–44 chars, repeating characters) —
 * a regression in the base58 decoder. That crash isn't catchable by
 * try/catch around `new PublicKey(...)`; it bubbles up as
 * "RangeError: Maximum call stack size exceeded" and takes the React
 * tree down.
 *
 * Defence in depth:
 *   1. Pre-filter with a base58 character + length regex (fast, no
 *      decoding) so obviously broken strings never hit the decoder.
 *   2. Then attempt to construct the PublicKey inside try/catch for
 *      the remaining edge cases (eg. strings that pass the regex but
 *      aren't on the ed25519 curve).
 */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isLikelyBase58Pubkey(input: unknown): input is string {
  return typeof input === 'string' && BASE58_RE.test(input)
}

/**
 * Strict pubkey validator. Returns false for any string that would
 * crash or throw inside `new PublicKey(...)`.
 */
export function isValidPublicKey(input: unknown): input is string {
  if (!isLikelyBase58Pubkey(input)) return false
  try {
    new PublicKey(input)
    return true
  } catch {
    return false
  }
}

/**
 * Crash-safe variant of `new PublicKey(...)`. Returns null on any
 * failure — invalid base58, length mismatch, or the decoder
 * stack-overflow corner case.
 */
export function tryPublicKey(input: unknown): PublicKey | null {
  if (!isLikelyBase58Pubkey(input)) return null
  try {
    return new PublicKey(input)
  } catch {
    return null
  }
}
