'use client'

import { usePots, useAssetPrices, useAllPotStats } from '@/hooks/usePotIndex'
import { PotCard } from './PotCard'
import { PotCardSkeletonGrid } from './PotCardSkeleton'
import { ProtocolStats } from './ProtocolStats'

/** Live devnet Pots + counters, for the landing and the judges page. */
export function LivePots({ limit }: { limit?: number }) {
  const pots = usePots()
  const prices = useAssetPrices()
  const stats = useAllPotStats(pots.data)
  const list = (pots.data ?? []).slice(0, limit ?? 99)
  return (
    <div>
      {pots.data && pots.data.length > 0 && <ProtocolStats pots={pots.data} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pots.isLoading && <PotCardSkeletonGrid count={limit ?? 3} />}
        {list.map((p) => (
          <PotCard key={p.address.toBase58()} pot={p} prices={prices.data ?? {}} list={stats.data?.[p.address.toBase58()]} />
        ))}
      </div>
    </div>
  )
}
