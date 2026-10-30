'use client'

import { useMemo, useState } from 'react'
import { usePotActivity } from '@/hooks/usePotIndex'
import type { PotEvent, PotView } from '@/lib/pot-index/client'
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

const LINK = 'underline-offset-2 transition hover:text-white hover:underline'

const ICON: Record<string, { g: string; cls: string }> = {
  deposit: { g: '+', cls: 'bg-pot-green/15 text-pot-green' },
  exit: { g: '−', cls: 'bg-pot-accent/15 text-pot-accent' },
  rebalance: { g: '⇄', cls: 'border border-pot-border text-pot-muted' },
  allocation: { g: '↓', cls: 'border border-pot-border text-pot-muted' },
  created: { g: '✦', cls: 'bg-pot-accent text-[#1A120C]' },
}

export function ActivityFeed({ pot }: { pot: PotView }) {
  const q = usePotActivity(pot)
  const [all, setAll] = useState(false)
  const legSym = (i: number) => (i === CASH_LEG ? 'USDC' : assetByMint(pot.legs[i]?.mint.toBase58())?.symbol ?? `leg ${i}`)
  const legDec = (i: number) => (i === CASH_LEG ? 6 : pot.legs[i]?.decimals ?? 0)
  type Reb = Extract<PotEvent, { kind: 'rebalance' }>
  type Row = PotEvent | { kind: 'allocation'; sig: string; time: number | null; items: Reb[] }
  // Consecutive cash deploys (USDC → asset) are one "allocation" of fresh deposits: show them as one row.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const e of q.data ?? []) {
      const last = out[out.length - 1]
      if (e.kind === 'rebalance' && e.legOut === CASH_LEG) {
        if (last && last.kind === 'allocation') last.items.push(e)
        else out.push({ kind: 'allocation', sig: e.sig, time: e.time, items: [e] })
      } else out.push(e)
    }
    return out.map((r) => (r.kind === 'allocation' && r.items.length === 1 ? r.items[0] : r))
  }, [q.data])

  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">Activity</h2>
        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">
          {q.isFetching ? 'Updating' : <><span className="h-1.5 w-1.5 rounded-full bg-pot-green" aria-hidden />Live</>}
        </span>
      </div>
      {q.isLoading && <p className="text-sm text-pot-muted">Reading transaction history.</p>}
      {q.data && q.data.length === 0 && <p className="text-sm text-pot-muted">No activity yet. Be the first to deposit.</p>}
      <ul className="divide-y divide-pot-border text-sm">
        {(all ? rows : rows.slice(0, 6)).map((e) => (
          <li key={e.sig + e.kind} className="flex items-start justify-between gap-3 py-3">
            <span aria-hidden className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${ICON[e.kind].cls}`}>{ICON[e.kind].g}</span>
            <div className="min-w-0 flex-1 leading-relaxed">
              {e.kind === 'deposit' && (
                <>
                  <span className="font-semibold text-white">Deposit</span>{' '}
                  <span className="font-mono tabular-nums text-white">{e.amountUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span>
                  <span className="text-pot-muted"> → <span className="font-mono tabular-nums">{e.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${pot.symbol}</span> · by <span className="font-mono">{short(e.user)}</span></span>
                </>
              )}
              {e.kind === 'exit' && (
                <>
                  <span className="font-semibold text-white">Redeem</span>{' '}
                  <span className="font-mono tabular-nums text-white">{e.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${pot.symbol}</span>
                  <span className="text-pot-muted">
                    {e.toUsdc ? <> → <span className="font-mono tabular-nums">{e.usdcOut.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span></> : <> → share of every asset in kind</>} · by <span className="font-mono">{short(e.user)}</span>
                  </span>
                </>
              )}
              {e.kind === 'rebalance' && (
                <>
                  <span className="font-semibold text-pot-muted">Rebalance</span>{' '}
                  <span className="font-mono tabular-nums text-white">
                    {(e.amountOut / 10 ** legDec(e.legOut)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {legSym(e.legOut)} →{' '}
                    {(e.received / 10 ** legDec(e.legIn)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {legSym(e.legIn)}
                  </span>
                  <span className="text-pot-muted"> · keeper <span className="font-mono">{short(e.keeper)}</span></span>
                </>
              )}
              {e.kind === 'allocation' && (
                <details className="inline">
                  <summary className="cursor-pointer select-none list-none">
                    <span className="font-semibold text-pot-muted">Allocated</span>{' '}
                    <span className="font-mono tabular-nums text-white">{(e.items.reduce((a, r) => a + r.amountOut, 0) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span>
                    <span className="text-pot-muted"> → {Array.from(new Set(e.items.map((r) => legSym(r.legIn)))).join(', ')} · {e.items.length} trades · keeper <span className="font-mono">{short(e.items[0].keeper)}</span> · show</span>
                  </summary>
                  <ul className="mt-1 space-y-0.5 pl-3 font-mono text-xs tabular-nums text-pot-muted">
                    {e.items.map((r) => (
                      <li key={r.sig}>
                        {(r.amountOut / 1e6).toLocaleString(undefined, { maximumFractionDigits: 4 })} USDC → {(r.received / 10 ** legDec(r.legIn)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {legSym(r.legIn)}{' '}
                        <a className={LINK} href={explorerTx(r.sig)} target="_blank" rel="noreferrer">tx</a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {e.kind === 'created' && <span className="font-semibold text-white">POTFolio created</span>}
            </div>
            <a className={`shrink-0 font-mono text-xs tabular-nums text-pot-muted ${LINK}`} href={explorerTx(e.sig)} target="_blank" rel="noreferrer">
              {ago(e.time)}
            </a>
          </li>
        ))}
      </ul>
      {rows.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 w-full rounded-full border border-pot-border py-2 text-sm font-semibold text-white transition hover:border-pot-muted/60">
          {all ? 'Show less' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  )
}
