/**
 * useAnalytics — real-time vault analytics hooks
 * Polls the API for fresh NAV/PnL/APY data.
 */
import { useQuery, useQueries } from '@tanstack/react-query'
import { analyticsApi, type VaultAnalytics } from '../lib/api-client'

/**
 * Fetch analytics for a single vault.
 * Refetches every 30s — NAV/PnL barely move at sub-minute granularity
 * and the previous 10s interval was firing 6 RPC-backed requests per
 * minute per open tab.
 */
export function useVaultAnalytics(
  pubkey: string | null | undefined,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<VaultAnalytics, Error>({
    queryKey: ['analytics', pubkey],
    queryFn: () => analyticsApi.getVault(pubkey!),
    enabled:  Boolean(pubkey) && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval ?? 30_000,
    staleTime: 25_000,
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
      // Batch on /vaults fans out one query per pot — 60s staleTime
      // keeps the grid snappy without nuking the analytics service on
      // every navigation.
      staleTime: 60_000,
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
 * Refetches every 30s — sub-second moves don't affect the dashboard
 * UX and the previous 5s interval was the largest single source of
 * production traffic against /api/prices.
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
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
  })
}
