'use client'

import Link from 'next/link'
import { usePotStats } from '@/hooks/usePotIndex'
import type { PotView } from '@/lib/pot-index/client'
import { CompositionBar } from './CompositionBar'

export function PotCard({ pot }: { pot: PotView; prices: Record<string, number> }) {
  const stats = usePotStats(pot)
  const mint = pot.indexMint.toBase58()
  return (
    <Link href={`/portfolios/${mint}`} className="card block p-5 transition hover:border-pot-green/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{pot.name}</h2>
          <p className="font-mono text-xs text-pot-green">${pot.symbol}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-pot-muted">NAV</p>
          <p className="font-semibold text-white">
            {stats.data ? `$${stats.data.navUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <CompositionBar pot={pot} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-pot-muted">
        <span>
          Index price{' '}
          <span className="text-white">{stats.data ? `$${stats.data.indexPrice.toFixed(4)}` : '—'}</span>
        </span>
        <span>{pot.paused ? 'Deposits paused' : 'Open'}</span>
      </div>
    </Link>
  )
}
