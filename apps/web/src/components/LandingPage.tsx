'use client'

import Link from 'next/link'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { usePots } from '@/hooks/usePots'
import { useSolPrice } from '@/lib/prices'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

const FEATURES = [
  {
    icon: '🏦',
    title: 'Group Vaults',
    desc: 'Pool SOL with friends into a shared on-chain vault. Every member gets proportional shares — like a crypto ETF.',
  },
  {
    icon: '🏛️',
    title: 'On-Chain Governance',
    desc: 'Every trade, withdrawal or strategy change requires a vote. Configure quorum, approval %, and voting windows.',
  },
  {
    icon: '🤖',
    title: 'AI Trading Agent',
    desc: 'Set IF/THEN rules — "if SOL drops 5%, buy 10%". The MCP-native agent creates proposals and votes automatically.',
  },
  {
    icon: '🪙',
    title: 'Tokenized Shares',
    desc: 'Deposit SOL → receive SPL tokens at current NAV. Redeem anytime. Trade shares on-chain like a real ETF.',
  },
  {
    icon: '🌱',
    title: 'Tamagotchi Plant',
    desc: 'Your vault grows from 🌱 Seedling to 🌳 Mature Tree. Higher levels unlock lower swap fees and exclusive benefits.',
  },
  {
    icon: '💰',
    title: 'Creator Economy',
    desc: 'Launch a Strategy Vault, set entry/performance fees, and earn from investors following your strategy.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create a vault',
    desc: 'Choose a name, emoji, governance level (from autocracy to full consensus), and yield strategy. Takes 30 seconds.',
    color: 'text-pot-green',
    border: 'border-pot-green/30',
  },
  {
    step: '02',
    title: 'Members deposit',
    desc: 'Anyone sends SOL to the vault address — anonymously if needed. They receive shares proportional to the current NAV.',
    color: 'text-pot-accent',
    border: 'border-pot-accent/30',
  },
  {
    step: '03',
    title: 'Trade together',
    desc: 'Members propose swaps via Jupiter. AI agents create proposals automatically. Shares of vault determine voting power.',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
  },
]

const FOR_BUILDERS = [
  { icon: '🔌', title: 'MCP Server', desc: '60+ on-chain actions via Model Context Protocol. Any LLM can control the vault.', href: '/for-agents' },
  { icon: '📦', title: 'TypeScript SDK', desc: 'Full SDK for vault creation, governance, trading, and analytics.', href: 'https://github.com/YD811/potbot-v2/tree/main/packages/sdk' },
  { icon: '⚡', title: 'REST API', desc: 'Price oracle, PnL engine, leaderboard — all available as public API endpoints.', href: '/api/leaderboard' },
]

function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  if (value === 0) return <span className="text-pot-muted">—</span>
  return <>{prefix}{value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toLocaleString()}{suffix}</>
}

function WaitlistSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'landing' }),
      })
      const data = await res.json()
      if (!res.ok) { setStatus('error'); return }
      setStatus(data.alreadyRegistered ? 'duplicate' : 'success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="bg-gradient-to-r from-pot-accent/10 via-pot-card to-pot-green/10 border-y border-pot-border py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-pot-dark border border-pot-border rounded-full px-4 py-1.5 text-xs text-pot-muted mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-pot-accent animate-pulse inline-block" />
          Mainnet launching soon
        </div>
        <h2 className="text-3xl font-black text-white mb-3">
          Get early access to <span className="text-pot-green">PotBot</span>
        </h2>
        <p className="text-pot-muted mb-8 max-w-lg mx-auto">
          Be the first to know when mainnet launches. Early members get lower fees, founding member NFT badge, and priority access to Strategy Vaults.
        </p>

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">🎉</div>
            <p className="text-pot-green font-bold text-lg">You're on the list!</p>
            <p className="text-pot-muted text-sm">We'll email you when mainnet goes live.</p>
            <Link
              href="/signup"
              className="text-xs text-pot-accent hover:underline mt-2"
            >
              Want the founding-member NFT? Add your wallet →
            </Link>
          </div>
        ) : status === 'duplicate' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">✅</div>
            <p className="text-white font-bold text-lg">Already registered!</p>
            <p className="text-pot-muted text-sm">You're already on the waitlist. We'll reach out soon.</p>
            <Link
              href="/signup"
              className="text-xs text-pot-accent hover:underline mt-2"
            >
              Update your profile (twitter / wallet) →
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="input flex-1 py-3 px-4 text-base"
                disabled={status === 'loading'}
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="btn-primary px-6 py-3 text-base whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : (
                  '🚀 Join Waitlist'
                )}
              </button>
            </form>

            {/* Fuller signup CTA */}
            <div className="mt-6 text-sm text-pot-muted">
              Want founding-member perks (NFT badge, lower fees)?{' '}
              <Link
                href="/signup"
                className="text-pot-green font-semibold hover:underline inline-flex items-center gap-1"
              >
                Full sign-up →
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <p className="text-red-400 text-sm mt-3">Something went wrong. Try again or DM us on X.</p>
        )}

        <p className="text-pot-muted/50 text-xs mt-4">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const { data: pots } = usePots()
  const { price: solPrice } = useSolPrice()

  const totalTvlSol = pots?.reduce((s, p) => s + p.balance, 0) ?? 0
  const totalTvlUsd = solPrice ? totalTvlSol * solPrice : 0
  const totalMembers = pots?.reduce((s, p) => s + p.memberCount, 0) ?? 0
  const totalTrades = pots?.reduce((s, p) => s + p.tradeCount, 0) ?? 0
  const topVaults = [...(pots ?? [])].sort((a, b) => b.balance - a.balance).slice(0, 3)

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center text-center pt-16 pb-20 px-4 overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pot-green/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-pot-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-pot-card border border-pot-border rounded-full px-4 py-1.5 text-xs text-pot-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-pot-green animate-pulse inline-block" />
            Built for Solana Frontier 2026 · Open source
          </div>

          <div className="text-8xl mb-6 animate-float">🪴</div>

          <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-4">
            Group DeFi Vaults<br />
            <span className="text-pot-green">on Solana</span>
          </h1>

          <p className="text-xl text-pot-muted max-w-2xl mx-auto mb-4 leading-relaxed">
            Pool SOL with your community. Vote on trades together. Let AI agents automate your strategy 24/7.
          </p>

          <p className="text-sm text-pot-muted/70 italic max-w-xl mx-auto mb-8">
            For teams who'd rather decide together than argue in group chats.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            {/* Primary CTA — the new signup page */}
            <Link
              href="/signup"
              className="btn-primary text-base px-6 py-3 glow-green flex items-center gap-2"
            >
              🚀 Get Early Access
            </Link>
            <WalletMultiButton />
            <Link href="/vaults" className="btn-secondary text-base px-6 py-3">
              ⚡ Browse Strategy Vaults
            </Link>
            <Link href="/leaderboard" className="btn-secondary text-base px-6 py-3">
              🏆 Leaderboard
            </Link>
            <a
              href="https://x.com/PotBot_sol"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-base px-6 py-3 flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Follow
            </a>
          </div>

          {/* Live protocol stats */}
          {totalTvlSol > 0 && (
            <div className="inline-flex flex-wrap items-center gap-0 bg-pot-card border border-pot-border rounded-2xl overflow-hidden shadow-xl">
              {[
                {
                  label: 'Total Value Locked',
                  value: totalTvlUsd > 0
                    ? `$${totalTvlUsd >= 1000 ? (totalTvlUsd / 1000).toFixed(1) + 'K' : totalTvlUsd.toFixed(0)}`
                    : `${totalTvlSol.toFixed(1)} SOL`,
                  color: 'text-pot-green',
                },
                { label: 'Active Vaults', value: String(pots?.length ?? 0), color: 'text-white' },
                { label: 'Members', value: String(totalMembers), color: 'text-white' },
                { label: 'Total Trades', value: String(totalTrades), color: 'text-pot-accent' },
                {
                  label: 'TVL POTs',
                  value: totalTvlUsd > 0
                    ? `$${totalTvlUsd >= 1000 ? (totalTvlUsd / 1000).toFixed(1) + 'K' : totalTvlUsd.toFixed(0)}`
                    : '—',
                  color: 'text-pot-green',
                },
              ].map((s, i, arr) => (
                <div key={s.label} className={`px-6 py-4 text-center ${i < arr.length - 1 ? 'border-r border-pot-border' : ''}`}>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-pot-muted mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-3">Everything your trading group needs</h2>
          <p className="text-pot-muted max-w-xl mx-auto">One protocol. Group governance, AI automation, creator monetization, and DeFi yield — all composable on Solana.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 hover:border-pot-green/20 transition-all group">
              <div className="text-3xl mb-3 group-hover:animate-float">{f.icon}</div>
              <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-pot-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Plant evolution strip ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="card p-6 bg-gradient-to-r from-pot-green/5 via-pot-card to-pot-accent/5">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Watch your vault grow</h3>
            <p className="text-pot-muted text-sm">Every trade, every member — your Tamagotchi plant levels up</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { emoji: '🌱', label: 'Seedling', tier: 'L1' },
              { emoji: '🌿', label: 'Sprout', tier: 'L2' },
              { emoji: '🍀', label: 'Bud', tier: 'L3' },
              { emoji: '🌾', label: 'Bloom', tier: 'L4' },
              { emoji: '🌺', label: 'Full Bloom', tier: 'L5' },
              { emoji: '🌳', label: 'Mature Tree', tier: 'L6' },
            ].map((stage) => (
              <div key={stage.label} className="text-center">
                <div className="text-4xl mb-1">{stage.emoji}</div>
                <div className="text-xs font-bold text-white">{stage.label}</div>
                <div className="text-[10px] text-pot-muted">{stage.tier}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-pot-card border-y border-pot-border py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">How it works</h2>
            <p className="text-pot-muted">From zero to a fully governed trading vault in minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className={`rounded-2xl border ${step.border} bg-pot-dark p-6 relative`}>
                <div className={`text-5xl font-black ${step.color} opacity-20 absolute top-4 right-5`}>{step.step}</div>
                <div className={`text-sm font-bold ${step.color} mb-2`}>Step {step.step}</div>
                <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-pot-muted text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top vaults ── */}
      {topVaults.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-white">Top Vaults</h2>
              <p className="text-pot-muted text-sm mt-1">Best performing community vaults this week</p>
            </div>
            <Link href="/leaderboard" className="btn-secondary text-sm">
              Full Leaderboard →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topVaults.map((pot, i) => {
              const balanceUsd = solPrice ? pot.balance * solPrice : 0
              const medals = ['🥇', '🥈', '🥉']
              return (
                <Link
                  key={pot.pubkey}
                  href={`/pots/${pot.pubkey}`}
                  className="card p-5 hover:border-pot-green/30 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{medals[i]}</span>
                    <span className="text-2xl group-hover:animate-float">{pot.emoji}</span>
                    <div>
                      <div className="font-bold text-white">{pot.name}</div>
                      <div className="text-xs text-pot-muted">{pot.memberCount} members</div>
                    </div>
                  </div>
                  <div className="text-xl font-black text-pot-green">{pot.balance.toFixed(2)} SOL</div>
                  {balanceUsd > 0 && (
                    <div className="text-xs text-pot-muted">≈ ${balanceUsd >= 1000 ? (balanceUsd / 1000).toFixed(1) + 'K' : balanceUsd.toFixed(0)}</div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pot-green/10 text-pot-green">{pot.isPublic ? 'Public' : 'Private'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pot-border text-pot-muted">L{pot.governanceLevel} Gov</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── For builders ── */}
      <section className="bg-gradient-to-b from-pot-card to-pot-dark border-y border-pot-border py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-pot-dark border border-pot-border rounded-full px-4 py-1.5 text-xs text-pot-accent mb-4">
              🔌 MCP-Native Protocol
            </div>
            <h2 className="text-3xl font-black text-white mb-3">Built for AI Agents & Developers</h2>
            <p className="text-pot-muted max-w-lg mx-auto">Any LLM can control PotBot vaults via the MCP server. Claude, GPT, or your own agent — 60+ on-chain actions available.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {FOR_BUILDERS.map((item) => (
              <a
                key={item.title}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                className="card p-5 hover:border-pot-accent/30 transition-all group"
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <div className="font-bold text-white mb-1 group-hover:text-pot-accent transition">{item.title}</div>
                <div className="text-sm text-pot-muted">{item.desc}</div>
              </a>
            ))}
          </div>

          {/* Code snippet teaser */}
          <div className="bg-pot-dark border border-pot-border rounded-2xl p-5 font-mono text-sm max-w-2xl mx-auto">
            <div className="text-pot-muted text-xs mb-3">// Ask Claude to manage your vault</div>
            <div className="text-pot-green">{"\"Hey Claude, if SOL drops below $130,"}</div>
            <div className="text-pot-green pl-4">{"propose buying 10% more using the vault balance\""}</div>
            <div className="text-pot-muted mt-2 text-xs">→ Claude calls <span className="text-pot-accent">create_swap_proposal</span> via MCP → members vote → executed on-chain</div>
          </div>
        </div>
      </section>

      {/* ── Waitlist ── */}
      <WaitlistSection />

      {/* ── Final CTA ── */}
      <section className="max-w-3xl mx-auto text-center px-4 py-20">
        <div className="text-6xl mb-6 animate-float">🪴</div>
        <h2 className="text-4xl font-black text-white mb-4">
          Ready to trade together?
        </h2>
        <p className="text-pot-muted text-lg mb-8">
          Create your vault in under a minute. No coding required.
          Open source and free to use on Solana devnet.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/signup" className="btn-primary text-lg px-8 py-4 glow-green">
            🚀 Get Early Access
          </Link>
          <Link href="/create" className="btn-secondary text-lg px-8 py-4">
            🪴 Create Your Vault
          </Link>
          <a
            href="https://github.com/YD811/potbot-v2"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-lg px-8 py-4"
          >
            ⭐ Star on GitHub
          </a>
        </div>
        <p className="text-pot-muted/50 text-xs mt-6">
          Demo mode active — no wallet needed to explore · Built on Solana devnet
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-pot-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-pot-muted">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪴</span>
            <span className="font-semibold text-white">PotBot v2</span>
            <span>· Group DeFi Vaults on Solana</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/signup" className="hover:text-pot-green transition">Early Access</Link>
            <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
            <Link href="/vaults" className="hover:text-white transition">Vaults</Link>
            <Link href="/for-agents" className="hover:text-white transition">For Agents</Link>
            <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub</a>
            <a href="https://x.com/PotBot_sol" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @PotBot_sol
            </a>
            <a href="https://t.me/PotBot_v1_bot" target="_blank" rel="noreferrer" className="hover:text-pot-accent transition">
              PotBot v1 (Telegram)
            </a>
          </div>
          <div>Built for Solana Frontier 2026</div>
        </div>
      </footer>

    </div>
  )
}
