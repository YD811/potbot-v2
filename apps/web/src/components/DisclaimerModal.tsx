'use client'

import { useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'potbot-disclaimer-v1'

const DISCLAIMERS: { icon: string; text: string }[] = [
  {
    icon: '🔒',
    text: 'PotBot is non-custodial software. You retain full custody of your funds via the smart contract.',
  },
  {
    icon: '⚠️',
    text: 'Crypto assets are volatile. You may lose some or all of the funds you deposit. Past performance does not predict future results.',
  },
  {
    icon: '🗳️',
    text: 'PotBot is not investment advice. Members make their own decisions through on-chain voting.',
  },
  {
    icon: '🌍',
    text: 'PotBot is not available in restricted jurisdictions. By using this app you confirm you are not a resident of such jurisdictions.',
  },
]

interface Props {
  /** Render this to trigger the modal (e.g. a Deposit button). */
  trigger: (open: () => void) => ReactNode
  /** Called when user accepts and wants to proceed. */
  onAccept: () => void
}

/**
 * Wraps any action (e.g. first deposit) behind a one-time disclaimer modal.
 * Shows once per browser; subsequent clicks go straight to onAccept.
 */
export function DisclaimerModal({ trigger, onAccept }: Props) {
  const [open, setOpen] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      setAccepted(true) // privacy mode — skip modal
    }
  }, [])

  function handleOpen() {
    if (accepted) {
      onAccept()
    } else {
      setOpen(true)
    }
  }

  function handleAccept() {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch {}
    setAccepted(true)
    setOpen(false)
    onAccept()
  }

  return (
    <>
      {trigger(handleOpen)}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-pot-border bg-pot-card p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                ℹ️
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Before you deposit</h2>
                <p className="text-xs text-pot-muted">Please read and accept to continue</p>
              </div>
            </div>

            {/* Disclaimers */}
            <div className="space-y-3 mb-5">
              {DISCLAIMERS.map((d) => (
                <div
                  key={d.icon}
                  className="flex items-start gap-3 p-3 rounded-xl bg-pot-dark border border-pot-border/50"
                >
                  <span className="shrink-0 text-base mt-0.5">{d.icon}</span>
                  <p className="text-xs text-gray-300 leading-relaxed">{d.text}</p>
                </div>
              ))}
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mb-5 group">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#00ff88] cursor-pointer"
              />
              <span className="text-xs text-pot-muted group-hover:text-white transition leading-relaxed">
                I have read and understand the above disclosures. I accept full responsibility for my deposits and trading decisions.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 btn-secondary text-sm py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!checked}
                className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Standalone disclaimer banner for footers / modals that just shows the text. */
export function DisclaimerBanner() {
  return (
    <div className="border-t border-pot-border/30 bg-pot-dark/50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-[11px] text-pot-muted space-y-1.5 leading-relaxed">
          <p>
            <strong className="text-pot-muted/80">Non-custodial:</strong> PotBot is non-custodial software. You retain full custody of your funds via the smart contract.
          </p>
          <p>
            <strong className="text-pot-muted/80">Risk:</strong> Crypto assets are volatile. You may lose some or all of the funds you deposit. Past performance does not predict future results.
          </p>
          <p>
            <strong className="text-pot-muted/80">Not advice:</strong> PotBot is not investment advice. Members make their own decisions through on-chain voting.
          </p>
          <p>
            <strong className="text-pot-muted/80">Jurisdictions:</strong> Use of PotBot may be restricted in certain jurisdictions. By using this app you confirm compliance with your local laws.
          </p>
        </div>
      </div>
    </div>
  )
}
