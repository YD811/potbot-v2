'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'

type Tier = 'live' | 'next' | 'later' | 'vision'

interface Feature {
  name: string
  desc: string
  doc?: string
}

interface Section {
  tier: Tier
  chipLabel?: string
  title: string
  blurb: string
  features: Feature[]
}

const SECTIONS: Section[] = [
  {
    tier: 'live',
    chipLabel: 'Shipped',
    title: 'Where we come from',
    blurb: 'Three hackathons, one idea: people putting money to work together.',
    features: [
      { name: 'PotBot v1 · group trading', desc: 'Our first hackathon, as a team: arm the group chat. A Telegram bot for trading from one wallet. Won a local track, no product-market fit, so we moved on.' },
      { name: 'PotBot v2 · the vault', desc: 'The next hackathon and sprint, mostly research. We found the shape that works: a non-custodial vault with rules on-chain.', doc: '/vaults' },
      { name: 'PotBot v3 · POTFolio', desc: 'The vault as one liquid token: simple to hold, send, trade and redeem.' },
    ],
  },
  {
    tier: 'live',
    title: 'Now',
    blurb: 'Built Sept 14 to Oct 12, 2026. Five showcase POTFolios, keeper running.',
    features: [
      { name: 'Create a POTFolio', desc: 'Up to 5 assets, fixed weights, one transaction.' },
      { name: 'Deposit, one signature', desc: 'Tokens minted at NAV, the basket bought right after. 0.30% entry fee: 40% creator, 40% referrer, 20% protocol.' },
      { name: 'Redeem for assets or USDC', desc: 'Never pausable. USDC in one transaction with an on-chain minimum.' },
      { name: 'My Dashboard', desc: 'Your positions, share of each Pot, P&L, created Pots and invite links.' },
      { name: 'Keepers inside limits', desc: 'Toward target only, max 25% per trade, at Pyth prices, or it reverts.' },
      { name: 'Garden mode', desc: 'Every POTFolio grows a plant with the money inside, read from the chain.' },
    ],
  },
  {
    tier: 'next',
    title: 'Next',
    blurb: 'Make it better before real money.',
    features: [
      { name: 'Garden levels that unlock things', desc: 'Catalog and leaderboard at $1k, verified badge at $10k, featured and a DEX pool at $50k, Managed mode at $250k. Planted early badge for first holders.' },
      { name: 'Creator earnings', desc: 'What each creator and referrer earned, share cards for X.' },
      { name: 'Live prices, always', desc: 'Our keeper keeps Pyth prices fresh on-chain, so every action is instant.' },
      { name: 'Up to 10 assets', desc: 'Bigger baskets and long-tail tokens.' },
      { name: 'Stocks beyond Tesla and the Nasdaq', desc: 'A memory basket first: Micron, SK Hynix, SanDisk and USDC as one token, exposure to the chip-memory cycle that nobody holds on Solana today. Needs Pyth equity data: our free feed covers only TSLA and QQQ.' },
    ],
  },
  {
    tier: 'next',
    title: 'Audit and mainnet',
    blurb: 'External audit first. Then one capped flagship POTFolio, then invited creators.',
    features: [
      { name: 'Flagship on mainnet', desc: 'Real assets, a TVL cap, clearly labelled beta.' },
      { name: 'Jupiter swaps', desc: 'Exits to USDC and rebalancing routed through Jupiter.' },
      { name: 'Multisig and audit', desc: 'Upgrade authority and asset listing on a multisig with a timelock; external audit.' },
      { name: 'Trade the token', desc: 'A POTFolio/USDC pool so tokens trade in every wallet and aggregator.' },
    ],
  },
  {
    tier: 'later',
    title: 'Later',
    blurb: 'More kinds of POTFolio, more ways to use it.',
    features: [
      { name: 'Managed POTFolios', desc: 'The creator adjusts weights inside a public mandate, with a timelock.' },
      { name: 'Community POTFolios', desc: 'Holders vote with the token on what goes in.' },
      { name: 'Creator POTFolio from a profile', desc: 'Type an X handle, get a draft basket from what the creator trades and talks about. They claim it, or fans mint it first.' },
      { name: 'Smart rules', desc: 'DCA in, buy the dip, rebalancing rules, an agent that acts only inside on-chain limits.' },
    ],
  },
  {
    tier: 'vision',
    title: 'Vision: a DeFi layer for real-world assets',
    blurb: 'A Pot can hold any asset. POTFolio makes it one token.',
    features: [
      { name: 'Any asset inside', desc: 'Tokens, stocks, gold, real estate, cars: anything that gets tokenized can sit in a Pot.' },
      { name: 'One token that works everywhere', desc: 'Send it, lend it, borrow against it, stake and restake it.' },
    ],
  },
  {
    tier: 'next',
    title: 'What we need',
    blurb: 'The short list before a guarded mainnet.',
    features: [
      { name: 'Equity price data', desc: 'Pyth entitlement for US stock feeds (Micron, SK Hynix, SanDisk, Nvidia and the rest). Today only TSLA and QQQ are open to us; the paid tier starts at $10k a month, so we are asking Pyth for builder access first.' },
      { name: 'External audit', desc: 'One audit of the final program before the first real deposit. Three reviews so far, one of them independent.' },
      { name: 'Jupiter and a market maker', desc: 'Exits to USDC and rebalancing through Jupiter on mainnet; a seeded POTFolio/USDC pool for the flagship.' },
      { name: 'A second engineer', desc: 'The reviewer who found 26 issues and deployed v1.2 should be on the team, not a volunteer.' },
      { name: 'Runway', desc: 'Six months of a two-person team, infra, audit and data. Grants first, then a small pre-seed round.' },
    ],
  },
]

