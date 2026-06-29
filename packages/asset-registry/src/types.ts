/**
 * PotBot Asset Registry — core types.
 *
 * These types mirror the Supabase `registry` schema 1:1 (camelCase here,
 * snake_case in SQL). Field semantics are intentionally conservative:
 *   - `mint` is NULLABLE: an asset whose canonical mint we have not yet
 *     verified MUST NOT carry a guessed/placeholder mint.
 *   - `enabled` may only be true when `verified` is true AND `mint` is set.
 *     A `pending_verification` asset can never be added to a Pot.
 */

/** Asset categories required by the registry spec. */
export type AssetCategory =
  | 'sol_lst'        // SOL + liquid staking tokens
  | 'stablecoin'
  | 'xstock'         // tokenized equities
  | 'blue_chip'
  | 'defi'
  | 'ai'
  | 'infrastructure'
  | 'meme'
  | 'rwa'            // real-world assets
  | 'yield';         // yield-bearing assets

export const ASSET_CATEGORIES: AssetCategory[] = [
  'sol_lst', 'stablecoin', 'xstock', 'blue_chip', 'defi',
  'ai', 'infrastructure', 'meme', 'rwa', 'yield',
];

/** Supported DEX venues for asset pairs / LP. */
export type Dex = 'meteora' | 'raydium' | 'orca' | 'jupiter';

/** Price provenance. */
export type PriceSource = 'jupiter' | 'pyth' | 'switchboard' | 'cache' | 'manual';

/**
 * Verification status is DERIVED, never stored independently of `verified`.
 * `pending_verification` == (!verified). We expose it as a helper, see
 * `assetStatus()` in constants.ts.
 */
export type AssetStatus = 'pending_verification' | 'verified';

/** A registry asset. Mirrors registry.assets. */
export interface Asset {
  id: string;                       // uuid
  chain: string;                    // 'solana'
  mint: string | null;              // NULL while pending_verification
  symbol: string;
  name: string | null;
  category: AssetCategory;
  decimals: number;

  logoUrl: string | null;
  coingeckoId: string | null;

  enabled: boolean;                 // gate: only true if verified && mint
  verified: boolean;                // set only by resolve-mints + human review

  isStable: boolean;
  isLst: boolean;
  isXstock: boolean;
  isRwa: boolean;

  /** 1 = safest … 5 = riskiest. Defaults to 5 (treat unknown as risky). */
  riskTier: number;
  liquidityScore: number;           // 0..100
  volatilityScore: number;          // 0..100

  /** Max share of a Pot this asset may occupy, in bps (10000 = 100%). */
  maxPotWeightBps: number;
  maxUserDepositUsd: number;

  priceSource: PriceSource;
  oracleSource: string | null;
  pythPriceAccount: string | null;

