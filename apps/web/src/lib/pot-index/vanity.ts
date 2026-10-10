import { Keypair } from '@solana/web3.js'

/**
 * Grind a keypair whose base58 pubkey starts with `prefix` (case-sensitive).
 * 3 chars ≈ 58³/2 ≈ 100k tries on average: a few seconds in a browser, well under a second in Node.
 * Runs in slices so the UI stays responsive; `onProgress` gets the try count.
 */
export async function grindKeypair(prefix: string, opts: { maxTries?: number; onProgress?: (tries: number) => void } = {}): Promise<Keypair> {
  const max = opts.maxTries ?? 3_000_000
  let tries = 0
  for (;;) {
    for (let i = 0; i < 2000; i++) {
      const kp = Keypair.generate()
      tries++
      if (kp.publicKey.toBase58().startsWith(prefix)) return kp
      if (tries >= max) return Keypair.generate()
    }
    opts.onProgress?.(tries)
    await new Promise((r) => setTimeout(r, 0))
  }
}

/** Index mints start with "Pot" (base58 has no capital O) so every POTfolio token is recognisable by its address. */
export const INDEX_MINT_PREFIX = 'Pot'
