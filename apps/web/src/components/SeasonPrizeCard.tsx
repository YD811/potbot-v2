'use client'

import { useState } from 'react'
import { SeasonPrizePoolModal } from '@/components/SeasonPrizePoolModal'

// Mock prize pool until we have real on-chain treasury data
// Real value: sum 1% of all protocol swap fees since season start
const MOCK_PRIZE_POOL_USDC = 1_247.83

export function SeasonPrizeCard() {
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

          {/* Right: status + CTA */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-xs text-pot-muted mb-1">Season 1</div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pot-dark border border-pot-accent/30">
                <span className="w-1.5 h-1.5 rounded-full bg-pot-accent animate-pulse" />
                <span className="text-xs font-semibold text-white">Starts after mainnet</span>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-pot-muted hover:text-white border border-pot-border rounded-xl px-3 py-1.5 transition hover:border-pot-accent/50 shrink-0"
            >
              How it works
            </button>
          </div>
        </div>
      </div>

      {showModal && <SeasonPrizePoolModal onClose={() => setShowModal(false)} />}
    </>
  )
}
