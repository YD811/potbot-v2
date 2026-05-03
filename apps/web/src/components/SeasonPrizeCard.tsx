'use client'

import { useState } from 'react'
import Link from 'next/link'

// Season 1 end date — update this to actual date
const SEASON_END = new Date('2026-07-11T00:00:00Z').getTime()

// Mock prize pool until we have real on-chain treasury data
// Real value: sum 1% of all protocol swap fees since season start
const MOCK_PRIZE_POOL_USDC = 1_247.83

function useCountdown(targetMs: number) {
  const now = Date.now()
  const diff = Math.max(0, targetMs - now)
  const days    = Math.floor(diff / 86_400_000)
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return { days, hours, minutes, ended: diff === 0 }
}

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-pot-border bg-pot-card p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">🏆 Season 1 Prize Pool</h2>
          <button onClick={onClose} className="text-pot-muted hover:text-white transition text-xl">×</button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Distribution */}
          <div>
            <h3 className="text-xs font-semibold text-pot-muted uppercase tracking-wide mb-2">Distribution</h3>
            <div className="space-y-2">
              {[
                { rank: '🥇 1st Place', pct: '50%', desc: 'Pro-rata to all members by shares' },
                { rank: '🥈 2nd Place', pct: '30%', desc: 'Pro-rata to all members by shares' },
                { rank: '🥉 3rd Place', pct: '20%', desc: 'Pro-rata to all members by shares' },
              ].map((r) => (
                <div key={r.rank} className="flex items-start gap-3 p-3 rounded-xl bg-pot-dark">
                  <span className="font-semibold text-white w-28 shrink-0">{r.rank}</span>
                  <span className="text-pot-green font-bold w-10 shrink-0">{r.pct}</span>
                  <span className="text-pot-muted text-xs">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking formula */}
          <div>
            <h3 className="text-xs font-semibold text-pot-muted uppercase tracking-wide mb-2">Ranking Formula</h3>
            <div className="p-3 rounded-xl bg-pot-dark border border-pot-border font-mono text-xs text-pot-green">
              Season Score = volume × members × pet_health
            </div>
            <p className="text-xs text-pot-muted mt-2 leading-relaxed">
              Rewards activity, growth, and community engagement — not raw trading P&L.
              All inputs are verifiable on-chain or in the public database.
            </p>
          </div>

          {/* Source */}
          <div>
            <h3 className="text-xs font-semibold text-pot-muted uppercase tracking-wide mb-2">Prize Source</h3>
            <p className="text-xs text-pot-muted leading-relaxed">
              1% of all protocol swap fees (0.5% × 1% = 0.005% per trade) flow into the
              on-chain <code className="bg-pot-dark px-1 rounded text-pot-green">competition_treasury</code> PDA.
              Distribution is triggered by a permissioned admin instruction at season end,
              enforced by the smart contract rules above.
            </p>
          </div>
        </div>

        <button onClick={onClose} className="btn-secondary w-full mt-5 text-sm py-2.5">
          Close
        </button>
      </div>
    </div>
  )
}

export function SeasonPrizeCard() {
  const { days, hours, minutes, ended } = useCountdown(SEASON_END)
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div
        className="relative rounded-2xl p-[1px] mb-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #9945FF 50%, #14F195 100%)',
        }}
      >
        <div className="rounded-[calc(1rem-1px)] px-5 py-4 bg-pot-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: icon + title + pool */}
          <div className="flex items-center gap-4">
            <div className="text-3xl shrink-0">🏆</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">Season 1 Prize Pool</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  🌱 The Garden
                </span>
              </div>
              <div className="text-2xl font-black text-pot-green mt-0.5">
                ${MOCK_PRIZE_POOL_USDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </div>
              <div className="text-xs text-pot-muted">1% of all swap fees · distributed to top 3 pots</div>
            </div>
          </div>

          {/* Right: countdown + CTA */}
          <div className="flex items-center gap-4 shrink-0">
            {!ended && (
              <div className="text-right">
                <div className="text-xs text-pot-muted mb-1">Season ends in</div>
                <div className="flex items-center gap-1 font-mono text-sm text-white">
                  <span className="bg-pot-dark px-2 py-1 rounded-lg">{String(days).padStart(2,'0')}d</span>
                  <span className="text-pot-muted">:</span>
                  <span className="bg-pot-dark px-2 py-1 rounded-lg">{String(hours).padStart(2,'0')}h</span>
                  <span className="text-pot-muted">:</span>
                  <span className="bg-pot-dark px-2 py-1 rounded-lg">{String(minutes).padStart(2,'0')}m</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-pot-muted hover:text-white border border-pot-border rounded-xl px-3 py-1.5 transition hover:border-pot-accent/50 shrink-0"
            >
              How it works
            </button>
          </div>
        </div>
      </div>

      {showModal && <HowItWorksModal onClose={() => setShowModal(false)} />}
    </>
  )
}
