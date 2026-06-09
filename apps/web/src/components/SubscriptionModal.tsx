'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export type SubscriptionTier = 'free' | 'early' | 'pro' | 'pro_plus'

interface CompactTier {
  id: Exclude<SubscriptionTier, 'free'>
  emoji: string
  name: string
  price: string
  tagline: string
  highlight?: boolean
}

const COMPACT_TIERS: CompactTier[] = [
  { id: 'early',    emoji: '🌱', name: 'Early Supporter', price: '$9/mo',  tagline: 'Pay now, get Pro free after launch' },
  { id: 'pro',      emoji: '⚡', name: 'Pro',             price: '$29/mo', tagline: '0% fees · free SNS · AI alerts', highlight: true },
  { id: 'pro_plus', emoji: '💎', name: 'Pro+',            price: '$99/mo', tagline: 'Curated strategies · Alpha Vault' },
]

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Compact pricing surface, opened from the "Upgrade your Pot Plan" CTA. */
export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleCheckout(tier: CompactTier) {
    // Stripe placeholder — wire NEXT_PUBLIC_STRIPE_KEY to a real Checkout
    // session server-side. For now this is a no-op stub.
    if (!STRIPE_KEY) {
      // eslint-disable-next-line no-console
      console.info(`[stripe] would start checkout for ${tier.id} (set NEXT_PUBLIC_STRIPE_KEY)`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-pot-green/30 bg-pot-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-pot-muted hover:text-white transition"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-white mb-1">Upgrade your Pot Plan</h2>
        <p className="text-xs text-pot-muted mb-5">Unlock premium AI features for this pot.</p>

        <div className="space-y-3">
          {COMPACT_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-xl border p-4 ${
                tier.highlight
                  ? 'border-pot-green bg-pot-green/5 glow-green'
                  : 'border-pot-border bg-pot-dark'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tier.emoji}</span>
                    <span className="font-bold text-white">{tier.name}</span>
                    {tier.highlight && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-pot-dark bg-pot-green rounded-full px-1.5 py-0.5">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-pot-muted mt-0.5 truncate">{tier.tagline}</p>
                </div>
                <span className="text-sm font-bold text-white shrink-0">{tier.price}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCheckout(tier)}
                className={`mt-3 w-full rounded-lg py-2 text-sm font-semibold transition ${
                  tier.highlight
                    ? 'bg-pot-green text-pot-dark hover:brightness-110'
                    : 'border border-pot-border text-white hover:border-pot-green'
                }`}
              >
                Choose {tier.name}
              </button>
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          onClick={onClose}
          className="mt-4 block text-center text-xs text-pot-green hover:underline"
        >
          Compare all plans →
        </Link>
      </div>
    </div>
  )
}
