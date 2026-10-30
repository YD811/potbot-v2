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
export function Sparkline({ points, width = 600, height = 160, stroke, fill = true, className, entry }: { points: NavPoint[]; width?: number; height?: number; stroke?: string; fill?: boolean; className?: string; entry?: number | null }) {
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
    const entryY = entry != null && entry >= y0 && entry <= y1 ? sy(entry) : null
    return { line, area, entryY }
  }, [points, width, height, entry])
  if (!d) return null
  const up = points[points.length - 1].price >= points[0].price
  const color = stroke ?? (up ? 'var(--c-brand-green, #9CCB6E)' : 'var(--c-muted, #C9C0B0)')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      {fill && [0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="var(--c-border, #2E2A23)" vectorEffect="non-scaling-stroke" />
      ))}
      {fill && <path d={d.area} fill={color} opacity={0.12} />}
      <path d={d.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {d.entryY != null && <line x1={0} x2={width} y1={d.entryY} y2={d.entryY} stroke="var(--c-text, #F2ECE0)" strokeOpacity={0.55} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
    </svg>
  )
}

/** Price chart with a terracotta area, hover crosshair and a readout of the point under the cursor. */
function InteractiveChart({ points, entry }: { points: NavPoint[]; entry: number | null }) {
  const W = 800, H = 240, pad = 8
  const [hover, setHover] = useState<number | null>(null)
  const g = useMemo(() => {
    const xs = points.map((p) => p.t), ys = points.map((p) => p.price)
    const x0 = xs[0], x1 = xs[xs.length - 1]
    let y0 = Math.min(...ys), y1 = Math.max(...ys)
    const span = Math.max(y1 - y0, 1e-6); y0 -= span * 0.12; y1 += span * 0.12
    const sx = (x: number) => pad + ((x - x0) / Math.max(1, x1 - x0)) * (W - 2 * pad)
    const sy = (y: number) => H - pad - ((y - y0) / (y1 - y0)) * (H - 2 * pad)
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.t).toFixed(1)} ${sy(p.price).toFixed(1)}`).join(' ')
    const area = `${line} L${sx(x1).toFixed(1)} ${H} L${sx(x0).toFixed(1)} ${H} Z`
    const entryY = entry != null && entry >= y0 && entry <= y1 ? sy(entry) : null
    return { sx, sy, line, area, entryY }
  }, [points, entry])
  const up = points[points.length - 1].price >= points[0].price
  const color = up ? '#9CCB6E' : '#E07A4F'
  const hp = hover != null ? points[hover] : null
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    let best = 0, bd = Infinity
    for (let i = 0; i < points.length; i++) { const d = Math.abs(g.sx(points[i].t) - x); if (d < bd) { bd = d; best = i } }
    setHover(best)
  }
  return (
    <div className="relative h-full w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="nav-reveal h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="navfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="var(--c-border, #2E2A23)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />)}
        <path d={g.area} fill="url(#navfill)" />
        <path d={g.line} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {g.entryY != null && <line x1={0} x2={W} y1={g.entryY} y2={g.entryY} stroke="var(--c-text, #F2ECE0)" strokeOpacity={0.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        {hp && <line x1={g.sx(hp.t)} x2={g.sx(hp.t)} y1={0} y2={H} stroke="var(--c-muted, #C9C0B0)" strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />}
      </svg>
      {hp && (
        <>
          <span className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--pot-bg)]" style={{ left: `${(g.sx(hp.t) / W) * 100}%`, top: `${(g.sy(hp.price) / H) * 100}%`, borderColor: color }} />
          <div className="pointer-events-none absolute top-2 rounded-xl border border-pot-border bg-pot-card px-3 py-2 font-mono text-xs tabular-nums shadow-lg" style={{ left: `clamp(0px, calc(${(g.sx(hp.t) / W) * 100}% - 70px), calc(100% - 150px))` }}>
            <div className="text-white">${hp.price.toFixed(4)}</div>
            <div className="text-pot-muted">{new Date(hp.t * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </>
      )}
    </div>
  )
}

export function NavChart({ mint, symbol, entry }: { mint: string; symbol: string; entry?: number | null }) {
  const [range, setRange] = useState<Range>('7d')
  const q = useNavHistory(mint, range)
  const points = q.data?.points ?? []
  const stats = q.data?.stats
  const enough = points.length >= 2
  const changeForRange = range === '24h' ? stats?.change24h : range === '7d' ? stats?.change7d : stats?.changeRange
  const since = stats?.since ? new Date(stats.since * 1000) : null

  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">Price</h2>
          <p className="mt-1 font-mono text-xs tabular-nums text-pot-muted">
            {stats?.last != null ? <>${stats.last.toFixed(4)} per {symbol}</> : 'Price per token over time'}
            {enough && changeForRange != null && (
              <>
                {' '}· <span className={changeForRange >= 0 ? 'text-pot-green' : 'text-pot-muted'}>{pct(changeForRange)}</span> {range === 'all' ? 'since tracking began' : `over ${range}`}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-1.5 font-mono text-xs">
          {RANGES.map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={`rounded-full border px-3 py-1 transition ${range === r ? 'border-pot-accent bg-pot-accent text-pot-dark' : 'border-pot-border text-pot-muted hover:text-white'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 h-56 w-full sm:h-64">
        {enough ? (
          <InteractiveChart key={range} points={points} entry={entry ?? null} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-pot-border px-4 text-center text-sm text-pot-muted">
            {q.isLoading ? 'Loading' : q.isError ? 'History is not available right now. Try again in a minute.' : 'Tracking started. The line appears after a few snapshots, one every 15 minutes.'}
          </div>
        )}
      </div>
      {enough && (
        <div className="mt-3 flex flex-wrap justify-between gap-x-4 font-mono text-xs tabular-nums text-pot-muted">
          <span>{stats?.change24h != null ? `24h ${pct(stats.change24h)}` : ''}{stats?.change7d != null ? ` · 7d ${pct(stats.change7d)}` : ''}{entry != null ? ` · dashed line: your average entry $${entry.toFixed(4)}` : ''}</span>
          <span>{since ? `tracked since ${since.toLocaleDateString()} · ${stats?.points} points` : ''}</span>
        </div>
      )}
    </div>
  )
}
