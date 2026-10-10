'use client'

import Link from 'next/link'
import { useState } from 'react'

type Audience = 'holders' | 'creators'

const PATH: Record<Audience, { title: string; steps: { title: string; body: string }[]; benefits: string[] }> = {
  holders: {
    title: 'You hold the token',
    steps: [
      { title: 'Pick a POTfolio', body: 'A basket someone put together: tokens, stocks, RWA, memes.' },
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
    title: 'You create the POTfolio',
    steps: [
      { title: 'Build the basket', body: 'Pick up to 5 assets and their weights. Name it, give it a ticker.' },
      { title: 'Publish it', body: 'Your portfolio becomes a token.' },
      { title: 'Share your idea', body: 'People see what you believe in and back it by holding your token.' },
      { title: 'Earn every time', body: 'Every deposit into your POTfolio pays you, instantly and on-chain. Those who bring new holders earn too.' },
    ],
    benefits: [
      'Your track record is public and on-chain.',
      'No custody, no liability: you never hold anyone’s money.',
      'Referral links turn your community into distribution.',
    ],
  },
}

export function HowAPotWorks({ compact = false }: { compact?: boolean }) {
  const [who, setWho] = useState<Audience>('holders')
  const p = PATH[who]
  return (
    <section className={compact ? '' : 'mx-auto max-w-6xl px-4 py-16'}>
      {!compact && (
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">How it works</h2>
        </div>
      )}
      <div className="mb-8 flex justify-center">
        <div className="inline-grid grid-cols-2 gap-1 rounded-full border border-pot-border bg-pot-card p-1">
          {(['holders', 'creators'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setWho(a)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${who === a ? 'bg-pot-green text-pot-dark' : 'text-white/70 hover:text-white'}`}
            >
              {a === 'holders' ? 'I want to invest' : 'I want to create'}
            </button>
          ))}
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {p.steps.map((s, i) => (
          <li key={s.title} className="card relative p-5">
            <span className="mb-3 block font-mono text-xs text-pot-green">0{i + 1}</span>
            <h3 className="mb-2 font-semibold text-white">{s.title}</h3>
            <p className="text-sm leading-relaxed text-white/70">{s.body}</p>
          </li>
        ))}
      </ol>

      <ul className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80">
        {p.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pot-green" />
            {b}
          </li>
        ))}
      </ul>

      {!compact && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={who === 'holders' ? '/portfolios' : '/portfolios/new'} className="btn-primary">
            {who === 'holders' ? 'See live POTfolios' : 'Create a POTfolio'}
          </Link>
          <Link href="/learn" className="btn-secondary">Learn more</Link>
        </div>
      )}
    </section>
  )
}
