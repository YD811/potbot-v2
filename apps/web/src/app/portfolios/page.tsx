'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePots, useAssetPrices } from '@/hooks/usePotIndex'
import { PotCard } from '@/components/pot-index/PotCard'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'

export default function PortfoliosPage() {
  const pots = usePots()
  const prices = useAssetPrices()

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

      {pots.isLoading && <p className="text-pot-muted">Loading Pots from chain…</p>}
      {pots.isError && <p className="text-red-400">Could not load Pots: {String(pots.error)}</p>}
      {pots.data && pots.data.length === 0 && (
        <div className="card p-8 text-center text-pot-muted">
          No Pots yet. <Link href="/portfolios/new" className="text-pot-green underline">Create the first one.</Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {pots.data?.map((p) => <PotCard key={p.address.toBase58()} pot={p} prices={prices.data ?? {}} />)}
      </div>
    </div>
  )
}
