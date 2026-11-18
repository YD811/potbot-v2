'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { creatorLabel, isOfficial, type BagWeights } from '@/lib/bag/recipes'
import { WeightBar } from './WeightBar'

export interface BagRow {
  slug: string
  name: string
  creator: string
  weights: BagWeights
  joins: number
  volumeUsd: number
}

/** Community BAGs for lists outside /bag (catalog, home). */
export function useBagRecipes() {
  return useQuery<{ rows: BagRow[] }>({
    queryKey: ['bag-recipes'],
    queryFn: async () => (await fetch('/api/bag/recipes')).json(),
    refetchInterval: 60_000,
  })
}

/** A BAG as a catalog card, sized like a POTFolio card. */
export function BagCard({ bag }: { bag: BagRow }) {
  return (
    <Link href={`/bag/${bag.slug}`} className="card flex h-full flex-col gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-pot-green">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold text-white">{bag.name}</p>
          <p className="mt-0.5 font-mono text-xs text-pot-muted">by {creatorLabel(bag)}</p>
        </div>
        <span className="shrink-0 rounded-full border border-pot-green px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pot-green">
          BAG{isOfficial(bag) ? ' · official' : ''}
        </span>
      </div>
      <WeightBar weights={bag.weights} legend />
      <div className="mt-auto flex justify-between border-t border-pot-border pt-3 font-mono text-sm">
        <span className="text-white">{bag.joins}<span className="ml-1 text-xs text-pot-muted">in</span></span>
        <span className="text-white">${bag.volumeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}<span className="ml-1 text-xs text-pot-muted">traded</span></span>
      </div>
    </Link>
  )
}
