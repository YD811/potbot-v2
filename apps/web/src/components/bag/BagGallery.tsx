'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { creatorLabel, encodeWeights, isOfficial, type BagWeights } from '@/lib/bag/recipes'
import { WeightBar } from './WeightBar'

interface Row {
  slug: string
  name: string
  creator: string
  weights: BagWeights
  joins: number
  volumeUsd: number
}

/** Community BAGs, ranked by volume bought on them, then by wallets joined. */
export function BagGallery() {
  const { data, isLoading } = useQuery<{ rows: Row[] }>({
    queryKey: ['bag-recipes'],
    queryFn: async () => (await fetch('/api/bag/recipes')).json(),
    refetchInterval: 60_000,
  })
  const rows = data?.rows ?? []

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-white">Community BAGs</h2>
        <p className="text-xs text-pot-muted">PotBot BAG first, then by traded volume and wallets joined</p>
      </div>

      {isLoading ? (
        <div className="card mt-4 p-5 text-sm text-pot-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card mt-4 p-5 text-sm text-pot-muted">No BAGs yet. Build the first one above and it tops this list.</div>
      ) : (
        <ol className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li key={r.slug}>
              <Link href={`/bag/${r.slug}`} className={`card flex flex-col gap-3 p-4 transition hover:border-pot-accent sm:flex-row sm:items-center ${isOfficial(r) ? 'border-pot-accent/60' : ''}`}>
                <span className="w-8 shrink-0 font-mono text-sm text-pot-muted">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {r.name}
                    {isOfficial(r) && <span className="ml-2 rounded-full border border-pot-accent px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-widest text-pot-accent">Official</span>}
                  </p>
                  <p className="font-mono text-xs text-pot-muted">by {creatorLabel(r)} · {encodeWeights(r.weights).replace(/-/g, ' / ')}</p>
                </div>
                <WeightBar weights={r.weights} className="w-full sm:w-40" />
                <div className="flex shrink-0 gap-5 font-mono text-sm sm:w-44 sm:justify-end">
                  <span className="text-white">{r.joins}<span className="ml-1 text-xs text-pot-muted">joined</span></span>
                  <span className="text-white">${r.volumeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}<span className="ml-1 text-xs text-pot-muted">vol</span></span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