const CHIP: Record<Tier, { label: string; className: string }> = {
  live: { label: 'Live', className: 'border-transparent bg-pot-green/15 text-pot-green' },
  next: { label: 'Next', className: 'border-transparent bg-pot-accent/15 text-pot-accent' },
  later: { label: 'Later', className: 'border-pot-border text-pot-muted' },
  vision: { label: 'Vision', className: 'border-dashed border-pot-muted/60 text-pot-muted' },
}

function Chip({ tier, label }: { tier: Tier; label?: string }) {
  const c = CHIP[tier]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] ${c.className}`}>
      {tier === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-pot-green" />}
      {label ?? c.label}
    </span>
  )
}

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-14 px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Roadmap"
        title="Where PotBot goes"
        lede="From one token you can hold today to a DeFi layer for every tokenized asset. Chips show what is live, next, later, or further out."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {(['live', 'next', 'later', 'vision'] as const).map((t) => (
              <Chip key={t} tier={t} />
            ))}
          </div>
        }
        className="mb-0"
      />

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{section.title}</h2>
            <Chip tier={section.tier} label={section.chipLabel} />
          </div>
          <p className="mb-5 max-w-2xl text-[15px] text-pot-muted">{section.blurb}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.features.map((f) => (
              <div key={f.name} className="rounded-3xl border border-pot-border bg-pot-card p-5">
                <h3 className="text-base font-semibold text-white">{f.name}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-pot-muted">{f.desc}</p>
                {f.doc && (
                  <Link href={f.doc} className="mt-3 inline-block text-sm text-pot-accent underline underline-offset-4 transition hover:text-white">
                    Read more
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-3xl border border-pot-border bg-pot-card p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Hold one today</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-pot-muted">
          The program is open source at{' '}
          <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="text-white underline underline-offset-4">github.com/YD811/potbot-v2</a>. Built with Y-DAO and Solana.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/portfolios" className="btn-primary">Explore POTFolios</Link>
          <Link href="/mainnet" className="btn-secondary">Security</Link>
        </div>
      </section>
    </div>
  )
}
