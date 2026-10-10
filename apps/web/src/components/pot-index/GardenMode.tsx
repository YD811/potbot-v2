'use client'

import { useEffect, useState } from 'react'
import { STAGES, plantSrc, type PlantSeries, type PlantStage } from '@/lib/pot-index/garden'

/**
 * Landing section: one plant grows through all six stages on a loop, deposits "water" it,
 * the value counter and the six-pot ladder below stay in sync.
 */

// Value shown at each stage of the demo loop (a bit above each threshold so the level reads as earned).
const DEMO_VALUE: Record<PlantStage, number> = { 1: 420, 2: 2_300, 3: 14_800, 4: 71_000, 5: 318_000, 6: 1_240_000 }
const DEMO_DEPOSIT: Record<PlantStage, string> = {
  1: '',
  2: '+1,900 USDC',
  3: '+12,500 USDC',
  4: '+56,000 USDC',
  5: '+247,000 USDC',
  6: '+922,000 USDC',
}
const STEP_MS = 1900
const HOLD_MS = 3200

function fmtUsd(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v}`
}

export function GardenMode({ series = 'pink' }: { series?: PlantSeries }) {
  const [stage, setStage] = useState<PlantStage>(1)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const next = () => {
      setStage((s) => {
        const n = (s >= 6 ? 1 : s + 1) as PlantStage
        return n
      })
      setPulse(true)
      setTimeout(() => setPulse(false), 500)
    }
    const tick = () => {
      t = setTimeout(() => {
        next()
        tick()
      }, stage === 6 ? HOLD_MS : STEP_MS)
    }
    tick()
    return () => clearTimeout(t)
  }, [stage])

  const st = STAGES[stage - 1]

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(20,241,149,0.07), transparent 60%)' }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-3">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-pot-green">Garden mode</span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-green/60" />
          </div>
          <h2 className="mb-4 text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-5xl">
            Watch your POTfolio{' '}
            <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">grow.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Every POTfolio is a plant. Deposits water it: the more tokens are minted, the higher the level. Exits dry it out.
            The level is read from on-chain supply and price, so it cannot be faked.
          </p>
        </div>

        {/* Big scene: deposits on the left, plant in the middle, value on the right */}
        <div className="mx-auto grid max-w-4xl items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
          <div className="order-2 text-center sm:order-1 sm:text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-white/70">Deposit</div>
            <div
              key={`d-${stage}`}
              className="mt-1 text-2xl font-black text-pot-green"
              style={{ animation: 'garden-drop 1.2s ease-out both' }}
            >
              {DEMO_DEPOSIT[stage] || 'first seed'}
            </div>
            <div className="mt-1 text-sm text-white/70">USDC in, tokens minted</div>
          </div>

          <div className="order-1 flex items-end justify-center sm:order-2">
            <div className="relative h-[260px] w-[220px] sm:h-[320px] sm:w-[280px]">
              <div
                aria-hidden
                className="absolute inset-x-6 bottom-2 h-10 rounded-full blur-2xl transition-opacity duration-500"
                style={{ background: 'rgba(20,241,149,0.35)', opacity: pulse ? 1 : 0.35 }}
              />
              {STAGES.map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s.level}
                  src={plantSrc(series, s.level)}
                  alt={s.name}
                  draggable={false}
                  className="absolute bottom-0 left-1/2 max-h-full max-w-full -translate-x-1/2 select-none object-contain transition-all duration-700 ease-out"
                  style={{
                    opacity: s.level === stage ? 1 : 0,
                    transform: `translateX(-50%) scale(${s.level === stage ? (pulse ? 1.04 : 1) : 0.92})`,
                    height: `${40 + s.level * 10}%`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="order-3 text-center sm:text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-white/70">Pot value</div>
            <div className="mt-1 text-2xl font-black text-white tabular-nums">{fmtUsd(DEMO_VALUE[stage])}</div>
            <div className="mt-1 text-sm">
              <span className="font-semibold text-pot-green">Level {st.level}</span>
              <span className="text-white/70"> · {st.name}</span>
            </div>
          </div>
        </div>

        {/* Ladder: all six stages with their thresholds */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
            {STAGES.map((s) => {
              const active = s.level === stage
              const reached = s.level <= stage
              return (
                <button
                  type="button"
                  key={s.level}
                  onClick={() => setStage(s.level)}
                  className="group flex flex-col items-center gap-2 rounded-2xl p-2 transition"
                  style={{ opacity: reached ? 1 : 0.5 }}
                >
                  <div
                    className="flex h-20 w-20 items-end justify-center rounded-2xl transition-all duration-500 sm:h-24 sm:w-24"
                    style={{
                      background: `rgba(20,241,149,${active ? 0.12 : 0.04})`,
                      border: `1px solid rgba(20,241,149,${active ? 0.7 : 0.18})`,
                      boxShadow: active ? '0 0 28px rgba(20,241,149,0.35)' : 'none',
                      transform: active ? 'translateY(-4px)' : 'none',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={plantSrc(series, s.level)} alt="" draggable={false} className="max-h-[88%] max-w-[88%] object-contain" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    <span className="text-pot-green">L{s.level}</span> {s.name}
                  </div>
                  <div className="text-xs text-white/70">{s.level === 1 ? 'first deposit' : `from ${s.label}`}</div>
                </button>
              )
            })}
          </div>
          {/* progress rail */}
          <div className="mt-6 hidden h-1 w-full rounded-full bg-pot-border sm:block">
            <div
              className="h-1 rounded-full bg-pot-green transition-all duration-700"
              style={{ width: `${((stage - 1) / 5) * 100}%`, boxShadow: '0 0 12px rgba(20,241,149,0.6)' }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
