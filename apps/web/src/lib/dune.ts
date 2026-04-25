/**
 * PotBot v2 — Dune SIM API client
 *
 * Wraps Dune SIM's Solana endpoints:
 *   /beta/svm/balances/{address}    → vault token holdings + USD values
 *   /beta/svm/transactions/{address} → vault on-chain activity
 *
 * Used by:
 *   - useDunePortfolio hook       (vault portfolio / TVL display)
 *   - useDuneTrades hook          (trade history / PnL feed)
 *   - Leaderboard TVL aggregation (getLeaderboardTvl)
 *
 * Docs: https://docs.sim.dune.com/svm/balances
 */

const DUNE_API_KEY =
  process.env.NEXT_PUBLIC_DUNE_API_KEY ?? "sim_LtJQ37D5rbHi7IaPQ68Xt7ZeJU8JSC9G";
const BASE_URL = "https://api.sim.dune.com";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DuneTokenBalance {
  chain: "solana" | "eclipse";
  /** SPL token mint address */
  address: string;
  /** Raw amount (integer string, no decimal shift) */
  amount: string;
  /** Human-readable balance (decimal shifted) */
  balance: string;
  value_usd: number;
  program_id: string;
  decimals: number;
  total_supply: string;
  name: string;
  symbol: string;
  uri: string;
  price_usd: number;
  liquidity_usd: number;
  pool_type?: string;
  pool_address?: string;
}

export interface DuneBalancesResponse {
  wallet_address: string;
  next_offset: string | null;
  balances_count: number;
  /** Native SOL balance in lamports. Present only for Solana. */
  sol_balance?: number;
  balances: DuneTokenBalance[];
}

export interface DuneTransaction {
  address: string;
  block_slot: number;
  /** Timestamp in microseconds */
  block_time: number;
  chain: string;
  raw_transaction: Record<string, unknown>;
}

export interface DuneTransactionsResponse {
  next_offset: string | null;
  transactions: DuneTransaction[];
}

// ── Portfolio (balances) ──────────────────────────────────────────────────────

/**
 * Fetch all SPL token balances for a vault PDA.
 * Returns native SOL + SPL tokens with USD prices.
 *
 * @param vaultAddress  The vault PDA pubkey (base58)
 * @param limit         Max tokens per page (default 50)
 * @param offset        Cursor from previous response (for pagination)
 */
export async function getVaultBalances(
  vaultAddress: string,
  { limit = 50, offset }: { limit?: number; offset?: string } = {}
): Promise<DuneBalancesResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (offset) params.set("offset", offset);

  const url = `${BASE_URL}/beta/svm/balances/${vaultAddress}?${params}`;
  const res = await fetch(url, {
    headers: { "X-Sim-Api-Key": DUNE_API_KEY },
    // 30s stale-while-revalidate — balances are near-real-time
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Dune SIM /balances failed (${res.status}): ${msg}`);
  }

  return res.json() as Promise<DuneBalancesResponse>;
}

/**
 * Fetch ALL pages of balances for a vault. Used for accurate TVL calculation.
 */
export async function getAllVaultBalances(
  vaultAddress: string
): Promise<DuneTokenBalance[]> {
  const tokens: DuneTokenBalance[] = [];
  let offset: string | undefined;

  do {
    const page = await getVaultBalances(vaultAddress, { limit: 100, offset });
    tokens.push(...page.balances);
    offset = page.next_offset ?? undefined;
  } while (offset);

  return tokens;
}

// ── Transaction history ───────────────────────────────────────────────────────

/**
 * Fetch recent on-chain transactions for a vault PDA.
 * Returns raw Solana transactions ordered by descending block_time.
 *
 * Useful for:
 *   - Showing trade history in the pot detail page
 *   - PnL timeline reconstruction
 *   - Keeper replaying failed tx detection
 */
export async function getVaultTransactions(
  vaultAddress: string,
  { limit = 20, offset }: { limit?: number; offset?: string } = {}
): Promise<DuneTransactionsResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (offset) params.set("offset", offset);

  const url = `${BASE_URL}/beta/svm/transactions/${vaultAddress}?${params}`;
  const res = await fetch(url, {
    headers: { "X-Sim-Api-Key": DUNE_API_KEY },
    next: { revalidate: 15 },
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Dune SIM /transactions failed (${res.status}): ${msg}`);
  }

  return res.json() as Promise<DuneTransactionsResponse>;
}

