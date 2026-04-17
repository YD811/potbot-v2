/**
 * useAnalytics — real-time vault analytics hook
 * Polls the API every 10 seconds for fresh NAV/PnL/APY data
 */
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, type VaultAnalytics } from '../lib/api-client'

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
