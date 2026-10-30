'use client'

import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'

import Link from 'next/link'
import { useNavHistoryAll, usePotStats, type PotListStats } from '@/hooks/usePotIndex'
import { Sparkline } from './NavChart'
import type { PotView } from '@/lib/pot-index/client'
import { CompositionBar } from './CompositionBar'
import { PlantBadge } from './PlantBadge'

export function PotCard({ pot, list }: { pot: PotView; prices: Record<string, number>; list?: PotListStats }) {
  const stats = usePotStats(pot)
  const history = useNavHistoryAll()
  const series = history.data?.[pot.indexMint.toBase58()] ?? []
  const change7d = series.length >= 2 && series[0].price > 0 ? (series[series.length - 1].price / series[0].price - 1) * 100 : null
  const perf = list?.perf
  const perfCls = perf === undefined ? 'text-white/70' : perf >= 0 ? 'text-pot-green' : 'text-red-400'
  const mint = pot.indexMint.toBase58()
  return (
    <Link href={`/portfolios/${mint}`} className="card block rounded-3xl p-5 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60 hover:shadow-[0_24px_40px_-32px_rgba(0,0,0,.6)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlantBadge pot={pot} navUsd={stats.data?.navUsd} />
          <div>
          <h2 className="font-display text-xl font-semibold text-white">{pot.name}</h2>
          <p className="font-mono text-xs text-pot-muted">${pot.symbol}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/70">{POT_INDEX_SETTINGS.cluster === 'devnet' ? 'TVL, devnet' : 'TVL'}</p>
          <p className="font-mono font-medium text-white tabular-nums">
            {stats.data ? `$${stats.data.navUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </p>
          <p className={`text-xs ${perfCls}`}>{perf === undefined ? '' : `${perf >= 0 ? '+' : ''}${(perf * 100).toFixed(2)}% since launch`}</p>
        </div>
      </div>
      <div className="mt-4">
        <CompositionBar pot={pot} />
      </div>
      {series.length >= 2 && (
        <div className="mt-3 flex items-center gap-3">
          <Sparkline points={series} width={240} height={36} fill={false} className="h-9 flex-1" />
          {change7d != null && (
            <span className={`text-xs ${change7d >= 0 ? 'text-pot-green' : 'text-pot-muted'}`}>{change7d >= 0 ? '+' : ''}{change7d.toFixed(2)}% 7d</span>
          )}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-white/70">
        <span>
          Index price{' '}
          <span className="text-white">{stats.data ? `$${stats.data.indexPrice.toFixed(4)}` : '—'}</span>
        </span>
        <span>{list ? `${list.holders} holder${list.holders === 1 ? '' : 's'}` : ''}{pot.paused ? ' · paused' : ''}</span>
      </div>
    </Link>
  )
}
