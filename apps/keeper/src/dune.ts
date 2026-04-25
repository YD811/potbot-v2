/**
 * PotBot v2 Keeper — Dune SIM client
 *
 * The keeper uses Dune SIM to:
 *
 *  1. Monitor vault balances before executing a swap trigger
 *     → Ensure vault actually holds the input token before sending ix
 *     → Prevent wasted gas on failed transactions
 *
 *  2. Detect deposit events in real-time (polling /svm/transactions)
 *     → Wake keeper when a deposit lands (alternative to Helius webhook)
 *
 *  3. Cross-check post-swap balances to confirm execution
 *     → After execute_swap tx confirmed, verify token balance moved
 *
 * Docs: https://docs.sim.dune.com/svm/balances
 */

const DUNE_API_KEY =
  process.env.DUNE_API_KEY ?? "sim_LtJQ37D5rbHi7IaPQ68Xt7ZeJU8JSC9G";
const BASE_URL = "https://api.sim.dune.com";

// ── Types (minimal — keeper needs less than web) ──────────────────────────────

interface TokenBalance {
  address: string; // mint
  symbol: string;
  balance: string; // human-readable
  amount: string;  // raw integer string
  value_usd: number;
  decimals: number;
  price_usd: number;
}

interface BalancesResponse {
  wallet_address: string;
  balances_count: number;
  balances: TokenBalance[];
}

interface TransactionRecord {
  block_slot: number;
  block_time: number; // µs
  chain: string;
  raw_transaction: Record<string, unknown>;
}

interface TransactionsResponse {
  next_offset: string | null;
  transactions: TransactionRecord[];
}

// ── Core fetch helpers ────────────────────────────────────────────────────────

async function duneGet<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "X-Sim-Api-Key": DUNE_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Dune SIM ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ── Keeper-specific API ───────────────────────────────────────────────────────

/**
 * Get balance of a specific token mint in the vault.
 * Returns raw lamports/units (as BigInt) and human-readable balance.
 *
 * Used by keeper before submitting execute_swap to confirm vault has funds.
 */
export async function getVaultTokenBalance(
  vaultAddress: string,
  mintAddress: string
): Promise<{ raw: bigint; human: string; usd: number; priceUsd: number } | null> {
  const data = await duneGet<BalancesResponse>(
    `/beta/svm/balances/${vaultAddress}`
  );

  const token = data.balances.find(
    (b) => b.address.toLowerCase() === mintAddress.toLowerCase()
  );

  if (!token) return null;

  return {
    raw: BigInt(token.amount),
    human: token.balance,
    usd: token.value_usd,
    priceUsd: token.price_usd,
  };
}

/**
 * Get all token balances for the vault. Returns a map of mint → raw amount.
 * Used by the keeper registry to build a snapshot of vault state.
 */
export async function getVaultSnapshot(
  vaultAddress: string
): Promise<Map<string, { raw: bigint; usd: number; symbol: string }>> {
  const data = await duneGet<BalancesResponse>(
    `/beta/svm/balances/${vaultAddress}`
  );

  const map = new Map<string, { raw: bigint; usd: number; symbol: string }>();
  for (const b of data.balances) {
    map.set(b.address, {
      raw: BigInt(b.amount),
      usd: b.value_usd,
      symbol: b.symbol,
    });
  }
  return map;
}

/**
 * Calculate total vault TVL in USD from Dune SIM data.
 */
export async function getVaultTvlUsd(vaultAddress: string): Promise<number> {
  const data = await duneGet<BalancesResponse>(
    `/beta/svm/balances/${vaultAddress}`
  );
  return data.balances.reduce((s, b) => s + b.value_usd, 0);
}

/**
 * Poll for new transactions on the vault since a given slot.
 * Returns txs newer than `afterSlot`, ordered newest-first.
 *
 * The keeper calls this to detect when a deposit or swap has landed
 * without needing a Helius webhook.
 */
export async function getNewVaultTxs(
  vaultAddress: string,
  afterSlot: number,
  limit = 10
): Promise<TransactionRecord[]> {
  const data = await duneGet<TransactionsResponse>(
    `/beta/svm/transactions/${vaultAddress}?limit=${limit}`
  );
  return data.transactions.filter((tx) => tx.block_slot > afterSlot);
}

/**
 * Verify that a swap executed correctly by confirming balance change.
 *
 * After `execute_swap`, the keeper calls this to confirm:
 *   - inputMint balance decreased by ~amountIn
 *   - outputMint balance increased by >0
 *
 * Returns { ok: true, spent, received } on success.
 */
export async function verifySwapExecution(
  vaultAddress: string,
  inputMint: string,
  outputMint: string,
  preSnapshot: Map<string, { raw: bigint; usd: number; symbol: string }>
): Promise<{
  ok: boolean;
  spent: bigint;
  received: bigint;
  inputSymbol: string;
  outputSymbol: string;
}> {
  const post = await getVaultSnapshot(vaultAddress);

  const preIn = preSnapshot.get(inputMint)?.raw ?? 0n;
  const postIn = post.get(inputMint)?.raw ?? 0n;
  const spent = preIn > postIn ? preIn - postIn : 0n;

  const preOut = preSnapshot.get(outputMint)?.raw ?? 0n;
  const postOut = post.get(outputMint)?.raw ?? 0n;
  const received = postOut > preOut ? postOut - preOut : 0n;

  return {
    ok: spent > 0n && received > 0n,
    spent,
    received,
    inputSymbol: post.get(inputMint)?.symbol ?? inputMint.slice(0, 8),
    outputSymbol: post.get(outputMint)?.symbol ?? outputMint.slice(0, 8),
  };
}
