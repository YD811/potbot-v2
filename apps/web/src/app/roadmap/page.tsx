'use client'

import Link from 'next/link'
import { StatusBadge, type StatusTier } from '@/components/StatusBadge'
import { PageHeader } from '@/components/PageHeader'

interface Feature {
  name: string
  desc: string
  doc?: string
  emoji?: string
}

interface Section {
  tier: StatusTier
  title: string
  blurb: string
  features: Feature[]
}

const SECTIONS: Section[] = [
  {
    tier: 'live',
    title: 'Where we come from',
    blurb: 'Three hackathons, one idea: people putting money to work together.',
    features: [
      { name: 'PotBot v1 · group trading', desc: 'Our first Colosseum, as a team: a request from Matty Taylor, Colosseum co-founder, to arm the group chat. A Telegram bot for trading from one wallet. Won a local track, no product-market fit, so we moved on.' },
      { name: 'PotBot v2 · the vault', desc: 'The next hackathon and sprint, mostly research. We found the shape that works: a non-custodial vault with rules on-chain.', doc: '/vaults' },
      { name: 'PotBot v3 · POTFolio', desc: 'The vault as one liquid token: simple to hold, send, trade and redeem. Built during Crypto World\'s Fair.', doc: '/worldsfair' },
    ],
  },
  {
    tier: 'devnet',
    title: 'Now · live on devnet',
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
    tier: 'phase-2',
    title: 'Next · after the Fair',
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
    tier: 'phase-2',
    title: 'Mainnet · guarded',
    blurb: 'One capped flagship POTFolio first, then invited creators.',
    features: [
      { name: 'Flagship on mainnet', desc: 'Real assets, a TVL cap, clearly labelled beta.' },
      { name: 'Jupiter swaps', desc: 'Exits to USDC and rebalancing routed through Jupiter.' },
      { name: 'Multisig and audit', desc: 'Upgrade authority and asset listing on a multisig with a timelock; external audit.' },
      { name: 'Trade the token', desc: 'A POTFolio/USDC pool so tokens trade in every wallet and aggregator.' },
    ],
  },
  {
    tier: 'phase-3',
    title: 'Later · more products',
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
    title: 'Vision · DeFi layer for real-world assets',
    blurb: 'A Pot can hold any asset. POTFolio makes it one token.',
    features: [
      { name: 'Any asset inside', desc: 'Tokens, stocks, gold, real estate, cars: anything that gets tokenized can sit in a Pot.' },
      { name: 'One token that works everywhere', desc: 'Send it, lend it, borrow against it, stake and restake it.' },
    ],
  },
  {
    tier: 'phase-2',
    title: 'What we need',
    blurb: 'The short list between devnet and a guarded mainnet.',
    features: [
      { name: 'Equity price data', desc: 'Pyth entitlement for US stock feeds (Micron, SK Hynix, SanDisk, Nvidia and the rest). Today only TSLA and QQQ are open to us; the paid tier starts at $10k a month, so we are asking Pyth for builder access first.' },
      { name: 'External audit', desc: 'One audit of the final program before the first real deposit. Three reviews so far, one of them independent.' },
      { name: 'Jupiter and a market maker', desc: 'Exits to USDC and rebalancing through Jupiter on mainnet; a seeded POTFolio/USDC pool for the flagship.' },
      { name: 'A second engineer', desc: 'The reviewer who found 26 issues and deployed v1.2 should be on the team, not a volunteer.' },
      { name: 'Runway', desc: 'Six months of a two-person team, infra, audit and data. Grants and a small round; details in the budget note in the repo.' },
    ],
  },
]

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-12">
      <header>
        <PageHeader
          eyebrow="Roadmap"
          title="Where PotBot goes"
          lede="From one token you can hold today to a DeFi layer for every tokenized asset. Chips show what is live, on devnet, next, or later."
          className="mb-4"
        />
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <StatusBadge tier="live" compact />
          <StatusBadge tier="devnet" compact />
          <StatusBadge tier="phase-2" compact />
          <StatusBadge tier="phase-3" compact />
          <StatusBadge tier="vision" compact />
        </div>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{section.title}</h2>
            <StatusBadge tier={section.tier} compact />
          </div>
          <p className="text-[15px] text-pot-muted mb-5 max-w-2xl break-words">{section.blurb}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.features.map((f) => (
              <div key={f.name} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {f.emoji && <span className="text-2xl shrink-0">{f.emoji}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-sm sm:text-base break-words">{f.name}</h3>
                    </div>
                    <p className="text-sm text-pot-muted mt-1 break-words leading-relaxed">{f.desc}</p>
                    {f.doc && (
                      <Link
                        href={f.doc}
                        className="inline-block mt-2 text-[11px] text-pot-accent hover:text-white transition"
                      >
                        Spec →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <footer className="border-t border-pot-border pt-8 text-sm text-pot-muted">
        <p className="break-words">
          Portfolios program (devnet): <code className="font-mono text-pot-green text-xs break-all">7bULMGNu443EVE48Cmfp42rvAaW2CJbKLv8fsPZBSRsV</code>
        </p>
        <p className="mt-2">
          Hackathon build: <Link href="/worldsfair" className="text-pot-accent hover:text-white">/worldsfair</Link> ·
          Repo: <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="text-pot-accent hover:text-white">github.com/YD811/potbot-v2</a>
        </p>
        <p className="mt-2">Built with Y-DAO and Solana.</p>
      </footer>
    </div>
  )
}
