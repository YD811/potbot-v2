'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Season 1 Prize Pool — "How it works" modal.
 *
 * Rendered via React Portal to document.body so position:fixed is always
 * viewport-relative — any transform/backdrop-filter on an ancestor (Navbar,
 * tab content, etc.) won't shift the modal off-center.
 */
export function SeasonPrizePoolModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Lock body scroll while modal is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Esc closes modal
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (!mounted) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="season-modal-title"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-pot-border bg-pot-card p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="season-modal-title" className="text-lg font-bold text-white">🏆 Season 1 Prize Pool</h2>
          <button
            onClick={onClose}
            className="text-pot-muted hover:text-white transition text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
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
            <div className="p-3 rounded-xl bg-pot-dark border border-pot-border font-mono text-xs text-pot-green break-all">
              Season Score = volume × members × pet_health
            </div>
            <p className="text-xs text-pot-muted mt-2 leading-relaxed">
              Rewards activity, growth, and community engagement — not raw trading P&amp;L.
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

        <button
          onClick={onClose}
          className="w-full mt-5 text-sm py-2.5 rounded-xl bg-pot-border hover:bg-pot-accent/20 text-white font-semibold transition"
        >
          Close
        </button>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
