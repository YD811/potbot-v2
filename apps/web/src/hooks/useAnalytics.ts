/**
 * useAnalytics — real-time vault analytics hooks
 * Polls the API for fresh NAV/PnL/APY data.
 */
import { useQuery, useQueries } from '@tanstack/react-query'
import { analyticsApi, type VaultAnalytics } from '../lib/api-client'

/**
 * Fetch analytics for a single vault.
 * Refetches every 10 seconds so the UI stays live.
 */
export function useVaultAnalytics(
  pubkey: string | null | undefined,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<VaultAnalytics, Error>({
    queryKey: ['analytics', pubkey],
    queryFn: () => analyticsApi.getVault(pubkey!),
    enabled:  Boolean(pubkey) && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval ?? 10_000,  // 10s
    staleTime: 8_000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10_000),
  })
}

/**
 * Fetch analytics for multiple vaults in parallel.
 * React Query deduplicates and caches each query independently.
 * Returns a map of pubkey → VaultAnalytics (undefined while loading).
 */
export function useVaultAnalyticsBatch(pubkeys: string[]) {
  const results = useQueries({
    queries: pubkeys.map((pubkey) => ({
      queryKey: ['analytics', pubkey] as const,
      queryFn:  () => analyticsApi.getVault(pubkey),
      enabled:  Boolean(pubkey),
      staleTime: 8_000,
      retry: 1,
      // Stagger fetches slightly to avoid rate-limit bursts
      // React Query handles concurrency, but retryDelay adds back-pressure
      retryDelay: 2_000,
    })),
  })

  const dataMap: Record<string, VaultAnalytics | undefined> = {}
  const isLoading = results.some((r) => r.isLoading)
  const isAllSettled = results.every((r) => !r.isLoading)

  pubkeys.forEach((pk, i) => {
    dataMap[pk] = results[i]?.data
  })

  return { dataMap, isLoading, isAllSettled, results }
}

/**
 * Fetch live token prices via the API price oracle.
 * Refetches every 5 seconds — matches the API cache TTL.
 */
export function usePrices(
  mints: string[],
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['prices', mints.join(',')],
    queryFn: async () => {
      const { pricesApi } = await import('../lib/api-client')
      return pricesApi.get(mints)
    },
    enabled:  mints.length > 0 && (options?.enabled !== false),
    refetchInterval: 5_000,  // 5s — matches price oracle cache TTL
    staleTime: 4_000,
    retry: 1,
  })
}
