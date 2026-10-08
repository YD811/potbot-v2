'use client'

import Link from 'next/link'
import { StatusBadge, type StatusTier } from '@/components/StatusBadge'

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
    tier: 'devnet',
    title: '1 · Hackathon core — Pots & the index token',
    blurb: 'Built from scratch during Colosseum Crypto World\'s Fair (Sept 14 – Oct 12, 2026). New `pot_index` program, deployed to devnet.',
    features: [
      { emoji: '🧺', name: 'Create a Pot', desc: '2–5 allowlisted assets with fixed target weights. Weights lock at creation; depositors always know what they hold.' },
      { emoji: '🪙', name: 'Index token at NAV', desc: 'Deposit USDC, mint one SPL index token at Pyth-priced NAV. 0.30% entry fee split 40/40/20 between referrer, creator and protocol.' },
      { emoji: '🔓', name: 'Exit in kind, always', desc: 'Burn the token and receive your share of every asset. No oracle, no pause, no swaps. 0.50% stays with remaining holders. There is no withdraw instruction for anyone.' },
      { emoji: '⚖️', name: 'Bounded permissionless rebalancing', desc: 'Anyone can rebalance toward target weights in a same-transaction open/close pair. Enforced on-chain: only overweight → underweight, never past target, per-trade cap, Pyth slippage band, deadband, cooldown.' },
      { emoji: '🔗', name: 'Referral links', desc: 'Every Pot page has a referral link; referred deposits pay the referrer 40% of the entry fee, on-chain, at deposit time.' },
      { emoji: '🛡️', name: 'Security pass', desc: 'Conservative Pyth pricing (price ± conf), 300 s max price age, first-depositor protection, two-step admin transfer, LiteSVM end-to-end tests.' },
    ],
  },
  {
    tier: 'phase-2',
    title: '2 · Guarded mainnet — target Q4 2026',
    blurb: 'One flagship Pot with a TVL cap and a security review. First creators and depositors from Y-DAO and Superteam NL.',
    features: [
      { emoji: '🚀', name: 'Flagship Pot on mainnet', desc: 'SOL + LSTs + stables, TVL-capped, honest "unaudited beta" label. This is also the funded grant milestone.' },
      { emoji: '🔁', name: 'Jupiter-routed keeper', desc: 'Open-source keeper that fills bounded rebalances through Jupiter. Anyone can run one.' },
      { emoji: '🏦', name: 'Squads multisig admin', desc: 'Protocol admin and upgrade authority move to a Squads v4 multisig before any real TVL.' },
    ],
  },
  {
    tier: 'phase-2',
    title: '3 · Creator economy',
    blurb: 'Run a Pot as a business — the Hyperliquid vault-leader model, applied to portfolios.',
    features: [
      { emoji: '💸', name: 'Management & performance fees', desc: 'Creator-set fees above a high-water mark, paid in index tokens. Protocol takes a cut.' },
      { emoji: '🏆', name: 'Leaderboard', desc: 'Pots ranked by NAV performance and AUM. Public track records, like Hyperliquid vaults.' },
      { emoji: '🆔', name: '.potbot.sol per Pot', desc: 'Readable on-chain identity for every Pot (already selling as subdomains).' },
    ],
  },
  {
    tier: 'phase-3',
    title: '4 · DeFi layer — the token works everywhere',
    blurb: 'The index token becomes a first-class DeFi asset.',
    features: [
      { emoji: '🏛️', name: 'Borrow against your Pot token', desc: 'Index tokens as collateral on lending markets; lend them out; LP them. Liquidity for Pot tokens on spot venues.' },
      { emoji: '🌾', name: 'Yield on idle assets', desc: 'Assets inside a Pot earn staking and lending yield (LSTs, lending vaults) without leaving the Pot.' },
      { emoji: '📐', name: 'Smart rules & Mandates', desc: 'DCA-in, buy-the-dip, limit-style rebalances; an AI agent that proposes trades strictly inside on-chain limits.' },
    ],
  },
  {
    tier: 'phase-3',
    title: '5 · Open portfolios — stocks, T-bills, RWAs',
    blurb: 'The open version of Ondo × BlackRock: anyone builds the portfolio.',
    features: [
      { emoji: '📈', name: 'Tokenized stocks & T-bills in baskets', desc: 'xStocks, tokenized treasuries and yield-bearing stables as Pot legs, with issuer, oracle and market-hours rules.' },
      { emoji: '🪪', name: 'Compliant Pots', desc: 'Token-2022 + Token ACL (MPL-3643-compatible) index tokens that only eligible wallets can hold.' },
    ],
  },
  {
    tier: 'vision',
    title: '6 · Space — your Pot in your own corner of the internet',
    blurb: 'Vision. Pots become the vault layer for personal spaces, Y-DAO and SOLO Wallet.',
    features: [
      { emoji: '🏠', name: 'Space', desc: 'A personal web space on your own hardware, opened with an NFC card, designed with an AI terminal. Your Pot is its treasury, settled on Solana.' },
      { emoji: '🌐', name: 'Y-DAO & SOLO Wallet', desc: 'Community treasuries and a wallet that unifies it all.' },
    ],
  },
  {
    tier: 'live',
    title: 'Experimental & legacy (still in the repo)',
    blurb: 'Earlier PotBot v2 features — group vaults with governance, AI proposals, Blinks, MCP server, Money Tree, Duels, STAMPPOT. Kept as supporting layers; not part of the Portfolios MVP promise.',
    features: [
      { emoji: '🗳️', name: 'Group vaults with on-chain governance (pot_vault)', desc: 'Proposal → vote → execute via Jupiter CPI. Devnet program GJap9D…AmiK.', doc: '/docs/architecture/program' },
      { emoji: '🤖', name: '@potbot/mcp', desc: '18 tools so any LLM can drive a vault. Will be pointed at Pots next.' },
      { emoji: '🌱', name: 'Money Tree, Duels, STAMPPOT privacy', desc: 'Gamification and ZK privacy experiments from earlier hackathons.' },
    ],
  },
]

export default function RoadmapPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <header>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-3xl">🗺️</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">PotBot — Full Roadmap</h1>
        </div>
        <p className="text-pot-muted text-sm sm:text-base leading-relaxed max-w-2xl">
          From one small, shippable thing — a Pot and its index token — to portfolios that work
          across all of DeFi, and finally to your own corner of the internet. Every stage plugs into the
          same token. Chips say honestly what is live, on devnet, next, or still on paper.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <StatusBadge tier="live" compact />
          <StatusBadge tier="devnet" compact />
          <StatusBadge tier="phase-2" compact />
          <StatusBadge tier="phase-3" compact />
          <StatusBadge tier="vision" compact />
        </div>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.tier}>
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
