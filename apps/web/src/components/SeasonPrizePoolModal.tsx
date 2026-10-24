'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Season 1: The Garden, the short "what it is" modal. Rules and the pool are published before the season opens.
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
          <h2 id="season-modal-title" className="font-display text-xl font-semibold text-white">Season 1: The Garden</h2>
          <button
            onClick={onClose}
            className="text-pot-muted hover:text-white transition text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-[15px] leading-relaxed text-pot-muted">
          <p>
            Every POTFolio is a plant. Deposits water it, exits dry it out, and its level is read from the chain, so it cannot be faked.
          </p>
          <p>
            Season 1 starts with mainnet. Holders and creators earn points for growing their garden: depositing, holding, inviting
            others and launching POTFolios that people hold. Points turn into rewards from a prize pool funded by protocol fees.
          </p>
          <p>
            The rules, the point formula and the pool size are published before the season opens. Until then: grow your garden on devnet.
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Opens with mainnet</p>
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
