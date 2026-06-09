'use client'

import { useEffect } from 'react'
import Link from 'next/link'

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY

interface Tier {
  id: 'early' | 'pro' | 'pro_plus'
  emoji: string
  name: string
  price: string
  period: string
  blurb: string
  badge?: string
  highlight?: boolean
  borderClass: string
  features: string[]
  cta: string
  ctaHref?: string
}

const TIERS: Tier[] = [
  {
    id: 'early',
    emoji: '🌱',
    name: 'Early Supporter',
    price: 'Free',
    period: ' during beta',
    blurb: 'Everything you need to launch — no artificial limits.',
    badge: 'BETA',
    borderClass: 'border-pot-green/40',
    features: [
      'Unlimited pots',
      'Unlimited members',
      'Manual trading proposals',
      'Basic governance',
      'On-chain pot creation fee: ~0.1 SOL',
    ],
    cta: 'Create Your Pot →',
    ctaHref: '/create',
  },
  {
    id: 'pro',
    emoji: '⚡',
    name: 'Pro',
    price: '$29',
    period: '/mo',
    blurb: 'For active groups that trade and grow together.',
    badge: 'MOST POPULAR',
    highlight: true,
    borderClass: 'border-pot-accent',
    features: [
      'Unlimited pots',
      'Up to 50 members',
      'AI Agent automation',
      'Strategy Autopilot',
      'Visual customization — custom emoji, colors, banner',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'pro_plus',
    emoji: '🏆',
    name: 'Pro+',
    price: '$99',
    period: '/mo',
    blurb: 'Institutional-grade tooling for serious treasuries.',
    borderClass: 'border-amber-500/60',
    features: [
      'Everything in Pro',
      'Unlimited members',
      'Custom governance',
      'White-label branding',
      'Dedicated RPC',
    ],
    cta: 'Contact Us',
    ctaHref: 'https://x.com/PotBot_sol',
  },
]

export default function PricingPage() {
  useEffect(() => {
    document.title = 'Pricing — PotBot'
  }, [])

  function handleCheckout(tier: Tier) {
    if (!STRIPE_KEY) {
      // eslint-disable-next-line no-console
      console.info(`[stripe] would start checkout for ${tier.id} (set NEXT_PUBLIC_STRIPE_KEY)`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Choose Your Plan</h1>
        <p className="text-pot-muted max-w-2xl mx-auto">
          Non-custodial, on-chain pots — always free to create. Upgrade for AI automation,
          bigger crews, and custom governance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`card relative p-6 flex flex-col border ${tier.borderClass} ${
              tier.highlight ? 'glow-green md:-mt-2 md:mb-2' : ''
            }`}
          >
            {tier.badge && (
              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                tier.badge === 'BETA' ? 'bg-pot-green text-pot-dark' : 'bg-pot-accent text-white'
              }`}>
                {tier.badge}
              </span>
            )}

            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{tier.emoji}</span>
              <h2 className="text-lg font-bold text-white">{tier.name}</h2>
            </div>

            <div className="flex items-end gap-1 mb-2">
              <span className="text-3xl font-black text-white">{tier.price}</span>
              {tier.period && <span className="text-sm text-pot-muted mb-1">{tier.period}</span>}
            </div>

            <p className="text-sm text-pot-muted mb-5">{tier.blurb}</p>

            <ul className="space-y-2 mb-6 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-pot-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pot-green shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {tier.ctaHref ? (
              <Link
                href={tier.ctaHref}
                target={tier.ctaHref.startsWith('http') ? '_blank' : undefined}
                rel={tier.ctaHref.startsWith('http') ? 'noreferrer' : undefined}
                className={tier.highlight ? 'btn-primary w-full text-center' : 'btn-secondary w-full text-center'}
              >
                {tier.cta}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleCheckout(tier)}
                className={tier.highlight ? 'btn-primary w-full' : 'btn-secondary w-full'}
              >
                {tier.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-pot-border bg-pot-card/50 p-4 text-center">
        <p className="text-xs text-pot-muted leading-relaxed">
          ⓘ Pot creation requires a small on-chain fee (~0.1 SOL) to cover Solana account rent.
          This goes to the Solana network, not PotBot.
        </p>
      </div>
    </div>
  )
}
