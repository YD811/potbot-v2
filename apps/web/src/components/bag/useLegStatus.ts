'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isLegLive, type BagLeg } from '@/lib/bag/config'

export interface LegStatus { key: string; configured: boolean; tradable: boolean; reason: 'not-configured' | 'region' | 'market' | null; priceUsd: number | null }

/**
 * Live market check for each leg. Until the check answers, a configured leg
 * counts as live so a slow request never blocks Bitcoin and gold.
 */
export function useLegStatus() {
  const { data } = useQuery<{ legs: LegStatus[] }>({
    queryKey: ['bag-leg-status'],
    queryFn: async () => {
      const r = await fetch('/api/bag/status')
      if (!r.ok) throw new Error('status')
      return r.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  return useCallback((leg: BagLeg): boolean => {
    if (!isLegLive(leg)) return false
    const s = data?.legs.find(x => x.key === leg.key)
    return s ? s.tradable : true
  }, [data])
}

/** Short reason a leg cannot be bought right now, or null when it can. */
export function legNote(reason: LegStatus['reason'] | undefined): string | null {
  if (reason === 'region') return 'Not available in your region.'
  if (reason === 'market') return 'Not trading on Solana yet. Opens as soon as it has a market.'
  if (reason === 'not-configured') return 'Not live yet.'
  return null
}

/** The raw status rows, for components that need the reason. */
export function useLegStatusRows() {
  const { data } = useQuery<{ legs: LegStatus[] }>({
    queryKey: ['bag-leg-status'],
    queryFn: async () => {
      const r = await fetch('/api/bag/status')
      if (!r.ok) throw new Error('status')
      return r.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  return data?.legs ?? []
}
