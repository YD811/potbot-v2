'use client'

import { useMemo } from 'react'

const CATEGORIES = [
  { id: 'stable',  label: 'Stable',         color: '#185FA5', bg: '#E6F1FB' },
  { id: 'sol',     label: 'SOL ecosystem',  color: '#9945FF', bg: '#EEEDFE' },
  { id: 'lp',      label: 'DeFi / LP',      color: '#0F6E56', bg: '#E1F5EE' },
  { id: 'staking', label: 'Liquid staking', color: '#534AB7', bg: '#EEEDFE' },
  { id: 'meme',    label: 'High risk',      color: '#D85A30', bg: '#FAECE7' },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

const TOKEN_CATEGORY: Record<string, CategoryId> = {
  USDC: 'stable', USDT: 'stable', USDH: 'stable',
  SOL: 'sol', WSOL: 'sol',
  MSOL: 'staking', JITOSOL: 'staking', BSOL: 'staking', JSOL: 'staking',
  BONK: 'meme', WIF: 'meme', POPCAT: 'meme', MYRO: 'meme',
}

const DEMO_ASSETS: Asset[] = [
  { symbol: 'SOL',     name: 'SOL',             amountSol: 2.41, amountUsd: 361, apy: null },
  { symbol: 'USDC',    name: 'USDC',            amountSol: 1.45, amountUsd: 217, apy: null },
  { symbol: 'JITOSOL', name: 'JitoSOL',         amountSol: 0.24, amountUsd:  36, apy: 8.1 },
  { symbol: 'LP',      name: 'SOL-USDC (Orca)', amountSol: 0.48, amountUsd:  72, apy: 14.2, category: 'lp' },
  { symbol: 'BONK',    name: 'BONK',            amountSol: 0.24, amountUsd:  36, apy: null },
]

export interface Asset {
  symbol:    string
  name:      string
  amountSol: number
  amountUsd: number
  apy:       number | null
  category?: CategoryId
}

interface Props {
  /** Real holdings; falls back to DEMO_ASSETS when unset. */
  assets?:   Asset[]
  totalSol?: number
  totalUsd?: number
}

/**
 * Multi-asset portfolio panel shown in the Trade tab.
 *
 * Groups holdings into five categories (Stable / SOL ecosystem / LP /
 * Liquid staking / High risk) and renders an allocation bar at the
 * bottom. Demo data ships with the component so the layout still
 * communicates value before real on-chain holdings are wired.
 */
export default function VaultPortfolioDisplay({ assets, totalSol, totalUsd }: Props) {
  const data = assets?.length ? assets : DEMO_ASSETS
  const total = totalUsd ?? data.reduce((s, a) => s + a.amountUsd, 0)

  const grouped = useMemo(() => {
    const map = new Map<CategoryId, Asset[]>()
    for (const asset of data) {
      const cat: CategoryId =
        asset.category ?? TOKEN_CATEGORY[asset.symbol.toUpperCase()] ?? 'sol'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(asset)
    }
    return map
  }, [data])

  const catPcts = useMemo(() => {
    const out: { id: CategoryId; pct: number; color: string }[] = []
    for (const cat of CATEGORIES) {
      const items = grouped.get(cat.id) ?? []
      const usd = items.reduce((s, a) => s + a.amountUsd, 0)
      const pct = total > 0 ? (usd / total) * 100 : 0
      if (pct > 0) out.push({ id: cat.id, pct, color: cat.color })
    }
    return out
  }, [grouped, total])

  if (!data.length) return null

  return (
    <section className="bg-pot-card border border-pot-border rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white">📊 Holdings</h2>
          <span className="text-xs text-pot-muted">{data.length} assets</span>
          {!assets?.length && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pot-accent/10 text-pot-accent border border-pot-accent/20">
              demo
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-pot-green tabular-nums">
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          {totalSol != null && (
            <div className="text-[10px] text-pot-muted tabular-nums">{totalSol.toFixed(2)} SOL</div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {CATEGORIES.map((cat) => {
          const items = grouped.get(cat.id) ?? []
          if (!items.length) return null
          const catUsd = items.reduce((s, a) => s + a.amountUsd, 0)
          const catPct = total > 0 ? Math.round((catUsd / total) * 100) : 0

          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="text-[11px] font-semibold text-white">{cat.label}</span>
                <span className="text-[11px] text-pot-muted ml-auto">{catPct}%</span>
              </div>

              <div className="space-y-1.5">
                {items.slice(0, 10).map((asset) => {
                  const pct = total > 0 ? Math.round((asset.amountUsd / total) * 100) : 0
                  return (
                    <div
                      key={asset.symbol}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pot-dark/60 border border-pot-border"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: cat.bg, color: cat.color }}
                      >
                        {asset.symbol.slice(0, 3)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white leading-tight">{asset.name}</div>
                        <div className="text-[10px] text-pot-muted">
                          ${asset.amountUsd.toLocaleString()}
                          {asset.apy != null && (
                            <span className="text-pot-green ml-1.5">· {asset.apy}% APY</span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-white shrink-0 tabular-nums">{pct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
          {catPcts.map((seg) => (
            <div
              key={seg.id}
              style={{ width: `${seg.pct}%`, background: seg.color }}
              className="first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {catPcts.map((seg) => {
            const cat = CATEGORIES.find((c) => c.id === seg.id)!
            return (
              <span key={seg.id} className="flex items-center gap-1 text-[10px] text-pot-muted">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: seg.color }} />
                {cat.label} {Math.round(seg.pct)}%
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
