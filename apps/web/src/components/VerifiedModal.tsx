'use client'

import { useEffect } from 'react'

interface VerifiedModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Explains what "PotBot Verified" means. Opened by clicking a TrustBadge on
 * /vaults cards or the pot-detail header.
 */
export function VerifiedModal({ isOpen, onClose }: VerifiedModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-pot-green/30 bg-pot-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-pot-muted hover:text-white transition"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-white mb-1">✅ PotBot Verified Vault</h2>
        <p className="text-sm text-pot-muted mb-5">
          What our verification covers — and who does the work.
        </p>

        {/* Audit schedule */}
        <Section title="Audit schedule">
          <ul className="space-y-1.5 text-sm text-pot-muted">
            <Bullet><strong className="text-white">Smart-contract review</strong> — monthly, by an independent firm</Bullet>
            <Bullet><strong className="text-white">Performance / NAV</strong> — weekly, by the PotBot risk team</Bullet>
            <Bullet><strong className="text-white">Governance integrity</strong> — bi-weekly</Bullet>
          </ul>
        </Section>

        {/* What's audited */}
        <Section title="What's audited">
          <ul className="space-y-1.5 text-sm text-pot-muted">
            <Bullet>Program exploits & rug vectors</Bullet>
            <Bullet>Governance manipulation</Bullet>
            <Bullet>NAV accuracy</Bullet>
            <Bullet>Jupiter slippage & execution</Bullet>
            <Bullet>Member fund segregation</Bullet>
          </ul>
        </Section>

        {/* Two-team structure */}
        <Section title="Two-team structure">
          <ul className="space-y-1.5 text-sm text-pot-muted">
            <Bullet><strong className="text-white">External firm</strong> — rotated every 6 months</Bullet>
            <Bullet><strong className="text-white">Internal Risk Committee</strong> — 3 members, with a rotating lead</Bullet>
          </ul>
        </Section>

        {/* On-chain attestation */}
        <div className="rounded-xl border border-pot-green/30 bg-pot-green/5 p-4 mb-5">
          <p className="text-sm text-white">
            Audit results are published on-chain as a signed attestation —{' '}
            <a
              href="https://explorer.solana.com"
              target="_blank"
              rel="noreferrer"
              className="text-pot-green underline hover:opacity-80"
            >
              view on Solana Explorer ↗
            </a>
          </p>
        </div>

        {/* CTA */}
        <a
          href="https://potbot.fun/verified"
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center rounded-xl bg-pot-green py-3 text-sm font-bold text-pot-dark transition hover:brightness-110"
        >
          Want Verified status? Apply at potbot.fun/verified →
        </a>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pot-green shrink-0" />
      <span>{children}</span>
    </li>
  )
}
