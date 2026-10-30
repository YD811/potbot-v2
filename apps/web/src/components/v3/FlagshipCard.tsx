'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePot, usePotStats, useNavHistory, useAssetPublishTimes } from '@/hooks/usePotIndex'
import { POT_INDEX_SETTINGS, assetByMint } from '@/lib/pot-index/registry'
import { legColor } from '@/components/pot-index/CompositionBar'
import { Sparkline } from '@/components/pot-index/NavChart'

/** Counts from 0 to `value` once, 700 ms, site easing. */
function useCountUp(value: number | null, ms = 700) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (value == null) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(value); return }
    let raf = 0
    const t0 = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      setV(value * ease(k))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value == null])
  return value == null ? null : v
}

export function FlagshipCard() {
  const mint = POT_INDEX_SETTINGS.flagship
  const pot = usePot(mint)
  const stats = usePotStats(pot.data)
  const nav = useNavHistory(mint, '7d')
  const feedDown = useAssetPublishTimes().data?.source === 'coingecko'
  const price = useCountUp(stats.data?.indexPrice ?? null)
  const change7d = nav.data?.stats.change7d ?? null
  const points = nav.data?.points ?? []
  const p = pot.data
  const up = change7d == null || change7d >= 0

  return (
    <div className="v3-rise relative rounded-[28px] border border-pot-border bg-pot-card p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,.6)] sm:p-7" style={{ animationDelay: '320ms' }}>
      {/* Brand illustration: the Bloom plant from the deck and the mock, not the live garden level. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/garden/pink-4.webp" alt="" className="animate-breathe absolute -top-14 right-4 w-28 object-contain sm:-top-16 sm:w-32" draggable={false} />
      <div className="pr-24">
        <p className="font-display text-2xl font-semibold text-white sm:text-[28px]">{p?.name ?? 'Solana Blue Chips'}</p>
        <p className="mt-1 font-mono text-xs text-pot-muted">
          {p ? `$${p.symbol} · ${p.legs.length} assets · one token` : 'Reading from the chain'}
        </p>
      </div>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="font-display text-4xl font-semibold tabular-nums tracking-tight text-white">
          {price == null ? '$1.00' : `$${price.toFixed(3)}`}
        </span>
        {change7d != null && (
          <span className={`font-mono text-sm ${up ? 'text-pot-green' : 'text-pot-muted'}`}>{up ? '+' : ''}{change7d.toFixed(1)}% 7d</span>
        )}
      </div>
      <div className="mt-2 h-16">
        {points.length >= 2 ? (
          <Sparkline points={points} width={400} height={64} className="h-16 w-full" />
        ) : (
          <div className="h-16 rounded-xl border border-dashed border-pot-border" />
        )}
      </div>
      {p && (
        <>
          <div className="mt-4 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
            {p.legs.map((l, i) => (
              <div key={l.mint.toBase58()} style={{ width: `${l.weightBps / 100}%`, background: legColor(i), transformOrigin: 'left', animation: 'v3-fill .8s var(--ease-pot) both', animationDelay: `${500 + i * 60}ms` }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11px] text-pot-muted">
            {p.legs.map((l, i) => {
              const a = assetByMint(l.mint.toBase58())
              return (
                <li key={l.mint.toBase58()} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: legColor(i) }} />
                  {a?.symbol ?? l.mint.toBase58().slice(0, 4)} {l.weightBps / 100}%
                </li>
              )
            })}
          </ul>
        </>
      )}
      {feedDown ? (
        <>
          <div className="mt-6 flex gap-2.5">
            <Link href="/learn" className="btn-primary flex-1 text-center">How it works</Link>
            <Link href={mint ? `/portfolios/${mint}` : '/portfolios'} className="btn-secondary flex-1 text-center">Open</Link>
          </div>
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted">On devnet · deposits reopen soon</p>
        </>
      ) : (
        <>
          <div className="mt-6 flex gap-2.5">
            <Link href={mint ? `/portfolios/${mint}` : '/portfolios'} className="btn-primary flex-1 text-center">Deposit</Link>
            <Link href={mint ? `/portfolios/${mint}` : '/portfolios'} className="btn-secondary flex-1 text-center">Redeem</Link>
          </div>
          <p className="mt-3 text-center text-[13px] text-pot-muted">One signature. Redeem for the assets or USDC, any time.</p>
        </>
      )}
    </div>
  )
}
