'use client'

import Link from 'next/link'
import { useState } from 'react'

type Audience = 'holders' | 'creators'

const PATH: Record<Audience, { title: string; steps: { title: string; body: string }[]; benefits: string[] }> = {
  holders: {
    title: 'You hold the token',
    steps: [
      { title: 'Pick a POTfolio', body: 'A basket someone put together: tokens, stocks, RWA, memes.' },
      { title: 'Deposit USDC, get the token', body: 'One signature. You receive tokens worth exactly what you put in.' },
      { title: 'Hold it, stay liquid', body: 'One token, many assets inside. It is never locked: keep it in your wallet, send it, use it. The value follows the basket.' },
      { title: 'Leave any time', body: 'Redeem the token and choose: every asset of the basket, or plain USDC.' },
    ],
    benefits: [
      'No rug: the token price is backed by the assets inside, one to one.',
      'No exit liquidity: everyone leaves at the same fair value, nobody is sold on.',
      'Nobody can withdraw the assets. Not the creator, not PotBot.',
    ],
  },
  creators: {
    title: 'You create the POTfolio',
    steps: [
      { title: 'Build the basket', body: 'Pick up to 5 assets and their weights. Name it, give it a ticker.' },
      { title: 'Publish it', body: 'One transaction. Your portfolio becomes a token with its own page and link.' },
      { title: 'Share your expertise', body: 'People deposit into your basket. The protocol keeps it balanced and holds the assets, so there is nothing for you to run.' },
      { title: 'Earn on every deposit', body: 'A share of every deposit is paid to you instantly, on-chain. Referrers who bring depositors earn too.' },
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
