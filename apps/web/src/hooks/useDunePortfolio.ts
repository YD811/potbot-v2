/**
 * useDunePortfolio — TanStack Query hook for vault token portfolio
 *
 * Uses Dune SIM /svm/balances to show real holdings of a pot's vault PDA.
 * Auto-refreshes every 30s. Falls back to empty state on error.
 *
 * Usage in pot detail page (positions tab):
 *   const { portfolio, tvlUsd, isLoading } = useDunePortfolio(vaultPda);
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getVaultBalances,
  buildPortfolio,
  calcTvlUsd,
  type PortfolioItem,
} from "@/lib/dune";

export interface UsePortfolioResult {
  portfolio: PortfolioItem[];
  tvlUsd: number;
  /** Native SOL balance in lamports (if returned by API) */
  solLamports: number;
  isLoading: boolean;
  isError: boolean;
  lastUpdated: Date | null;
  refetch: () => void;
}

export function useDunePortfolio(
  vaultAddress: string | null | undefined
): UsePortfolioResult {
  const query = useQuery({
    queryKey: ["dune", "portfolio", vaultAddress],
    queryFn: async () => {
      if (!vaultAddress) return null;
      const data = await getVaultBalances(vaultAddress, { limit: 100 });
      const tvl = calcTvlUsd(data.balances);
      const portfolio = buildPortfolio(data.balances, tvl);
      return {
        portfolio,
        tvlUsd: tvl,
        solLamports: data.sol_balance ?? 0,
      };
    },
    enabled: !!vaultAddress,
    staleTime: 30_000,      // 30s — near-real-time
    refetchInterval: 30_000,
    retry: 2,
  });

  return {
    portfolio: query.data?.portfolio ?? [],
    tvlUsd: query.data?.tvlUsd ?? 0,
    solLamports: query.data?.solLamports ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    refetch: query.refetch,
  };
}
