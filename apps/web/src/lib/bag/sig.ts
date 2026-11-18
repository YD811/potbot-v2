import 'server-only'
import { createPublicKey, verify } from 'node:crypto'
import bs58 from 'bs58'

/** DER prefix of an Ed25519 SubjectPublicKeyInfo; the raw 32-byte key follows. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

/**
 * Verify a wallet's signMessage signature (Ed25519, base58 wallet and
 * base64 signature). Returns false on any malformed input.
 */
export function verifyWalletSignature(wallet: string, message: string, signatureB64: string): boolean {
  try {
    const pub = Buffer.from(bs58.decode(wallet))
    const sig = Buffer.from(signatureB64, 'base64')
    if (pub.length !== 32 || sig.length !== 64) return false
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, pub]), format: 'der', type: 'spki' })
    return verify(null, Buffer.from(message, 'utf8'), key, sig)
  } catch {
    return false
  }
}
