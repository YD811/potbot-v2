'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { usePotIndexProgram, type PotListStats } from '@/hooks/usePotIndex'
import { fetchWalletPosition, type PotView } from '@/lib/pot-index/client'
import { plantSrc, potSeries, stageForUsd } from '@/lib/pot-index/garden'

/**
 * "Your positions": every POTFolio this wallet holds, with value, average entry and P&L, read from
 * the wallet's own token accounts and transaction history. Shown at the top of /portfolios when a
 * wallet is connected; "My Dashboard" in the wallet menu lands here.
 */
export function MyPositions({ pots, stats }: { pots: PotView[]; stats: Record<string, PotListStats> | undefined }) {
  const { connection, pubkey } = usePotIndexProgram()
  const held = useQuery({
    queryKey: ['pot-index', 'my-positions', pubkey?.toBase58(), pots.map((p) => p.address.toBase58()).join(',')],
    enabled: !!pubkey && pots.length > 0,
    staleTime: 30_000,
    refetchInterval: 45_000,
    queryFn: async () => {
      const atas = pots.map((p) => getAssociatedTokenAddressSync(p.indexMint, pubkey!))
      const infos = await connection.getMultipleAccountsInfo(atas, 'confirmed')
      const out: { pot: PotView; shares: number; costUsd: number; realizedUsd: number }[] = []
      for (let i = 0; i < pots.length; i++) {
        if (!infos[i]) continue
        const bal = await connection.getTokenAccountBalance(atas[i], 'confirmed').catch(() => null)
        const shares = Number(bal?.value.uiAmount ?? 0)
        if (shares <= 0) continue
        const pos = await fetchWalletPosition(connection, pots[i], pubkey!).catch(() => null)
        out.push({ pot: pots[i], shares, costUsd: pos?.costUsd ?? 0, realizedUsd: pos?.realizedUsd ?? 0 })
      }
      return out
    },
  })
  const rows = useMemo(
    () =>
      (held.data ?? []).map((h) => {
        const st = stats?.[h.pot.address.toBase58()]
        const value = h.shares * (st?.indexPrice ?? 1)
        const pnl = h.costUsd > 0 ? value - h.costUsd : 0
        return { ...h, value, pnl, pct: h.costUsd > 0 ? (pnl / h.costUsd) * 100 : 0, image: plantSrc(potSeries(h.pot), stageForUsd(st?.navUsd ?? 0)) }
      }),
    [held.data, stats],
  )
  if (!pubkey) return null
  const total = rows.reduce((a, r) => a + r.value, 0)
  const totalPnl = rows.reduce((a, r) => a + r.pnl, 0)
  const up = totalPnl >= 0
  return (
    <section id="mine" className="mb-6 scroll-mt-24 rounded-3xl border border-pot-border bg-pot-card p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Your positions</div>
          <div className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-white">
            <span className="font-mono tabular-nums">${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        {rows.length > 0 && (
          <div className={`font-mono text-sm tabular-nums ${up ? 'text-pot-green' : 'text-red-300'}`}>
            {up ? '+' : '−'}${Math.abs(totalPnl).toFixed(2)} since entry
          </div>
        )}
      </div>
      {held.isLoading && <p className="text-sm text-pot-muted">Reading your wallet…</p>}
      {held.data && rows.length === 0 && (
        <p className="text-sm text-pot-muted">No POTFolio tokens in this wallet yet. Pick one below and deposit USDC. One signature.</p>
      )}
      {rows.length > 0 && (
        <div className="divide-y divide-pot-border/60">
          {rows.map((r) => (
            <Link key={r.pot.address.toBase58()} href={`/portfolios/${r.pot.indexMint.toBase58()}`} className="flex items-center gap-3 py-3 transition duration-200 ease-pot hover:bg-pot-dark/40">
              <img src={r.image} alt="" className="h-9 w-9 rounded-lg object-contain" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{r.pot.name} <span className="font-mono text-sm text-pot-muted">${r.pot.symbol}</span></div>
                <div className="font-mono text-xs tabular-nums text-pot-muted">{r.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens · avg entry ${r.shares > 0 && r.costUsd > 0 ? (r.costUsd / r.shares).toFixed(4) : '—'}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold tabular-nums text-white">${r.value.toFixed(2)}</div>
                <div className={`font-mono text-xs tabular-nums ${r.pnl >= 0 ? 'text-pot-green' : 'text-red-300'}`}>{r.costUsd > 0 ? `${r.pnl >= 0 ? '+' : '−'}$${Math.abs(r.pnl).toFixed(2)} (${r.pnl >= 0 ? '+' : ''}${r.pct.toFixed(2)}%)` : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
