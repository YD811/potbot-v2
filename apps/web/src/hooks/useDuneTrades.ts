/**
 * useDuneTrades — TanStack Query hook for vault trade history
 *
 * Uses Dune SIM /svm/transactions to show on-chain activity for a pot's vault.
 * Parses raw Solana transactions into a simplified swap/deposit/withdraw feed.
 *
 * Usage in pot detail page (positions/history tab):
 *   const { trades, isLoading } = useDuneTrades(vaultPda);
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getVaultTransactions,
  parseVaultTxs,
  type VaultSwapEvent,
} from "@/lib/dune";

export interface UseTradesResult {
  trades: VaultSwapEvent[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useDuneTrades(
  vaultAddress: string | null | undefined,
  limit = 20
): UseTradesResult {
  const query = useQuery({
    queryKey: ["dune", "trades", vaultAddress, limit],
    queryFn: async () => {
      if (!vaultAddress) return [];
      const data = await getVaultTransactions(vaultAddress, { limit });
      return parseVaultTxs(data.transactions);
    },
    enabled: !!vaultAddress,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
  });

  return {
    trades: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
