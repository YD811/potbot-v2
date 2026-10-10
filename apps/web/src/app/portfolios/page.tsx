'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePots, useAssetPrices, useAllPotStats } from '@/hooks/usePotIndex'
import { PotCard } from '@/components/pot-index/PotCard'
import { ProtocolStats } from '@/components/pot-index/ProtocolStats'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { potCategory } from '@/lib/pot-index/garden'
import type { PotView } from '@/lib/pot-index/client'

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
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">POTfolios</h1>
          <p className="mt-2 max-w-2xl text-pot-muted">
            A POTfolio is a basket of Solana assets (crypto, Solana natives, tokenized stocks, memes) issued as one index token.
            Deposit USDC to mint it, burn it to get your share of every asset back. No one can withdraw the assets directly.
          </p>
        </div>
        <Link href="/portfolios/new" className="btn-primary whitespace-nowrap">
          + Create a POTfolio
        </Link>
      </header>

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
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`rounded-full border px-3 py-1 text-sm transition ${cat === c.id ? 'border-pot-green bg-pot-green/15 text-pot-green' : 'border-pot-border text-pot-muted hover:text-white'}`}
            >
              {c.label}
            </button>
          ))}
          <span className="mx-2 hidden h-5 w-px bg-pot-border sm:inline-block" />
          {([
            ['tvl', 'Most money'],
            ['holders', 'Most holders'],
            ['perf', 'Top performers'],
            ['newest', 'Newest'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSort(id)}
              className={`rounded-full border px-3 py-1 text-sm transition ${sort === id ? 'border-pot-accent bg-pot-accent/15 text-white' : 'border-pot-border text-pot-muted hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {pots.isLoading && <p className="text-pot-muted">Loading Pots from chain…</p>}
      {pots.isError && <p className="text-red-400">Could not load Pots: {String(pots.error)}</p>}
      {pots.data && pots.data.length === 0 && (
        <div className="card p-8 text-center text-pot-muted">
          No Pots yet. <Link href="/portfolios/new" className="text-pot-green underline">Create the first one.</Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((p) => <PotCard key={p.address.toBase58()} pot={p} prices={prices.data ?? {}} list={stats.data?.[p.address.toBase58()]} />)}
      </div>
    </div>
  )
}
