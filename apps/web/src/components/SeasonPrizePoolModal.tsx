'use client'

/**
 * Season 1 Prize Pool — "How it works" modal.
 * Reused from /leaderboard SeasonPrizeCard and the Navbar Season 1 ticker.
 */
export function SeasonPrizePoolModal({ onClose }: { onClose: () => void }) {
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
          <button onClick={onClose} className="text-pot-muted hover:text-white transition text-xl" aria-label="Close">×</button>
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

        <button onClick={onClose} className="btn-secondary w-full mt-5 text-sm py-2.5">
          Close
        </button>
      </div>
    </div>
  )
}
