'use client'

/**
 * React hooks for Jupiter Trigger Orders, DCA, portfolio value, and swap quotes.
 * All data is cached via TanStack Query with sensible stale times.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTriggerOrders,
  cancelTriggerOrder,
  getDCAOrders,
  getSwapV2Order,
  getPortfolioUSD,
  type TriggerOrderData,
  type DCAOrderData,
  type SwapV2OrderParams,
} from '@/lib/jupiter-v2'

// ── Trigger Orders (Limit Orders) ─────────────────────────────────────────────

/**
 * Fetch open Jupiter Trigger (limit) orders for a vault address.
 * Refreshes every 30 seconds.
 */
export function useTriggerOrders(vaultPubkey: string) {
  return useQuery<TriggerOrderData[], Error>({
    queryKey:        ['jupiter-trigger-orders', vaultPubkey],
    queryFn:         () => getTriggerOrders(vaultPubkey),
    enabled:         !!vaultPubkey,
    staleTime:       30_000,
    refetchInterval: 30_000,
  })
}

/**
 * Cancel a trigger order. Invalidates the trigger-orders cache on success.
 */
export function useCancelTriggerOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderKey, maker }: { orderKey: string; maker: string }) =>
      cancelTriggerOrder(orderKey, maker),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jupiter-trigger-orders'] })
    },
  })
}

// ── DCA Orders ────────────────────────────────────────────────────────────────

/**
 * Fetch active Jupiter DCA orders for a vault address.
 * Refreshes every 60 seconds (DCA cycle is typically >= 1 hour).
 */
export function useDCAOrders(vaultPubkey: string) {
  return useQuery<DCAOrderData[], Error>({
    queryKey:        ['jupiter-dca-orders', vaultPubkey],
    queryFn:         () => getDCAOrders(vaultPubkey),
    enabled:         !!vaultPubkey,
    staleTime:       60_000,
    refetchInterval: 60_000,
  })
}

// ── Portfolio USD value ───────────────────────────────────────────────────────

/**
 * Calculate total USD value of a set of token holdings.
 * Uses Jupiter Price API v2. Refreshes every 30 seconds.
 *
 * @param holdings  Array of { mint, amount } where amount is in raw (lamport) units
 * @param enabled   Set to false to pause fetching
 */
export function usePortfolioUSD(
  holdings: Array<{ mint: string; amount: number }>,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      'portfolio-usd',
      holdings.map(h => `${h.mint}:${h.amount}`).join(','),
    ],
    queryFn:         () => getPortfolioUSD(holdings),
    enabled:         enabled && holdings.length > 0,
    staleTime:       15_000,
    refetchInterval: 30_000,
  })
}

// ── Swap Quote ────────────────────────────────────────────────────────────────

/**
 * Fetch a live Swap V2 quote for review before proposal creation.
 * Not auto-refreshed — re-fetch on demand or when params change.
 */
export function useSwapQuote(params: SwapV2OrderParams | null) {
  return useQuery({
    queryKey: [
      'swap-quote',
      params?.inputMint,
      params?.outputMint,
      params?.amount,
      params?.slippageBps,
    ],
    queryFn:  () => (params ? getSwapV2Order(params) : null),
    enabled:  !!params && params.amount > 0,
    staleTime: 10_000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
