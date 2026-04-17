/**
 * useYield — DeFi yield opportunities hook
 */
import { useQuery } from '@tanstack/react-query'
import { yieldApi, type YieldOpportunity } from '../lib/api-client'

export function useYieldOpportunities(params?: {
  risk?: 'low' | 'medium' | 'high'
  token?: string
  protocol?: string
  minApy?: number
}) {
  return useQuery({
    queryKey: ['yield', 'opportunities', params],
    queryFn: () => yieldApi.getOpportunities(params),
    refetchInterval: 5 * 60_000,  // 5 minutes
    staleTime: 4 * 60_000,
  })
}

export function useBestYield(token: string | null | undefined) {
  return useQuery({
    queryKey: ['yield', 'best', token],
    queryFn: () => yieldApi.getBest(token!),
    enabled: Boolean(token),
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
    select: (data) => ({
      bestApy: data.bestApy,
      best: data.opportunities[0] ?? null,
      all: data.opportunities,
    }),
  })
}
