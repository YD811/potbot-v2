'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// The /pots route IS the dashboard. It merges three previously-separate
// pages into a single tabbed view: My Pots · All Vaults · Leaderboard.
// Each existing page is a self-contained client component, so we lazy-load
// and render them inside the active tab.
const MyPotsView     = dynamic(() => import('@/app/my-pots/page'))
const AllVaultsView  = dynamic(() => import('@/app/vaults/page'))
const LeaderboardView = dynamic(() => import('@/app/leaderboard/page'))

const TABS = [
  { key: 'all',         label: '⚡ All Vaults' },
  { key: 'mine',        label: '🪴 My Pots' },
  { key: 'leaderboard', label: '🏆 Leaderboard' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function PotsDashboardPage() {
  const [tab, setTab] = useState<TabKey>('all')

  useEffect(() => {
    document.title = 'Vaults — PotBot'
  }, [])

  return (
    <div className="min-h-screen">
      {/* Tab switcher */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-4">
        <div className="flex items-center gap-1 rounded-xl border border-pot-border bg-pot-card p-1 w-fit">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === tb.key
                  ? 'bg-pot-green text-pot-dark'
                  : 'text-pot-muted hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'all' && <AllVaultsView />}
      {tab === 'mine' && <MyPotsView />}
      {tab === 'leaderboard' && <LeaderboardView />}
    </div>
  )
}
