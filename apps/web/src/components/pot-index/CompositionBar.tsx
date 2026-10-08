'use client'

import { assetByMint } from '@/lib/pot-index/registry'
import type { PotView } from '@/lib/pot-index/client'

const COLORS = ['#00ff88', '#8b5cf6', '#38bdf8', '#f59e0b', '#f472b6']

export function legColor(i: number) {
  return COLORS[i % COLORS.length]
}

/** Target-weight bar with a legend. `actualUsd` (optional) shows current vs target. */
export function CompositionBar({ pot, actualUsd, cashUsd }: { pot: PotView; actualUsd?: number[]; cashUsd?: number }) {
  const total = (actualUsd?.reduce((s, v) => s + v, 0) ?? 0) + (cashUsd ?? 0)
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-pot-border">
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
              <span className="font-semibold text-white">{a?.symbol ?? l.mint.toBase58().slice(0, 4)}</span>
              <span className="text-pot-muted">
                {l.weightBps / 100}%
                {actualPct !== null && <span className="ml-1 text-xs">(now {actualPct.toFixed(1)}%)</span>}
              </span>
            </li>
          )
        })}
        {cashUsd !== undefined && total > 0 && (
          <li className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-pot-muted" />
            <span className="font-semibold text-white">USDC</span>
            <span className="text-pot-muted">
              cash <span className="text-xs">({((cashUsd / total) * 100).toFixed(1)}%)</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}
