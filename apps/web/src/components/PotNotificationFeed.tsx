'use client'

import { useMemo, useState } from 'react'
import { usePotNotifications } from '@/hooks/usePotNotifications'

const ICONS = {
  trade: '💱',
  proposal: '🗳️',
  member_added: '➕',
  member_removed: '➖',
  strategy_changed: '⚙️',
} as const

const LABELS = {
  trade: 'Trade executed',
  proposal: 'Proposal created',
  member_added: 'Member added',
  member_removed: 'Member removed',
  strategy_changed: 'Strategy changed',
} as const

function relativeTime(iso: string): string {
  const delta = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (delta < 60) return `${Math.max(delta, 0)}s ago`
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  return `${Math.floor(delta / 86400)}d ago`
}

export default function PotNotificationFeed({ potPubkey }: { potPubkey: string }) {
  const { notifications, isConnected } = usePotNotifications(potPubkey)
  const [visibleCount, setVisibleCount] = useState(20)

  const visible = useMemo(() => notifications.slice(0, visibleCount), [notifications, visibleCount])

  return (
    <div className="bg-pot-card border border-pot-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold">Live activity</h3>
        <span className={`text-xs ${isConnected ? 'text-pot-green' : 'text-yellow-400'}`}>
          {isConnected ? '● Connected' : '● Reconnecting'}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-pot-muted">No notifications yet.</p>
      ) : (
        <ol className="space-y-3">
          {visible.map((notification) => (
            <li key={notification.id} className="border-l border-pot-border pl-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white">
                    <span className="mr-2">{ICONS[notification.kind]}</span>
                    {LABELS[notification.kind]}
                  </p>
                  <p className="text-xs text-pot-muted mt-1">{relativeTime(notification.created_at)}</p>
                </div>
                <a
                  className="text-xs text-pot-accent hover:underline"
                  href={`https://solscan.io/tx/${notification.signature}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Solscan ↗
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}

      {notifications.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 20)}
          className="text-sm text-pot-accent hover:underline"
        >
          Load more
        </button>
      )}
    </div>
  )
}
