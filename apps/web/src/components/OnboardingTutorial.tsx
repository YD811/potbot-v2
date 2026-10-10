'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'potbot-onboarding-v3'

interface Step {
  id: number
  emoji: string
  title: string
  body: string
  cta?: string
  highlight?: string
}

const STEPS: Step[] = [
  {
    id: 0,
    emoji: '🪴',
    title: 'Welcome to PotBot',
    body: 'A POTfolio is a basket of up to 5 Solana assets held as one token. Deposit USDC, receive the token, hold it in any wallet, redeem it any time.',
    highlight: 'Nobody can withdraw the assets: not the creator, not PotBot. There is no such instruction.',
  },
  {
    id: 1,
    emoji: '🪴',
    title: 'Deposit, then redeem your way',
    body: 'Deposit USDC: the token is minted at NAV from Pyth prices in the same transaction and the basket is bought in the same wallet prompt. Redeem for every asset in kind, or for USDC in one transaction with an on-chain minimum.',
    highlight: 'Devnet build: click Get test USDC on any POTfolio, then Deposit.',
  },
  {
    id: 2,
    emoji: '🪴',
    title: 'Create your own, earn on every deposit',
    body: 'Pick the assets and weights, publish in one transaction, share your link. Every deposit through it pays the creator and the referrer a share of the 0.30% entry fee. No custody, no liability.',
    highlight: 'Built for Colosseum Crypto World\'s Fair. Judges: see /worldsfair.',
  },
]

function StepDot({ active, done, onClick }: { active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
        active ? 'bg-pot-green scale-125' : done ? 'bg-pot-green/40' : 'bg-pot-border'
      }`}
      aria-label="Go to step"
    />
  )
}

interface OnboardingTutorialProps {
  /** Force-show regardless of localStorage (for preview/demo) */
  forceShow?: boolean
}

export function OnboardingTutorial({ forceShow = false }: OnboardingTutorialProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)

  const pathname = usePathname()
  useEffect(() => {
    if (forceShow) { setVisible(true); return }
    if (!pathname || !pathname.startsWith('/portfolios')) return
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setVisible(true)
    } catch {
      /* storage blocked: never show */
    }
  }, [forceShow, pathname])

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function dismiss() {
    if (!forceShow) localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function goTo(idx: number) {
    if (animating || idx === step) return
    setAnimating(true)
    setTimeout(() => {
      setStep(idx)
      setAnimating(false)
    }, 150)
  }

  function next() {
    if (isLast) { dismiss(); return }
    goTo(step + 1)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}
      onClick={dismiss}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl border border-pot-border bg-pot-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 60px rgba(0,255,136,0.08)' }}
      >
        {/* Gradient accent top */}
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #00ff88, #8b5cf6, #00ff88)' }}
        />

        {/* Skip */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-pot-muted hover:text-white text-sm transition"
        >
          Skip all
        </button>

        {/* Content */}
        <div
          className={`px-7 py-8 transition-opacity duration-150 ${animating ? 'opacity-0' : 'opacity-100'}`}
        >
          {/* Step counter */}
          <div className="text-[10px] text-pot-muted mb-4 tracking-widest uppercase">
            Step {step + 1} of {STEPS.length}
          </div>

          {/* Emoji icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-6 mx-auto"
            style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}
          >
            {current.emoji}
          </div>

          {/* Title */}
          <h2 className="text-xl font-black text-white text-center mb-3 leading-tight">
            {current.title}
          </h2>

          {/* Body */}
          <p className="text-sm text-pot-muted text-center leading-relaxed mb-5">
            {current.body}
          </p>

          {/* Highlight pill */}
          {current.highlight && (
            <div className="rounded-xl bg-pot-green/8 border border-pot-green/20 px-4 py-3 text-xs text-pot-green text-center font-medium mb-6">
              {current.highlight}
            </div>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((s) => (
              <StepDot
                key={s.id}
                active={s.id === step}
                done={s.id < step}
                onClick={() => goTo(s.id)}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={next}
            className="btn-primary w-full text-sm py-3 font-semibold"
          >
            {isLast ? '🚀 Start using PotBot' : 'Next →'}
          </button>

          {step > 0 && (
            <button
              onClick={() => goTo(step - 1)}
              className="w-full text-center text-xs text-pot-muted hover:text-white transition mt-3"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Reset onboarding so it shows again — useful for testing or user-triggered replay */
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY)
}
