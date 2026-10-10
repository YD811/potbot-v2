'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePots, useAssetPrices, useAllPotStats } from '@/hooks/usePotIndex'
import { PotCard } from '@/components/pot-index/PotCard'
import { ProtocolStats } from '@/components/pot-index/ProtocolStats'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { potCategory } from '@/lib/pot-index/garden'
import type { PotView } from '@/lib/pot-index/client'
import { PageHeader } from '@/components/PageHeader'

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'crypto', label: 'Crypto majors' },
  { id: 'solana', label: 'Solana native' },
  { id: 'stock', label: 'Stocks (xStocks)' },
  { id: 'meme', label: 'Memes' },
] as const

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
    return [...list].sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt
      if (sort === 'holders') return (g(b)?.holders ?? 0) - (g(a)?.holders ?? 0)
      if (sort === 'perf') return (g(b)?.perf ?? -1) - (g(a)?.perf ?? -1)
      return (g(b)?.navUsd ?? 0) - (g(a)?.navUsd ?? 0)
    })
  }, [pots.data, cat, sort, stats.data])

  useEffect(() => {
    document.title = 'POTfolios — PotBot'
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Live on devnet"
        title="POTfolios"
        lede="One token, a whole basket inside. Deposit USDC to get it, redeem it any time for the assets or USDC."
        action={
        <Link href="/portfolios/new" className="btn-primary whitespace-nowrap">
          + Create a POTfolio
        </Link>
        }
      />

      {POT_INDEX_SETTINGS.cluster !== 'mainnet-beta' && (
        <div className="mb-6 rounded-xl border border-pot-accent/40 bg-pot-accent/10 px-4 py-3 text-sm text-white">
          Devnet build for Colosseum Crypto World&apos;s Fair. Test tokens, real Pyth prices.{' '}
          <Link href="/worldsfair" className="underline hover:text-pot-green">
            What was built →
          </Link>
        </div>
      )}

      {pots.data && pots.data.length > 0 && <ProtocolStats pots={pots.data} />}
      {pots.data && pots.data.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-white/70">
            Category
            <select className="input w-auto px-3 py-1.5 text-sm" value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}>
              {CATS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            Sort by
            <select className="input w-auto px-3 py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="tvl">Most money</option>
              <option value="holders">Most holders</option>
              <option value="perf">Top performers</option>
              <option value="newest">Newest</option>
            </select>
          </label>
          <span className="ml-auto text-sm text-white/70">{shown.length} POTfolio{shown.length === 1 ? '' : 's'}</span>
        </div>
      )}
      {pots.isLoading && <p className="text-white/70">Loading Pots from chain…</p>}
      {pots.isError && <p className="text-red-400">Could not load Pots: {String(pots.error)}</p>}
      {pots.data && pots.data.length === 0 && (
        <div className="card p-8 text-center text-white/70">
          No Pots yet. <Link href="/portfolios/new" className="text-pot-green underline">Create the first one.</Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((p) => <PotCard key={p.address.toBase58()} pot={p} prices={prices.data ?? {}} list={stats.data?.[p.address.toBase58()]} />)}
      </div>
    </div>
  )
}