  supportsSwap: boolean;
  supportsLp: boolean;
  supportsLending: boolean;
  supportsNav: boolean;

  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** Seed shape — a partial Asset with sane defaults applied at load time. */
export interface AssetSeed {
  symbol: string;
  name: string;
  category: AssetCategory;
  decimals: number;
  /** Candidate mint, if we have a strong source. Still requires verification. */
  mint?: string | null;
  isStable?: boolean;
  isLst?: boolean;
  isXstock?: boolean;
  isRwa?: boolean;
  riskTier?: number;
  maxPotWeightBps?: number;
  coingeckoId?: string | null;
  pythPriceAccount?: string | null;
  supportsLp?: boolean;
  supportsLending?: boolean;
  notes?: string;
}

/** A tradable/LP pair. Mirrors registry.asset_pairs. */
export interface AssetPair {
  id: string;
  baseAssetId: string;
  quoteAssetId: string;
  dex: Dex;
  poolAddress: string | null;
  poolType: string | null;          // e.g. 'dlmm' | 'clmm' | 'amm'
  enabled: boolean;
  supportsDeposit: boolean;
  supportsWithdraw: boolean;
  supportsRebalance: boolean;
  minLiquidityUsd: number;
  feeBps: number | null;
  metadata: Record<string, unknown>;
}

/** A price observation. Mirrors registry.asset_prices. */
export interface AssetPrice {
  id?: number;
  assetId: string;
  priceUsd: number;
  source: PriceSource;
  confidence: number | null;        // 0..1, oracle confidence where available
  fetchedAt: string;                // ISO timestamp
}

/** A registry Pot (planning/draft layer). Mirrors registry.pots. */
export interface RegistryPot {
  id: string;
  creatorWallet: string;
  name: string;
  shareMint: string | null;
  status: 'draft' | 'active' | 'paused' | 'closed';
  maxAssets: number;                // default 10
  navUsd: number;
  createdAt?: string;
}

/** Pot composition row. Mirrors registry.pot_assets. */
export interface PotAsset {
  potId: string;
  assetId: string;
  targetWeightBps: number;          // sum across a Pot must equal 10000
  currentAmount: number;            // raw token amount (base units)
  currentValueUsd: number;
  primaryLpPairId: string | null;
  primaryStrategy: 'hold' | 'lp' | 'lend';
}

// ── NAV runtime models ──────────────────────────────────────────────────────

/** A concrete holding used for NAV math (resolved from pot_assets + balances). */
export interface Holding {
  asset: Asset;
  /** Raw on-chain amount in base units (e.g. lamports for 9-decimals). */
  amountRaw: bigint;
  /** Optional LP position; when present, valued via the LP adapter. */
  lpPosition?: LpPosition;
}

/** Placeholder LP position descriptor (v1: interface only, no live valuation). */
export interface LpPosition {
  pair: AssetPair;
  /** Opaque, dex-specific position handle (NFT mint / position pubkey). */
  positionRef: string;
  /** Optional pre-computed value, if a keeper has already priced it. */
  cachedValueUsd?: number;
}

export interface PricedHolding {
  asset: Asset;
  amount: number;                   // human units
  priceUsd: number | null;          // null => unpriced
  valueUsd: number;                 // 0 when unpriced (and flagged)
  priced: boolean;
  source: PriceSource | null;
}

export interface NavResult {
  navUsd: number;
  holdings: PricedHolding[];
  /** Assets that could not be priced (NAV is therefore a lower bound). */
  unpriced: string[];               // asset ids / symbols
  /** True only if every holding was priced. */
  complete: boolean;
}

// ── Validation models ───────────────────────────────────────────────────────

export interface ValidationIssue {
  code: string;
  message: string;
  assetId?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** Input row for Pot composition validation. */
export interface PotAssetDraft {
  assetId: string;
  targetWeightBps: number;
  /** Caller must explicitly acknowledge risky (high risk-tier) assets. */
  acknowledgeRisk?: boolean;
  primaryStrategy?: 'hold' | 'lp' | 'lend';
}

// ── Price provider abstraction ──────────────────────────────────────────────

export interface PriceQuote {
  mint: string;
  priceUsd: number;
  source: PriceSource;
  confidence?: number;
}

/** A pluggable price source. Adapters implement this. */
export interface PriceProvider {
  readonly source: PriceSource;
  /** Returns a map mint -> quote for the mints it could price. */
  getPrices(mints: string[]): Promise<Map<string, PriceQuote>>;
}

/** Token metadata as returned by a token-list provider (Jupiter). */
export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  tags?: string[];
}

/** LP adapter interface (Meteora / Raydium). v1: valuation is a placeholder. */
export interface LpAdapter {
  readonly dex: Dex;
  /** Resolve a pool by address (or throw NotImplemented in v1). */
  getPool(poolAddress: string): Promise<AssetPair | null>;
  /** Value an LP position in USD (or throw NotImplemented in v1). */
  getPositionValueUsd(position: LpPosition): Promise<number>;
}
