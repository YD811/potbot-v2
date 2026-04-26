'use client'

import { useEffect, useState } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '@/lib/supabase'

interface State {
  data: LeaderboardEntry[]
  loading: boolean
  error: Error | null
  refreshedAt: number | null
}

/**
 * Fetches leaderboard rows from the Supabase `leaderboard_cache` table.
 * The keeper refreshes this cache server-side every few minutes, so this
 * hook is cheap and avoids slamming the Solana RPC with on-chain queries.
 *
 * Falls back gracefully: if Supabase is unreachable or the table is empty,
 * `data` will be `[]` and `error` will be set so callers can show a
 * fallback (e.g. the live on-chain leaderboard).
 */
export function useSupabaseLeaderboard(limit = 20) {
  const [state, setState] = useState<State>({
    data: [],
    loading: true,
    error: null,
    refreshedAt: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const rows = await getLeaderboard(limit)
        if (cancelled) return
        setState({
          data: rows,
          loading: false,
          error: null,
          refreshedAt: Date.now(),
        })
      } catch (err) {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }))
      }
    }

    void load()

    // Refetch every 60s so the page stays warm without manual refresh.
    const interval = setInterval(load, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [limit])

  return state
}
