'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePots, useAssetPrices } from '@/hooks/usePotIndex'
import { PotCard } from '@/components/pot-index/PotCard'
import { ProtocolStats } from '@/components/pot-index/ProtocolStats'
import { POT_INDEX_SETTINGS, assetByMint } from '@/lib/pot-index/registry'
import type { PotView } from '@/lib/pot-index/client'

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'crypto', label: 'Crypto majors' },
  { id: 'solana', label: 'Solana native' },
  { id: 'stock', label: 'Stocks (xStocks)' },
  { id: 'meme', label: 'Memes' },
] as const

/** A Pot's category = the category carrying the most weight. */
function potCategory(p: PotView): string {
  const w: Record<string, number> = {}
  for (const l of p.legs) {
    const c = assetByMint(l.mint.toBase58())?.category ?? 'crypto'
    w[c] = (w[c] ?? 0) + l.weightBps
  }
  return Object.entries(w).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'crypto'
}

export default function PortfoliosPage() {
  const pots = usePots()
  const prices = useAssetPrices()
  const [cat, setCat] = useState<string>('all')
  const shown = useMemo(() => (pots.data ?? []).filter((p) => cat === 'all' || potCategory(p) === cat), [pots.data, cat])

  useEffect(() => {
    document.title = 'Portfolios — PotBot'
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Portfolios</h1>
          <p className="mt-2 max-w-2xl text-pot-muted">
            Every Pot is a basket of Solana assets with fixed target weights and one index token. Deposit USDC to mint
            it, burn it to get your share of every asset back. No one can withdraw the assets directly.
          </p>
        </div>
        <Link href="/portfolios/new" className="btn-primary whitespace-nowrap">
          + Create a Pot
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
        <div className="mb-5 flex flex-wrap gap-2">
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
        {shown.map((p) => <PotCard key={p.address.toBase58()} pot={p} prices={prices.data ?? {}} />)}
      </div>
    </div>
  )
}
