'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePots, useAssetPrices, useAllPotStats } from '@/hooks/usePotIndex'
import { PotCard } from '@/components/pot-index/PotCard'
import { PotCardSkeletonGrid } from '@/components/pot-index/PotCardSkeleton'
import { ProtocolStats } from '@/components/pot-index/ProtocolStats'
import { MyPositions } from '@/components/pot-index/MyPositions'
import { potCategory } from '@/lib/pot-index/garden'
import type { PotView } from '@/lib/pot-index/client'
import { PageHeader } from '@/components/PageHeader'

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'solana', label: 'Solana' },
  { id: 'stock', label: 'Stocks' },
  { id: 'meme', label: 'Memes' },
] as const

const SORTS = [
  { id: 'tvl', label: 'Value' },
  { id: 'holders', label: 'Holders' },
  { id: 'perf', label: 'Performance' },
  { id: 'newest', label: 'Newest' },
] as const

const CHIP = 'rounded-full border px-3 py-1 text-xs transition duration-200 ease-pot'
const CHIP_IDLE = 'border-pot-border text-pot-muted hover:border-pot-muted/60 hover:text-white'
const CHIP_ACTIVE = 'bg-pot-accent text-pot-dark border-pot-accent'

export default function PortfoliosPage() {
  const pots = usePots()
  const prices = useAssetPrices()
  const [cat, setCat] = useState<string>('all')
  const [sort, setSort] = useState<'tvl' | 'holders' | 'newest' | 'perf'>('tvl')
  const stats = useAllPotStats(pots.data)
  const shown = useMemo(() => {
    const list = (pots.data ?? []).filter((p) => cat === 'all' || potCategory(p) === cat)
    const st = stats.data ?? {}
    const g = (p: PotView) => st[p.address.toBase58()]
    // Stable order: coarse buckets so cent-level price moves do not swap rows, then creation time, then address.
    const tie = (a: PotView, b: PotView) => b.createdAt - a.createdAt || a.address.toBase58().localeCompare(b.address.toBase58())
    return [...list].sort((a, b) => {
      if (sort === 'newest') return tie(a, b)
      if (sort === 'holders') return (g(b)?.holders ?? 0) - (g(a)?.holders ?? 0) || tie(a, b)
      if (sort === 'perf') return Math.round(((g(b)?.perf ?? -1) - (g(a)?.perf ?? -1)) * 1000) || tie(a, b)
      return Math.round((g(b)?.navUsd ?? 0) - (g(a)?.navUsd ?? 0)) || tie(a, b)
    })
  }, [pots.data, cat, sort, stats.data])

  useEffect(() => {
    document.title = 'POTFolios · PotBot'
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Catalog"
        title="POTFolios"
        lede="Baskets built by creators. Hold one token, leave any time."
        action={
          <Link href="/portfolios/new" className="btn-primary whitespace-nowrap">
            Build a POTFolio
          </Link>
        }
      />

      {pots.data && pots.data.length > 0 && <MyPositions pots={pots.data} stats={stats.data} />}
      {pots.data && pots.data.length > 0 && <ProtocolStats pots={pots.data} />}
      {pots.data && pots.data.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Category">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`${CHIP} ${cat === c.id ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort by">
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">Sort</span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                aria-pressed={sort === s.id}
                className={`${CHIP} ${sort === s.id ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {pots.isError && (
        <p className="text-pot-muted">
          Could not load POTFolios: {String(pots.error)}. Refresh the page to try again.
        </p>
      )}
      {pots.data && pots.data.length === 0 && (
        <div className="rounded-3xl border border-pot-border bg-pot-card p-8 text-center">
          <p className="text-base text-pot-muted">No POTFolios here yet.</p>
          <Link href="/portfolios/new" className="btn-primary mt-5 inline-block">
            Build the first one
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pots.isLoading && <PotCardSkeletonGrid count={6} />}
        {shown.map((p) => <PotCard key={p.address.toBase58()} pot={p} prices={prices.data ?? {}} list={stats.data?.[p.address.toBase58()]} />)}
      </div>

      <section className="mt-14 rounded-[28px] bg-pot-accent p-8 text-[#1A120C]">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Have a thesis? Turn it into a token.</h2>
        <p className="mt-3 max-w-[40em] text-[15px] sm:text-base">
          Pick up to 5 assets, set the weights, share the link. You earn on every deposit and never hold anyone&apos;s money.
        </p>
        <Link href="/portfolios/new" className="mt-6 inline-block rounded-full border border-current px-5 py-2.5 text-sm font-semibold">
          Build a POTFolio
        </Link>
      </section>
    </div>
  )
}
