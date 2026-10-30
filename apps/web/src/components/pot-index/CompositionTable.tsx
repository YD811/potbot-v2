'use client'

import { assetByMint, explorerAddress } from '@/lib/pot-index/registry'
import { ata } from '@/lib/pot-index/client'
import type { PotView } from '@/lib/pot-index/client'
import { legColor } from './CompositionBar'
import { TokenHover } from './TokenHover'

const CATEGORY: Record<string, string> = { solana: 'Solana', crypto: 'Crypto', stock: 'Stock', meme: 'Meme', rwa: 'Real-world', gold: 'Gold' }

/**
 * What is inside a POTFolio: one wide bar of target weights, then a row per asset with
 * target vs actual weight, the value held (linked to the leg's account on Explorer) and the amount.
 */
export function CompositionTable({ pot, actualUsd, cashUsd, legAmounts }: { pot: PotView; actualUsd?: number[]; cashUsd?: number; legAmounts?: number[] }) {
  const total = (actualUsd?.reduce((s, v) => s + v, 0) ?? 0) + (cashUsd ?? 0)
  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">What is inside</h2>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-pot-muted">{pot.legs.length} assets · target weights</p>
      </div>

      <div className="mt-5 flex h-3 w-full gap-[3px] overflow-hidden rounded-full">
        {pot.legs.map((l, i) => (
          <div key={l.mint.toBase58()} className="comp-seg h-full rounded-full" style={{ width: `${l.weightBps / 100}%`, background: legColor(i), animationDelay: `${i * 90}ms` }} />
        ))}
      </div>

      <div className="mt-5 hidden grid-cols-[1.4fr_1fr_.8fr_.9fr] gap-3 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted sm:grid">
        <span>Asset</span>
        <span>Weight, target / now</span>
        <span className="text-right">Value</span>
        <span className="text-right">Amount</span>
      </div>
      <ul className="mt-2 divide-y divide-pot-border">
        {pot.legs.map((l, i) => {
          const a = assetByMint(l.mint.toBase58())
          const target = l.weightBps / 100
          const now = actualUsd && total > 0 ? (actualUsd[i] / total) * 100 : null
          const amount = legAmounts?.[i] !== undefined ? legAmounts[i] / 10 ** l.decimals : null
          return (
            <li key={l.mint.toBase58()} className="grid grid-cols-2 items-center gap-3 px-1 py-3.5 sm:grid-cols-[1.4fr_1fr_.8fr_.9fr]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium text-[#1A120C]" style={{ background: legColor(i) }}>
                  {(a?.symbol ?? '?').slice(0, 4)}
                </span>
                <div className="min-w-0">
                  <TokenHover symbol={a?.symbol ?? ''}><p className="font-semibold text-white">{a?.symbol ?? l.mint.toBase58().slice(0, 4)}</p></TokenHover>
                  <p className="truncate text-xs text-pot-muted">{a?.name?.replace(' (test)', '') ?? 'Token'}{a?.category ? ` · ${CATEGORY[a.category] ?? a.category}` : ''}</p>
                </div>
              </div>
              <div className="text-right sm:text-left">
                <p className="font-mono text-sm tabular-nums text-white">
                  {target}% {now !== null && <span className="text-pot-muted">/ {now.toFixed(1)}%</span>}
                </p>
                <div className="relative mt-1.5 hidden h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-pot-border sm:block">
                  <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${target}%`, background: legColor(i) }} />
                  {now !== null && <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, now)}%`, background: legColor(i) }} />}
                </div>
              </div>
              <div className="font-mono text-sm tabular-nums sm:text-right">
                {actualUsd?.[i] !== undefined ? (
                  <a href={explorerAddress(ata(pot.address, l.mint).toBase58())} target="_blank" rel="noopener noreferrer" className="text-white underline decoration-pot-border underline-offset-4 hover:decoration-pot-muted" title="This asset's account on Explorer">
                    ${actualUsd[i].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </a>
                ) : <span className="text-pot-muted">—</span>}
              </div>
              <p className="text-right font-mono text-sm tabular-nums text-pot-muted">
                {amount !== null ? amount.toLocaleString(undefined, { maximumFractionDigits: amount < 1 ? 6 : 2 }) : '—'}
              </p>
            </li>
          )
        })}
        {cashUsd !== undefined && total > 0 && cashUsd > 0.005 && (
          <li className="grid grid-cols-2 items-center gap-3 px-1 py-3.5 sm:grid-cols-[1.4fr_1fr_.8fr_.9fr]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-pot-border font-mono text-[10px] text-pot-muted">USDC</span>
              <div>
                <p className="font-semibold text-white">USDC</p>
                <p className="text-xs text-pot-muted">Waiting to be bought in</p>
              </div>
            </div>
            <p className="text-right font-mono text-sm tabular-nums text-pot-muted sm:text-left">{((cashUsd / total) * 100).toFixed(1)}%</p>
            <p className="font-mono text-sm tabular-nums text-white sm:text-right">${cashUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-right font-mono text-sm tabular-nums text-pot-muted">{cashUsd.toFixed(2)}</p>
          </li>
        )}
      </ul>
      <p className="mt-4 text-sm text-pot-muted">New deposits arrive as USDC and are bought into the basket. A redemption takes every asset out in proportion.</p>
    </div>
  )
}
