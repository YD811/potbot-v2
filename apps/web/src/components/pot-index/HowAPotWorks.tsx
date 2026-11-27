'use client'

import Link from 'next/link'
import { useState } from 'react'

type Audience = 'holders' | 'creators'

const PATH: Record<Audience, { title: string; steps: { title: string; body: string }[]; benefits: string[] }> = {
  holders: {
    title: 'You hold the token',
    steps: [
      { title: 'Pick a POTFolio', body: 'A basket someone put together: tokens, stocks, RWA, memes.' },
      { title: 'Deposit USDC, get the token', body: 'You invest in the portfolio and receive a token that mirrors everything inside it.' },
      { title: 'Hold it, stay liquid', body: 'It is never locked. Keep it in your wallet, send it, use it anywhere a token works. The value follows the basket.' },
      { title: 'Leave any time', body: 'Redeem the token and choose: every asset of the basket, or plain USDC.' },
    ],
    benefits: [
      'No rug: the token is backed one to one by the assets inside, and the creator cannot touch them.',
      'Everyone leaves at the same fair value. No one is left holding the bag.',
    ],
  },
  creators: {
    title: 'You create the POTFolio',
    steps: [
      { title: 'Build the basket', body: 'Pick the assets and their weights. Name it, give it a ticker.' },
      { title: 'Publish it', body: 'Your portfolio becomes a token.' },
      { title: 'Share your idea', body: 'People see what you believe in and back it by holding your token.' },
      { title: 'Earn every time', body: 'Every deposit into your POTFolio pays you, instantly and on-chain. Those who bring new holders earn too.' },
    ],
    benefits: [
      'Your track record is public and on-chain.',
      'No custody, no liability: you never hold anyone’s money.',
      'Referral links turn your community into distribution.',
    ],
  },
}

const BAG_PATH: typeof PATH = {
  holders: {
    title: 'You buy the BAG',
    steps: [
      { title: 'Pick a BAG', body: 'Start with the PotBot BAG: Bitcoin, Anthropic and gold. Or set your own mix.' },
      { title: 'Pay in USDC', body: 'One approval. Jupiter swaps it into each asset at the price you see.' },
      { title: 'It lands in your wallet', body: 'Every asset is yours, in your own wallet. PotBot never holds it.' },
      { title: 'Sell any time', body: 'Back to USDC in one tap, or move the tokens anywhere.' },
    ],
    benefits: [],
  },
  creators: {
    title: 'You build a BAG',
    steps: [
      { title: 'Set your mix', body: 'Pick the assets and the percentages. Building is free.' },
      { title: 'Name it', body: 'Your BAG gets its own page and link.' },
      { title: 'Share the link', body: 'People buy your mix in one go, straight into their own wallets.' },
      { title: 'Earn BAG Points', body: 'Every buy through your BAG or your invite link earns you points.' },
    ],
    benefits: [],
  },
}

export function HowAPotWorks({ compact = false, product = 'potfolio' }: { compact?: boolean; product?: 'potfolio' | 'bag' }) {
  const [who, setWho] = useState<Audience>('holders')
  const p = (product === 'bag' ? BAG_PATH : PATH)[who]
  return (
    <section className={compact ? '' : 'mx-auto max-w-6xl px-4 py-16'}>
      {!compact && (
        <div className="mb-8 text-center">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-5xl">How it works</h2>
        </div>
      )}
      <div className="mb-8 flex justify-center">
        <div role="tablist" className="relative inline-grid grid-cols-2 rounded-full border border-pot-border bg-pot-card p-1">
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-pot-accent shadow-[0_8px_20px_-10px_rgba(224,122,79,.8)] transition-transform duration-500 ease-pot"
            style={{ transform: who === 'holders' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          {(['holders', 'creators'] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={who === a}
              onClick={() => setWho(a)}
              className={`relative z-[1] rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${who === a ? 'text-pot-dark' : 'text-white/70 hover:text-white'}`}
            >
              {a === 'holders' ? 'I want to invest' : 'I want to create'}
            </button>
          ))}
        </div>
      </div>

      <ol key={who} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {p.steps.map((s, i) => (
          <li key={s.title} className="hiw-step card relative rounded-3xl p-6" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="mb-3 block font-mono text-xs tracking-[0.12em] text-pot-accent">0{i + 1}</span>
            <h3 className="mb-2 text-lg font-semibold text-white">{s.title}</h3>
            <p className="text-[15px] leading-relaxed text-pot-muted">{s.body}</p>
          </li>
        ))}
      </ol>

      {product === 'bag' && (
        <p className="mt-6 text-center text-sm text-pot-muted">
          <span className="font-semibold text-white">Next: one token.</span> POTFolio turns the whole basket into a single token. On devnet now, mainnet after the audit.{' '}
          <Link href="/portfolios" className="font-semibold text-white underline-offset-4 hover:underline">See the demo</Link>
        </p>
      )}

      {!compact && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={who === 'holders' ? '/portfolios' : '/portfolios/new'} className="btn-primary">
            {who === 'holders' ? 'See live POTFolios' : 'Create a POTFolio'}
          </Link>
          <Link href="/learn" className="btn-secondary">Learn more</Link>
        </div>
      )}
    </section>
  )
}
