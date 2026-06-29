import type { Asset, AssetSeed, AssetStatus } from './types.js';

// ── Registry invariants ─────────────────────────────────────────────────────

/** A Pot may hold at most this many assets. */
export const MAX_ASSETS_PER_POT = 10;

/** Target weights across a Pot must sum to exactly this (= 100%). */
export const TOTAL_WEIGHT_BPS = 10_000;

/** Default per-asset cap if the asset does not specify one. */
export const DEFAULT_MAX_POT_WEIGHT_BPS = 2_500; // 25%

/** Default per-user deposit cap (USD) for an asset. */
export const DEFAULT_MAX_USER_DEPOSIT_USD = 10_000;

/**
 * Risk tiers: 1 = safest … 5 = riskiest. Anything at or above this threshold
 * is considered "risky" and requires explicit acknowledgement to add to a Pot.
 */
export const RISKY_RISK_TIER = 4;

/** Unknown assets default to the riskiest tier (fail safe). */
export const DEFAULT_RISK_TIER = 5;

/** A price older than this (ms) is considered stale and triggers fallback. */
export const PRICE_STALENESS_MS = 60_000;

export function assetStatus(a: Pick<Asset, 'verified'>): AssetStatus {
  return a.verified ? 'verified' : 'pending_verification';
}

/**
 * Hydrate an AssetSeed into a full Asset with conservative defaults.
 * IMPORTANT: regardless of seed contents, `verified` and `enabled` are FALSE.
 * Verification is earned via scripts/resolve-mints.ts + human review.
 */
export function hydrateSeed(seed: AssetSeed, id: string): Asset {
  const mint = seed.mint ?? null;
  return {
    id,
    chain: 'solana',
    mint,
    symbol: seed.symbol,
    name: seed.name,
    category: seed.category,
    decimals: seed.decimals,
    logoUrl: null,
    coingeckoId: seed.coingeckoId ?? null,
    // Hard safety gates — never enabled or verified straight from seed.
    enabled: false,
    verified: false,
    isStable: seed.isStable ?? false,
    isLst: seed.isLst ?? false,
    isXstock: seed.isXstock ?? false,
    isRwa: seed.isRwa ?? false,
    riskTier: seed.riskTier ?? DEFAULT_RISK_TIER,
    liquidityScore: 0,
    volatilityScore: 0,
    maxPotWeightBps: seed.maxPotWeightBps ?? DEFAULT_MAX_POT_WEIGHT_BPS,
    maxUserDepositUsd: DEFAULT_MAX_USER_DEPOSIT_USD,
    priceSource: 'jupiter',
    oracleSource: seed.pythPriceAccount ? 'pyth' : null,
    pythPriceAccount: seed.pythPriceAccount ?? null,
    supportsSwap: true,
    supportsLp: seed.supportsLp ?? false,
    supportsLending: seed.supportsLending ?? false,
    supportsNav: true,
    metadata: seed.notes ? { notes: seed.notes } : {},
  };
}

/**
 * The single source of truth for whether an asset may be added to a Pot.
 * Mirrors the SQL CHECK constraint: enabled => verified && mint != null.
 */
export function isAssetAddable(a: Asset): boolean {
  return a.enabled === true && a.verified === true && !!a.mint && a.supportsNav === true;
}
