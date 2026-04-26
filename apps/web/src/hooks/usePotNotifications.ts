'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface PotNotification {
  id: string
  pot_pubkey: string
  kind: 'trade' | 'proposal' | 'member_added' | 'member_removed' | 'strategy_changed'
  signature: string
  payload: Record<string, unknown> | null
  created_at: string
}

export function usePotNotifications(potPubkey: string) {
  const [notifications, setNotifications] = useState<PotNotification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const subscribe = useCallback(() => {
    if (!potPubkey) return

    const channel = supabase.channel(`pot_notifications:${potPubkey}`)
    channelRef.current = channel

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pot_notifications',
          filter: `pot_pubkey=eq.${potPubkey}`,
        },
        (event) => {
          const incoming = event.new as PotNotification
          setNotifications((prev) => [incoming, ...prev].slice(0, 100))
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          return
        }

        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false)
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
          reconnectTimer.current = setTimeout(() => {
            if (channelRef.current) supabase.removeChannel(channelRef.current)
            subscribe()
          }, 1_500)
        }
      })
  }, [potPubkey])

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      const { data, error } = await supabase
        .from('pot_notifications')
        .select('*')
        .eq('pot_pubkey', potPubkey)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!cancelled && !error) {
        setNotifications((data as PotNotification[]) ?? [])
      }
    }

    if (potPubkey) {
      void loadInitial()
      subscribe()
    }

    return () => {
      cancelled = true
      setIsConnected(false)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [potPubkey, subscribe])

  return { notifications, isConnected }
}
