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
    title: 'Where we come from: three hackathons',
    blurb: 'PotBot v1 (group trading from one wallet) at our first Colosseum, PotBot v2 vaults (governance, garden, MCP) at Frontier, and now POTfolio: the vault wrapped into one liquid token.',
    features: [
      { name: 'Vaults (PotBot v2)', desc: 'Group treasury with votes, strategies, garden mode and an MCP server. Public vaults on devnet, private vaults (STAMPPOT) in development.', doc: '/vaults' },
      { name: 'POTfolio (PotBot v3)', desc: 'A basket of Solana assets as one index token. New pot_index program, built during Crypto World\'s Fair.', doc: '/worldsfair' },
    ],
  },
  {
    tier: 'devnet',
    title: '1 · POTfolio core, live on devnet',
    blurb: 'Built from scratch Sept 14 to Oct 12, 2026. Program DfKKe9…iUxr, five showcase POTfolios, keeper running.',
    features: [
      { name: 'Create a POTfolio', desc: 'Up to 5 assets from the registry (crypto majors, Solana natives, tokenized stocks, memes) with fixed target weights. Token address starts with Pot…' },
      { name: 'Mint at NAV, one signature', desc: 'Deposit USDC, receive the index token at the current basket value. Pyth prices posted in the same transaction. 0.30% entry fee split 40/40/20 creator / referrer / protocol.' },
      { name: 'Exit in kind, always', desc: 'Redeem the token, receive your share of every asset. No oracle, no pause, nothing sold on other holders. 0.50% stays with remaining holders.' },
      { name: 'Keepers inside on-chain rules', desc: 'Independent bots rebalance toward target. The program allows only moves toward target, max 25% per trade, inside the Pyth band; under-delivery reverts.' },
      { name: 'Token metadata, activity feed, referral links', desc: 'Name and logo in wallets via Metaplex; every deposit, rebalance and exit on the Pot page with Explorer links; share-to-earn links.' },
      { name: 'Market-hours aware', desc: 'Stock POTfolios refuse stale prices: minting opens with US markets, exits always work.' },
    ],
  },
  {
    tier: 'phase-2',
    title: '2 · Right after the Fair',
    blurb: 'Four weeks of product work before real money.',
    features: [
      { name: 'Dashboard and P&L', desc: 'Your positions across POTfolios, cost basis, profit and loss, creator and referral earnings. Price history and 24h / 7d charts.' },
      { name: 'Comments and callouts', desc: 'Wallet-signed comments under every POTfolio, holder badges, activity-ranked feed.' },
      { name: 'Up to 10 assets, paste any CA', desc: 'Bigger baskets; paste a token address and add it if a price feed exists, request listing if not.' },
      { name: 'Long-tail prices', desc: 'Paid Pyth tier and Switchboard On-Demand for JUP, JTO, BONK, WIF and the rest of Solana.' },
    ],
  },
  {
    tier: 'phase-2',
    title: '3 · Guarded mainnet, Q4 2026',
    blurb: 'One flagship POTfolio with a TVL cap, then invited creators. Details on /mainnet.',
    features: [
      { name: 'Flagship on mainnet', desc: 'Real USDC, cbBTC, WETH, SOL. TVL-capped, labelled unaudited beta. This is also the funded grant milestone.' },
      { name: 'Jupiter keeper, partner keepers', desc: 'Open-source keeper routing through Jupiter. Partner rebalancing engines can fill the same instruction.' },
      { name: 'Squads multisig', desc: 'Upgrade authority and treasury on a Squads multisig before any real TVL. Helius RPC and webhooks.' },
      { name: 'Secondary market', desc: 'POTfolio / USDC pool on Meteora so tokens trade on Jupiter, Photon and inside wallets. Mint and burn at NAV keep the pool honest.' },
    ],
  },
  {
    tier: 'phase-3',
    title: '4 · Three kinds of POTfolio',
    blurb: 'From index to managed strategy to community-run basket.',
    features: [
      { name: 'Fixed', desc: 'What ships today: weights locked at creation.' },
      { name: 'Managed', desc: 'Creator adjusts weights inside a public mandate (asset list, caps) with a timelock, and earns management and performance fees above a high-water mark.' },
      { name: 'Community', desc: 'Holders stake the token to vote on adding or removing assets; timelocked execution.' },
      { name: 'Launch with a floor', desc: 'Creator tokens launched on a bonding curve and backed by a POTfolio: a price floor equal to the basket, upside from the market.' },
    ],
  },
  {
    tier: 'phase-3',
    title: '5 · DeFi layer and real-world assets',
    blurb: 'The token works everywhere; every asset class fits inside.',
    features: [
      { name: 'Collateral and yield', desc: 'POTfolio tokens as collateral on lending markets; LSTs and lending vaults earn inside the basket.' },
      { name: 'Tokenized stocks and T-bills', desc: 'xStocks, treasuries and yield stables as legs, with market-hours rules already in place.' },
      { name: 'Compliant POTfolios', desc: 'MPL-3643 permissioned tokens for regulated assets, liquidity on Meteora.' },
      { name: 'Smart rules and agents', desc: 'DCA-in, buy-the-dip, limit-style rebalances; an AI agent that proposes trades strictly inside on-chain limits (MCP).' },
    ],
  },
  {
    tier: 'vision',
    title: '6 · Space',
    blurb: 'Your POTfolio as the treasury of a personal space you own.',
    features: [
      { name: 'Space', desc: 'A personal web space on your own hardware, opened with an NFC card, designed with an AI terminal. Your POTfolio is its treasury, settled on Solana.' },
      { name: 'Y-DAO and SOLO Wallet', desc: 'Community treasuries and a wallet that unifies it all.' },
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
          lede="From one shippable thing, a POTfolio and its index token, to portfolios that work across DeFi, and finally to your own corner of the internet. Every stage plugs into the same token. Chips say what is live, on devnet, next, or still on paper."
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
          <p className="text-sm text-pot-muted mb-5 max-w-2xl break-words">{section.blurb}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.features.map((f) => (
              <div key={f.name} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {f.emoji && <span className="text-2xl shrink-0">{f.emoji}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-sm sm:text-base break-words">{f.name}</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-pot-muted mt-1 break-words leading-relaxed">{f.desc}</p>
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
          Portfolios program (devnet): <code className="font-mono text-pot-green text-xs break-all">DfKKe9oiPb8E98qxZ95otU3D5y1L1U3L2Eh3A7HQiUxr</code>
        </p>
        <p className="mt-2">
          Hackathon build: <Link href="/worldsfair" className="text-pot-accent hover:text-white">/worldsfair</Link> ·
          Repo: <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="text-pot-accent hover:text-white">github.com/YD811/potbot-v2</a>
        </p>
      </footer>
    </div>
  )
}
