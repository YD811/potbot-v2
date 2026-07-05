// Flagship POT-1 pin. Resolution order:
// 1. NEXT_PUBLIC_FLAGSHIP_POT env (pubkey) — set after mainnet seed
// 2. on-chain is_flagship flag (when the display object carries it)
// 3. mock fallback by name, so the demo shows a pinned flagship too
export const FLAGSHIP_POT_PUBKEY = process.env.NEXT_PUBLIC_FLAGSHIP_POT ?? ''

export function isFlagshipPot(p: { pubkey?: string; isFlagship?: boolean; name?: string }): boolean {
  if (FLAGSHIP_POT_PUBKEY && p.pubkey === FLAGSHIP_POT_PUBKEY) return true
  if (p.isFlagship) return true
  return !FLAGSHIP_POT_PUBKEY && (p.name ?? '').toLowerCase().includes('balanced index')
}

/** Stable sort with the flagship first, original order preserved otherwise. */
export function pinFlagshipFirst<T extends { pubkey?: string; isFlagship?: boolean; name?: string }>(
  pots: T[],
): T[] {
  return [...pots].sort((a, b) => Number(isFlagshipPot(b)) - Number(isFlagshipPot(a)))
}