// ── Derived helpers ───────────────────────────────────────────────────────────

/** Sum of value_usd across all balances. Includes SOL if present. */
export function calcTvlUsd(balances: DuneTokenBalance[]): number {
  return balances.reduce((sum, b) => sum + (b.value_usd ?? 0), 0);
}

/**
 * Build a sorted portfolio view — largest USD position first.
 * Filters out zero-balance junk tokens (value_usd < $0.01).
 */
export interface PortfolioItem {
  mint: string;
  symbol: string;
  name: string;
  balance: string;
  valueUsd: number;
  priceUsd: number;
  pctOfVault: number;
  decimals: number;
}

export function buildPortfolio(
  balances: DuneTokenBalance[],
  totalUsd: number
): PortfolioItem[] {
  return balances
    .filter((b) => b.value_usd >= 0.01)
    .map((b) => ({
      mint: b.address,
      symbol: b.symbol || b.address.slice(0, 6) + "…",
      name: b.name || "Unknown Token",
      balance: b.balance,
      valueUsd: b.value_usd,
      priceUsd: b.price_usd,
      pctOfVault: totalUsd > 0 ? (b.value_usd / totalUsd) * 100 : 0,
      decimals: b.decimals,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

/**
 * Parse Dune transactions into a simplified swap feed.
 * Looks for Jupiter v6 program involvement in the transaction log messages.
 */
export interface VaultSwapEvent {
  signature: string;
  blockTime: number; // unix seconds
  slot: number;
  type: "swap" | "deposit" | "withdraw" | "unknown";
}

const JUP_V6 = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

export function parseVaultTxs(
  transactions: DuneTransaction[]
): VaultSwapEvent[] {
  return transactions.map((tx) => {
    const raw = tx.raw_transaction as any;
    const logs: string[] = raw?.meta?.logMessages ?? [];
    const programs: string[] = (raw?.transaction?.message?.accountKeys ?? []).map(
      (k: any) => (typeof k === "string" ? k : k?.pubkey ?? "")
    );

    let type: VaultSwapEvent["type"] = "unknown";
    if (programs.includes(JUP_V6) || logs.some((l) => l.includes("JUP"))) {
      type = "swap";
    } else if (logs.some((l) => l.includes("deposit") || l.includes("Deposit"))) {
      type = "deposit";
    } else if (logs.some((l) => l.includes("withdraw") || l.includes("Withdraw"))) {
      type = "withdraw";
    }

    const sig =
      raw?.transaction?.signatures?.[0] ??
      raw?.signatures?.[0] ??
      "unknown";

    return {
      signature: sig,
      blockTime: Math.floor(tx.block_time / 1_000_000), // µs → s
      slot: tx.block_slot,
      type,
    };
  });
}

// ── Leaderboard TVL ───────────────────────────────────────────────────────────

/**
 * Given a list of vault PDAs (from public pots), fetch TVL in parallel.
 * Capped at 10 concurrent requests to respect rate limits.
 *
 * Returns a map: vaultAddress → tvlUsd
 */
export async function getLeaderboardTvl(
  vaultAddresses: string[]
): Promise<Record<string, number>> {
  const BATCH = 10;
  const result: Record<string, number> = {};

  for (let i = 0; i < vaultAddresses.length; i += BATCH) {
    const batch = vaultAddresses.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (addr) => {
        const data = await getVaultBalances(addr, { limit: 100 });
        return { addr, tvl: calcTvlUsd(data.balances) };
      })
    );
    for (const res of settled) {
      if (res.status === "fulfilled") {
        result[res.value.addr] = res.value.tvl;
      }
    }
  }

  return result;
}
