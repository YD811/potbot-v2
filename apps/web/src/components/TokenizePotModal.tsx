'use client'

import { useState } from 'react'

interface Props {
  potName: string
  potPubkey: string
  memberCount: number
  onClose: () => void
}

const STEPS = [
  {
    id: 0,
    title: 'What is tokenization?',
    icon: '🪙',
    body: (potName: string) => (
      <div className="space-y-3 text-sm text-pot-muted leading-relaxed">
        <p>
          Tokenizing your pot creates a <span className="text-white font-medium">social token on bags.fm</span> that
          represents membership in <span className="text-pot-green font-medium">{potName}</span>.
        </p>
        <p>
          Members receive tokens proportional to their share of the pot. The token is a
          <span className="text-white font-medium"> community & identity layer</span> — not a financial instrument.
          It does <strong>not</strong> represent ownership of any underlying assets.
        </p>
        <div className="rounded-xl bg-pot-dark p-3 text-xs space-y-1">
          <div className="flex items-center gap-2"><span className="text-pot-green">✓</span> Community recognition & governance signal</div>
          <div className="flex items-center gap-2"><span className="text-pot-green">✓</span> Shareable public identity for your pot</div>
          <div className="flex items-center gap-2"><span className="text-pot-green">✓</span> Tradeable on bags.fm (Solana DEX)</div>
          <div className="flex items-center gap-2"><span className="text-red-400">✗</span> Not backed by pot assets</div>
          <div className="flex items-center gap-2"><span className="text-red-400">✗</span> Not a promise of returns</div>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    title: 'How it works',
    icon: '⚙️',
    body: (_potName: string) => (
      <div className="space-y-3 text-sm text-pot-muted leading-relaxed">
        <div className="space-y-2">
          {[
            { n: '1', icon: '🔗', t: 'Connect to bags.fm', d: 'You\'ll be redirected to bags.fm with your pot\'s name and pubkey pre-filled. Connect your wallet there to create the token.' },
            { n: '2', icon: '⚙️', t: 'Set token parameters', d: 'Name, ticker, supply, and initial price are set on bags.fm. We recommend naming it after your pot (e.g. "Alpha Pot Token" → $APT).' },
            { n: '3', icon: '🪙', t: 'Token minted on-chain', d: 'bags.fm creates the token on Solana. You get the mint address to share with pot members.' },
            { n: '4', icon: '🌱', t: 'Boost your Season Score', d: 'Having a live token gives your pot\'s plant a +5 health bonus — rewarding community building.' },
          ].map((s) => (
            <div key={s.n} className="flex gap-3 p-3 rounded-xl bg-pot-dark">
              <div className="w-6 h-6 rounded-full bg-pot-accent/20 border border-pot-accent/30 flex items-center justify-center text-[10px] font-bold text-pot-accent shrink-0 mt-0.5">
                {s.n}
              </div>
              <div>
                <div className="text-xs font-semibold text-white mb-0.5">{s.icon} {s.t}</div>
                <p className="text-xs text-pot-muted leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Disclaimer & Launch',
    icon: '🚀',
    body: (_potName: string) => (
      <div className="space-y-3 text-sm text-pot-muted leading-relaxed">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-300 space-y-2">
          <div className="font-semibold text-amber-200 text-sm">⚠️ Important disclosures</div>
          <p>Pot tokens are social/community tokens. They carry <strong>no guaranteed value</strong> and are not backed by pot assets or trading performance.</p>
          <p>Creating a token on bags.fm is subject to bags.fm's own terms of service. PotBot is not affiliated with bags.fm and does not control token pricing or liquidity.</p>
          <p>This is <strong>not financial advice</strong>. Do not create a token with the intent to deceive members about its financial nature.</p>
        </div>
        <p className="text-xs">
          By clicking "Launch on bags.fm" you confirm you have read and understood the above, and that you are creating
          this token purely for community and identity purposes.
        </p>
      </div>
    ),
  },
]

export function TokenizePotModal({ potName, potPubkey, memberCount, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [agreed, setAgreed] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  // bags.fm launch URL — pre-populate name + pot pubkey as ref
  const bagsUrl = `https://bags.fm/create?name=${encodeURIComponent(potName)}&ref=potbot&meta=${potPubkey}`

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-pot-border bg-pot-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{current.icon}</span>
              <div>
                <div className="text-[10px] text-pot-muted uppercase tracking-wide">
                  Step {step + 1} of {STEPS.length} · Tokenize {potName}
                </div>
                <h2 className="text-base font-bold text-white">{current.title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="text-pot-muted hover:text-white text-xl shrink-0">×</button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 rounded-full flex-1 transition-all ${
                  s.id <= step ? 'bg-pot-green' : 'bg-pot-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 max-h-[340px] overflow-y-auto">
          {current.body(potName)}
        </div>

        {/* Disclaimer checkbox on last step */}
        {isLast && (
          <div className="px-6 pb-2">
            <label className="flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-pot-green"
              />
              <span className="text-xs text-pot-muted group-hover:text-white transition leading-relaxed">
                I understand this token has no guaranteed financial value and is a community feature only.
              </span>
            </label>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 flex gap-3">
          {!isFirst && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="btn-secondary flex-1 text-sm py-2.5"
            >
              ← Back
            </button>
          )}

          {isFirst && (
            <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">
              Cancel
            </button>
          )}

          {!isLast ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="btn-primary flex-1 text-sm py-2.5"
            >
              Next →
            </button>
          ) : (
            <a
              href={agreed ? bagsUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={!agreed ? (e) => e.preventDefault() : undefined}
              className={`btn-primary flex-1 text-sm py-2.5 text-center transition ${
                !agreed ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
              }`}
            >
              🚀 Launch on bags.fm
            </a>
          )}
        </div>

        {/* Member count hint */}
        <div className="px-6 pb-4 text-center text-xs text-pot-muted">
          {memberCount} member{memberCount !== 1 ? 's' : ''} would receive initial token allocation
        </div>
      </div>
    </div>
  )
}

/**
 * Drop-in button that opens the TokenizePotModal.
 * Usage: <TokenizePotButton potName={pot.name} potPubkey={pot.pubkey} memberCount={members.length} />
 */
export function TokenizePotButton({
  potName,
  potPubkey,
  memberCount,
  className = '',
}: {
  potName: string
  potPubkey: string
  memberCount: number
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 text-sm font-medium text-pot-accent hover:text-white border border-pot-accent/30 hover:border-pot-accent/60 rounded-xl px-4 py-2 transition ${className}`}
      >
        🪙 Create Pot Token
      </button>
      {open && (
        <TokenizePotModal
          potName={potName}
          potPubkey={potPubkey}
          memberCount={memberCount}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
