// Client-side token registry for index vaults.
//
// Contract: this list must always be a SUBSET of the on-chain TokenAllowlist
// (["allowlist"] PDA) — the program is the enforcement point, this file only
// drives the UI (create-flow picker, class filters, route labels).
//
// Only mints verified against the Jupiter strict list belong here. RWA
// (tokenized stocks) entries land once their mints are verified and the
// on-chain allowlist carries them; until then the RwaStock class renders as
// "coming soon" in the picker. Capacity on-chain is 100; UI ships a curated
// liquid core and grows by config, not code.

export type TokenClass = 'Stable' | 'StakedSol' | 'RwaStock'
export type DefiRoute = 'hold' | 'kaminoLend' | 'kaminoLiquidity' | 'meteoraDlmm'

export interface RegistryToken {
  mint: string
  symbol: string
  name: string
  decimals: number
  class: TokenClass
  logoURI?: string
  /** Verified tradable on Jupiter v6 (strict list). */
  jupiterTradable: boolean
  /** Routes the keeper may deploy this leg through (first = default). */
  defiRoutes: DefiRoute[]
}

export const TOKEN_REGISTRY: RegistryToken[] = [
  // ─── Stables ──────────────────────────────────────────────────────────────
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC', name: 'USD Coin', decimals: 6, class: 'Stable',
    jupiterTradable: true, defiRoutes: ['hold', 'kaminoLend', 'meteoraDlmm'],
  },
  {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT', name: 'Tether USD', decimals: 6, class: 'Stable',
    jupiterTradable: true, defiRoutes: ['hold', 'kaminoLend', 'meteoraDlmm'],
  },
  // ─── Staked SOL (LSTs) ────────────────────────────────────────────────────
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL', name: 'Wrapped SOL', decimals: 9, class: 'StakedSol',
    jupiterTradable: true, defiRoutes: ['hold', 'kaminoLend'],
  },
  {
    mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    symbol: 'JitoSOL', name: 'Jito Staked SOL', decimals: 9, class: 'StakedSol',
    jupiterTradable: true, defiRoutes: ['hold', 'kaminoLend', 'kaminoLiquidity'],
  },
  {
    mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    symbol: 'mSOL', name: 'Marinade Staked SOL', decimals: 9, class: 'StakedSol',
    jupiterTradable: true, defiRoutes: ['hold', 'kaminoLend', 'kaminoLiquidity'],
  },
  {
    mint: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
    symbol: 'bSOL', name: 'BlazeStake Staked SOL', decimals: 9, class: 'StakedSol',
    jupiterTradable: true, defiRoutes: ['hold', 'kaminoLend'],
  },
  {
    mint: 'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v',
    symbol: 'jupSOL', name: 'Jupiter Staked SOL', decimals: 9, class: 'StakedSol',
    jupiterTradable: true, defiRoutes: ['hold', 'kaminoLend'],
  },
  // ─── RWA Stocks ───────────────────────────────────────────────────────────
  // Added after mint verification + on-chain allowlist inclusion (xStocks
  // et al). The flagship falls back to SOL-spot for this sleeve until then
  // (config decision, see docs/architecture/index-vault.md).
]

export const MAX_INDEX_TOKENS = 10
export const ALLOWLIST_CAPACITY = 100

export function tokensByClass(cls: TokenClass): RegistryToken[] {
  return TOKEN_REGISTRY.filter((t) => t.class === cls)
}

export function findRegistryToken(mint: string): RegistryToken | undefined {
  return TOKEN_REGISTRY.find((t) => t.mint === mint)
}

/** UI guard mirroring on-chain WeightsMustSumTo100 / TooManyTokens. */
export function validateComposition(
  entries: { mint: string; weightBps: number }[],
): string | null {
  if (entries.length === 0) return 'Pick at least one token'
  if (entries.length > MAX_INDEX_TOKENS) return `Max ${MAX_INDEX_TOKENS} tokens per index`
  const sum = entries.reduce((a, e) => a + e.weightBps, 0)
  if (sum !== 10_000) return `Weights must sum to 100% (now ${(sum / 100).toFixed(1)}%)`
  for (const e of entries) {
    if (!findRegistryToken(e.mint)) return `Token ${e.mint.slice(0, 6)}… is not in the registry`
  }
  return null
}
