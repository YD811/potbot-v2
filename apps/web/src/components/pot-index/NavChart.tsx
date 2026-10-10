'use client'

import { useMemo, useState } from 'react'
import { useNavHistory, type NavPoint } from '@/hooks/usePotIndex'

const RANGES = ['24h', '7d', '30d', 'all'] as const
type Range = (typeof RANGES)[number]

function pct(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`
}

/** Plain SVG line of index price over time. No library: the data is small and the shape is what matters. */
export function Sparkline({ points, width = 600, height = 160, stroke, fill = true, className }: { points: NavPoint[]; width?: number; height?: number; stroke?: string; fill?: boolean; className?: string }) {
  const d = useMemo(() => {
    if (points.length < 2) return null
    const xs = points.map((p) => p.t)
    const ys = points.map((p) => p.price)
    const x0 = xs[0]
    const x1 = xs[xs.length - 1]
    let y0 = Math.min(...ys)
    let y1 = Math.max(...ys)
    if (y1 - y0 < 1e-9) {
      y0 -= 0.001
      y1 += 0.001
    }
    const pad = 6
    const sx = (x: number) => pad + ((x - x0) / Math.max(1, x1 - x0)) * (width - 2 * pad)
    const sy = (y: number) => height - pad - ((y - y0) / (y1 - y0)) * (height - 2 * pad)
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.t).toFixed(1)} ${sy(p.price).toFixed(1)}`).join(' ')
    const area = `${line} L${sx(x1).toFixed(1)} ${height - pad} L${sx(x0).toFixed(1)} ${height - pad} Z`
    return { line, area }
  }, [points, width, height])
  if (!d) return null
  const up = points[points.length - 1].price >= points[0].price
  const color = stroke ?? (up ? 'var(--pot-green, #14F195)' : '#f87171')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      {fill && <path d={d.area} fill={color} opacity={0.12} />}
      <path d={d.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function NavChart({ mint, symbol }: { mint: string; symbol: string }) {
  const [range, setRange] = useState<Range>('7d')
  const q = useNavHistory(mint, range)
  const points = q.data?.points ?? []
  const stats = q.data?.stats
  const enough = points.length >= 2
  const changeForRange = range === '24h' ? stats?.change24h : range === '7d' ? stats?.change7d : stats?.changeRange
  const since = stats?.since ? new Date(stats.since * 1000) : null

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Index price</h2>
          <p className="mt-0.5 text-xs text-white/70">
            {stats?.last != null ? <>${stats.last.toFixed(4)} per {symbol}</> : 'Price per token over time'}
            {enough && changeForRange != null && (
              <>
                {' '}· <span className={changeForRange >= 0 ? 'text-pot-green' : 'text-red-300'}>{pct(changeForRange)}</span> {range === 'all' ? 'since tracking began' : `over ${range}`}
              </>
            )}
          </p>
        </div>
        <div className="flex rounded-lg border border-pot-border bg-pot-dark p-0.5 text-xs font-semibold">
          {RANGES.map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={`rounded-md px-2.5 py-1 transition ${range === r ? 'bg-pot-green text-pot-dark' : 'text-white/70 hover:text-white'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 h-40 w-full">
        {enough ? (
          <Sparkline points={points} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-pot-border text-center text-xs text-white/60">
            {q.isLoading ? 'Loading…' : q.isError ? 'History is not available right now.' : 'Tracking started. The line appears after a few snapshots (one every 15 minutes).'}
          </div>
        )}
      </div>
      {enough && (
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-[11px] text-white/60">
          <span>{stats?.change24h != null ? `24h ${pct(stats.change24h)}` : ''}{stats?.change7d != null ? ` · 7d ${pct(stats.change7d)}` : ''}</span>
          <span>{since ? `tracked since ${since.toLocaleDateString()} · ${stats?.points} points` : ''}</span>
        </div>
      )}
    </div>
  )
}
