'use client'

import { usePotActivity } from '@/hooks/usePotIndex'
import type { PotView } from '@/lib/pot-index/client'
import { CASH_LEG } from '@/lib/pot-index/client'
import { assetByMint, explorerTx } from '@/lib/pot-index/registry'

function short(k: string) {
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

function ago(t: number | null) {
  if (!t) return ''
  const s = Math.max(0, Math.floor(Date.now() / 1000 - t))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function ActivityFeed({ pot }: { pot: PotView }) {
  const q = usePotActivity(pot)
  const legSym = (i: number) => (i === CASH_LEG ? 'USDC' : assetByMint(pot.legs[i]?.mint.toBase58())?.symbol ?? `leg ${i}`)
  const legDec = (i: number) => (i === CASH_LEG ? 6 : pot.legs[i]?.decimals ?? 0)

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-white">On-chain activity</h2>
        <span className="text-xs text-pot-muted">{q.isFetching ? 'updating…' : 'live from devnet'}</span>
      </div>
      {q.isLoading && <p className="text-sm text-pot-muted">Reading transaction history…</p>}
      {q.data && q.data.length === 0 && <p className="text-sm text-pot-muted">No activity yet. Be the first to deposit.</p>}
      <ul className="divide-y divide-pot-border text-sm">
        {q.data?.map((e) => (
          <li key={e.sig + e.kind} className="flex items-start justify-between gap-3 py-2">
            <div>
              {e.kind === 'deposit' && (
                <>
                  <span className="font-semibold text-pot-green">Deposit</span>{' '}
                  <span className="text-white">{e.amountUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span>
                  <span className="text-pot-muted"> → {e.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${pot.symbol} · by {short(e.user)}</span>
                </>
              )}
              {e.kind === 'exit' && (
                <>
                  <span className="font-semibold text-pot-accent">Exit</span>{' '}
                  <span className="text-white">{e.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${pot.symbol}</span>
                  <span className="text-pot-muted"> burned → share of every asset in kind · by {short(e.user)}</span>
                </>
              )}
              {e.kind === 'rebalance' && (
                <>
                  <span className="font-semibold text-sky-300">Rebalance</span>{' '}
                  <span className="text-white">
                    {(e.amountOut / 10 ** legDec(e.legOut)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {legSym(e.legOut)} →{' '}
                    {(e.received / 10 ** legDec(e.legIn)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {legSym(e.legIn)}
                  </span>
                  <span className="text-pot-muted"> · keeper {short(e.keeper)}</span>
                </>
              )}
              {e.kind === 'created' && <span className="font-semibold text-white">Pot created</span>}
            </div>
            <a className="shrink-0 text-xs text-pot-muted hover:text-pot-green" href={explorerTx(e.sig)} target="_blank" rel="noreferrer">
              {ago(e.time)} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
