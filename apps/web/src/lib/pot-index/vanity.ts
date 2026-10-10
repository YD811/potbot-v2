import { Keypair } from '@solana/web3.js'

/**
 * Grind a keypair whose base58 pubkey starts with `prefix` (case-sensitive), best effort.
 * A 3-char prefix takes hundreds of thousands of tries; browsers manage ~1k/s, so the search is
 * time-boxed (`maxMs`, default 8 s) and falls back to a plain random keypair. The vanity address
 * is cosmetic: the program does not care what the index mint address looks like.
 * Runs in slices so the UI stays responsive; `onProgress` gets the try count.
 */
export async function grindKeypair(
  prefix: string,
  opts: { maxTries?: number; maxMs?: number; onProgress?: (tries: number) => void } = {},
): Promise<Keypair> {
  const max = opts.maxTries ?? 3_000_000
  const deadline = Date.now() + (opts.maxMs ?? 8_000)
  let tries = 0
  for (;;) {
    for (let i = 0; i < 500; i++) {
      const kp = Keypair.generate()
      tries++
      if (kp.publicKey.toBase58().startsWith(prefix)) return kp
    }
    if (tries >= max || Date.now() >= deadline) return Keypair.generate()
    opts.onProgress?.(tries)
    await new Promise((r) => setTimeout(r, 0))
  }
}

/** Index mints start with "Pot" (base58 has no capital O) so every POTfolio token is recognisable by its address. */
export const INDEX_MINT_PREFIX = 'Pot'
