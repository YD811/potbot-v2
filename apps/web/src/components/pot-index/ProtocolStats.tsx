'use client'

import { useQuery } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { useAssetPrices } from '@/hooks/usePotIndex'
import { fetchPotActivity, fetchPotBalances, navUsd, type PotView } from '@/lib/pot-index/client'

/** Protocol-wide counters computed client-side from chain: Pots, deposits, unique wallets, TVL. */
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
    { label: 'POTFolios', value: String(pots.length) },
    { label: 'Total value', value: d ? fmt(d.tvl) : '—' },
    { label: 'Wallets', value: d ? String(d.wallets) : '—' },
  ]
  return (
    <div className="mb-6 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-pot-border pb-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-2">
          <span className="font-mono text-base tabular-nums text-white">{it.value}</span>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">{it.label}</span>
        </div>
      ))}
    </div>
  )
}
