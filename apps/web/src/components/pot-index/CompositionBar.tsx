'use client'

import { assetByMint } from '@/lib/pot-index/registry'
import type { PotView } from '@/lib/pot-index/client'
import { TokenHover } from './TokenHover'

const COLORS = ['#E07A4F', '#E9C46A', '#9CCB6E', '#7FA7C9', '#B08BC9']

export function legColor(i: number) {
  return COLORS[i % COLORS.length]
}

/** Target-weight bar with a legend. `actualUsd` (optional) shows current vs target. */
export function CompositionBar({ pot, actualUsd, cashUsd, legAmounts }: { pot: PotView; actualUsd?: number[]; cashUsd?: number; legAmounts?: number[] }) {
  const total = (actualUsd?.reduce((s, v) => s + v, 0) ?? 0) + (cashUsd ?? 0)
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-pot-border">
        {pot.legs.map((l, i) => (
          <div key={l.mint.toBase58()} style={{ width: `${l.weightBps / 100}%`, background: legColor(i) }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {pot.legs.map((l, i) => {
          const a = assetByMint(l.mint.toBase58())
          const actualPct = actualUsd && total > 0 ? (actualUsd[i] / total) * 100 : null
          return (
            <li key={l.mint.toBase58()} className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: legColor(i) }} />
              <TokenHover symbol={a?.symbol ?? ''}><span className="font-semibold text-white">{a?.symbol ?? l.mint.toBase58().slice(0, 4)}</span></TokenHover>
              <span
                className="cursor-help text-pot-muted"
                title={
                  actualPct !== null
                    ? `Target ${l.weightBps / 100}% · now ${actualPct.toFixed(1)}%` +
                      (legAmounts && legAmounts[i] !== undefined ? ` · ${(legAmounts[i] / 10 ** l.decimals).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${a?.symbol ?? ''} ≈ $${(actualUsd![i]).toFixed(2)} in the Pot` : '')
                    : undefined
                }
              >
                {l.weightBps / 100}%
              </span>
            </li>
          )
        })}
        {cashUsd !== undefined && total > 0 && (
          <li className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-pot-muted" />
            <span className="font-semibold text-white">USDC</span>
            <span className="cursor-help text-pot-muted" title={`$${cashUsd.toFixed(2)} USDC waiting to be bought into the basket`}>{((cashUsd / total) * 100).toFixed(1)}%</span>
          </li>
        )}
      </ul>
    </div>
  )
}
