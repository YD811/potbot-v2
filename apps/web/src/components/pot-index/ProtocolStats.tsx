'use client'

import { useQuery } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { useAssetPrices } from '@/hooks/usePotIndex'
import { fetchPotActivity, fetchPotBalances, navUsd, type PotView } from '@/lib/pot-index/client'

/** Devnet-wide counters computed client-side from chain: Pots, deposits, unique wallets, TVL. */
export function ProtocolStats({ pots }: { pots: PotView[] }) {
  const { connection } = useConnection()
  const prices = useAssetPrices()
  const q = useQuery({
    queryKey: ['pot-index', 'protocol-stats', pots.map((p) => p.address.toBase58()).join(','), !!prices.data],
    enabled: pots.length > 0,
    refetchInterval: 90_000,
    staleTime: 60_000,
    queryFn: async () => {
      const px = prices.data ?? {}
      let tvl = 0
      let deposits = 0
      let depositVolume = 0
      const wallets = new Set<string>()
      for (const p of pots) {
        const [bal, events] = await Promise.all([fetchPotBalances(connection, p), fetchPotActivity(connection, p, 40)])
        tvl += navUsd(p, bal, px)
        for (const e of events) {
          if (e.kind === 'deposit') {
            deposits += 1
            depositVolume += e.amountUsdc
            wallets.add(e.user)
          }
          if (e.kind === 'exit') wallets.add(e.user)
        }
      }
      return { tvl, deposits, depositVolume, wallets: wallets.size }
    },
  })
  const d = q.data
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  const items = [
    { label: 'Pots', value: String(pots.length) },
    { label: 'TVL (devnet)', value: d ? fmt(d.tvl) : '—' },
    { label: 'Deposits', value: d ? `${d.deposits} · ${fmt(d.depositVolume)}` : '—' },
    { label: 'Wallets', value: d ? String(d.wallets) : '—' },
  ]
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="card px-4 py-3">
          <p className="text-xs text-pot-muted">{it.label}</p>
          <p className="text-lg font-bold text-white">{it.value}</p>
        </div>
      ))}
    </div>
  )
}
