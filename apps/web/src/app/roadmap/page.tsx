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
    tier: 'live',
    title: 'Live / verifiable',
    blurb: 'Working today. Network-specific pages show whether the proof is on devnet or mainnet. The judge clicks through and watches it run.',
    features: [
      { emoji: '🪴', name: 'pot_vault Anchor program', desc: '30+ instructions deployed: create_pot, deposit, withdraw, vote, execute_swap, pot_admin, treasury config.', doc: '/docs/architecture/program' },
      { emoji: '⚡', name: 'execute_swap with Jupiter v6 CPI', desc: 'Vault PDA signs the swap directly. Three modes (AdminDirect / Proposal / StrategyTrigger) in one instruction with strict mode-source matching.' },
      { emoji: '🗳️', name: 'On-chain governance + voting', desc: 'Proposal → vote → mark_proposal_passed → execute. Quorum, approval %, risk caps configurable per pot.' },
      { emoji: '🪙', name: 'Solana Blinks (vote + deposit)', desc: 'GET / POST endpoints at /api/actions/[potPubkey]/{deposit,vote}. Pot proposal becomes a tweet anyone can act on without leaving X.' },
      { emoji: '🤖', name: '@potbot/mcp on npm', desc: '18 tools (free + paid via x402). HTTP+SSE+stdio transports. Any LLM can drive a pot.' },
      { emoji: '🛡️', name: 'Helius RPC + webhooks', desc: 'Priority fees, realtime pot events to Supabase, off-chain mirror for analytics.' },
      { emoji: '🤝', name: 'Squads v4 multisig (creator role)', desc: 'High-value pots can be owned by a Squads multisig instead of a single key. Banner + lib live.' },
      { emoji: '📊', name: 'Public leaderboard', desc: 'Live ranking by Season Score = volume × members × pet_health.' },
    ],
  },
  {
    tier: 'devnet',
    title: 'Devnet · mainnet target this sprint',
    blurb: 'Proven on devnet. Mainnet cut targeted within the current quarter.',
    features: [
      { emoji: '⚙️', name: 'Strategy slot accounts', desc: 'create_strategy, close_strategy, mark_proposal_passed. Strategy parks on-chain, AI agents and keepers can attach to slots.' },
      { emoji: '🌱', name: 'Tamagotchi state machine', desc: 'Five levels (Seedling → Sprout → Bud → Bloom → Mature Tree). HP grows from member activity, not P&L.', doc: '/docs/architecture/governance' },
      { emoji: '🪪', name: 'Personal AI Voters', desc: 'MemberDelegate + vote_as_delegate. Members register an AI agent wallet to vote on their behalf, revocable on-chain with a reason string.' },
      { emoji: '🤖', name: 'PotBot AI suggestion feed', desc: 'Decision-support layer surfacing 4 candidate proposals every 60s with confidence + impact %. Vote still required.' },
      { emoji: '📈', name: 'Dune SIM portfolio + activity', desc: 'Vault holdings + tx history via Dune SIM SVM endpoints. Drives leaderboard TVL and keeper pre-flight checks.' },
      { emoji: '🎛️', name: 'Strategy proposal builder', desc: 'Token search (ticker or contract address) → action select → amount slider → preview → submit as proposal.' },
    ],
  },
  {
    tier: 'phase-2',
    title: 'Phase 2 · Q3 2026',
    blurb: 'Designed and scaffolded in code. Ships next quarter.',
    features: [
      { emoji: '🔐', name: 'Pyth in-program oracle guard', desc: 'execute_swap re-reads Pyth price feeds inside the instruction and rejects keepers that fire on the wrong condition. Triggers cannot be faked.' },
      { emoji: '🌾', name: 'Meteora DLMM + DAMM yield CPI', desc: 'Park idle pot capital in Meteora pools. CPI path scaffolded, yield_strategy field on PotAccount supports it.' },
      { emoji: '🏦', name: 'Kamino lending CPI', desc: 'Lending-based yield strategy as an alternative to Meteora. Same allocation surface.' },
      { emoji: '✉️', name: 'Privy embedded wallets', desc: 'Email + social login + Solana auto-create wallet. Implementation branch exists, but the PR was not merged; ships after env setup and final review.' },
      { emoji: '🪶', name: 'Light Protocol ZK-compressed audit log', desc: 'SwapEvent + NavSnapshot compressed accounts cut rent ~5000× while keeping full on-chain audit trail.', doc: '/docs/architecture/architecture-onchain' },
      { emoji: '🪙', name: 'init_share_mint graduation', desc: 'Off-chain shares (Seedling) graduate to on-chain SPL mint at Sprout+. Members hold transferable, DeFi-composable share tokens.', doc: '/docs/architecture/etf-token-system' },
      { emoji: '🎯', name: 'Advanced strategies (SL / TP / trailing / DCA)', desc: 'Stop-loss, take-profit, trailing-stop, recurring DCA — all built on the existing proposal flow.' },
    ],
  },
  {
    tier: 'phase-3',
    title: 'Phase 3 · Q4 2026',
    blurb: 'Architecture set. Some UI placeholders already in the app.',
    features: [
      { emoji: '🎨', name: 'Tamagotchi NFT mint', desc: 'Soulbound NFT minted at Bloom (L4). Metadata via Metaplex Token Metadata, evolves with pot stage.' },
      { emoji: '⚔️', name: 'Pot duels', desc: 'Vault-vs-vault PnL competition unlocked at Bud (L3). Winner takes a slice of the loser\'s shares.' },
      { emoji: '💎', name: 'Premium tier', desc: 'SNS subdomain (yourpot.potbot.sol), share tokenization (tokenize_pot), priority on-chain features. Currently visible as "Available" placeholders.' },
      { emoji: '🥷', name: 'STAMPPOT — Auditable-Private mode', desc: 'PrivacyCash deposits + Merkle membership proofs + stealth addresses. Vault balance still public; the wallet-to-share link is hidden.', doc: '/docs/architecture/private-pots' },
    ],
  },
  {
    tier: 'vision',
    title: 'Vision · 2027+',
    blurb: 'Pitch-deck. No code yet. The product will get here.',
    features: [
      { emoji: '🔒', name: 'STAMPPOT — Sealed-Private mode', desc: 'Commit-reveal voting, encrypted strategy params, shielded balances via Light Protocol confidential transfer.' },
      { emoji: '📱', name: 'Saga / Seeker dApp Store entry', desc: 'PWA manifest is mainnet-ready; dApp Store listing with on-device wallet integration is the next mobile step.' },
      { emoji: '🪙', name: '$POT governance token', desc: 'Protocol fee buyback + season distribution to Money Tree winners. Honest emissions, no airdrop farming.' },
      { emoji: '🔗', name: 'Cross-pot composability', desc: 'One member, many pots, single unified portfolio view. Squads v4 as kill_switch_admin for all Sealed pots.' },
      { emoji: '✅', name: 'Adevar Labs audit', desc: 'Full security audit before mainnet GA push.' },
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
          Every feature, every integration, with an explicit lifecycle chip. We ship what&apos;s
          live, scaffold what&apos;s next, and tell you the truth about what&apos;s still on paper.
          Group trading on Solana — the whole arc.
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
          Mainnet program: <code className="font-mono text-pot-green text-xs break-all">GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK</code>
        </p>
        <p className="mt-2">
          Submission writeup: <Link href="/" className="text-pot-accent hover:text-white">potbot.fun</Link> ·
          Repo: <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="text-pot-accent hover:text-white">github.com/YD811/potbot-v2</a>
        </p>
      </footer>
    </div>
  )
}
