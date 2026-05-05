'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePots } from '@/hooks/usePots'
import { useSolPrice } from '@/lib/prices'

const FEATURES = [
  {
    icon: '🪴',
    title: 'Group Treasury (POT)',
    status: 'Live on devnet',
    desc: 'Pool SOL with your group into a shared on-chain treasury. Every member holds SPL-tokenized shares proportional to NAV — no middleman, no custody risk.',
  },
  {
    icon: '🏛️',
    title: 'On-Chain Governance',
    status: 'Live on devnet',
    desc: 'Every trade, withdrawal or strategy change requires a vote. Autocracy → Advisory → Majority → Supermajority → Consensus. Configure quorum, approval %, timelock.',
  },
  {
    icon: '🤖',
    title: 'AI Execution (BOT)',
    status: 'Focus for Frontier',
    desc: 'Set IF/THEN rules — "if SOL drops 5%, buy 10%." The MCP-native agent creates proposals and executes after votes pass. Any LLM can drive it.',
  },
  {
    icon: '🆔',
    title: 'SNS Identity — .potbot.sol',
    status: 'Next',
    desc: 'Every group gets a readable on-chain identity: amsterdam-alpha.potbot.sol. Reverse-lookup works across Solana apps. Agents get agent.{pot}.potbot.sol.',
  },
  {
    icon: '🌱',
    title: 'Money Tree evolution',
    status: 'Gamified layer',
    desc: 'Your treasury grows 🌱 Seedling → 🌿 Sprout → 🍀 Bud → 🌾 Bloom → 🌺 Full Bloom → 🌳 Mature Tree. Higher levels unlock lower fees and perks.',
  },
  {
    icon: '🥷',
    title: 'Privacy layer (STAMPPOT)',
    status: 'Later',
    desc: 'Optional per-pot: wrap deposits in PrivacyCash ZK proofs. Public governance, private balances. Transparent on demand.',
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

/* ------------------------------------------------------------------ */
/*  Product mockup with 3-D tilt + gentle auto-rotation                */
/* ------------------------------------------------------------------ */
function LiveVaultMockup() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-white mb-3">
          See your vault <span className="text-pot-green">at a glance</span>
        </h2>
        <p className="text-pot-muted max-w-xl mx-auto">
          Every pot is a Solana program account. TVL, quorum, active proposals —
          all live on-chain, all visible to every member.
        </p>
      </div>

      <div className="potbot-mock-wrap">
        {/* glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(20,241,149,0.14) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
        <div className="potbot-mock">
          <div className="potbot-mock-chrome">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <div className="url">potbot.fun/pot/AmsterdamDAO</div>
          </div>
          <div className="potbot-mock-body">
            <div className="potbot-mock-vault">
              <div className="vault-head">
                <div className="vault-name">
                  <div className="plant">🌿</div>
                  <div>
                    <div className="title">Amsterdam DAO Pot</div>
                    <div className="sub">Sprout · 7 members</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tvl">48.3 SOL</div>
                  <div className="sub">~ $6,920</div>
                </div>
              </div>

              <div className="stats">
                <div className="stat">
                  <div className="lbl">NAV</div>
                  <div className="val">1.072</div>
                </div>
                <div className="stat">
                  <div className="lbl">Quorum</div>
                  <div className="val">5/7</div>
                </div>
                <div className="stat">
                  <div className="lbl">30d</div>
                  <div className="val up">+7.2%</div>
                </div>
              </div>

              <div className="proposal">
                <div className="proposal-head">
                  <div className="proposal-title">Swap 5 SOL → JUP (agent)</div>
                  <span className="badge">Voting · 4h left</span>
                </div>
                <div className="bar"><div className="fill" /></div>
                <div className="vote-row">
                  <span>Yes 5 · No 1</span>
                  <span>72% · pass at 70%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .potbot-mock-wrap {
          position: relative;
          max-width: 720px;
          margin: 0 auto;
          perspective: 1400px;
        }
        .potbot-mock {
          position: relative;
          z-index: 1;
          border-radius: 20px;
          overflow: hidden;
          background: var(--c-card);
          border: 1px solid var(--c-border-2);
          box-shadow:
            0 40px 80px var(--c-surface-shadow),
            0 0 0 1px rgba(20,241,149,0.08) inset;
          transform-style: preserve-3d;
          transform-origin: 50% 50%;
          animation: potbot-tilt 9s ease-in-out infinite;
          transition: transform 0.6s cubic-bezier(0.2,0.8,0.2,1);
        }
        .potbot-mock:hover {
          animation-play-state: paused;
          transform: perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1.015);
        }
        @keyframes potbot-tilt {
          0%   { transform: perspective(1400px) rotateX(4deg)  rotateY(-10deg); }
          50%  { transform: perspective(1400px) rotateX(-3deg) rotateY(8deg); }
          100% { transform: perspective(1400px) rotateX(4deg)  rotateY(-10deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .potbot-mock { animation: none; transform: none; }
        }

        .potbot-mock-chrome {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px;
          background: var(--c-card-2);
          border-bottom: 1px solid var(--c-border);
        }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot.r { background: #FF5F56; }
        .dot.y { background: #FFBD2E; }
        .dot.g { background: #27C93F; }
        .url {
          flex: 1; text-align: center;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          color: var(--c-muted);
        }

        .potbot-mock-body { padding: 24px; }

        .potbot-mock-vault {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 14px;
          padding: 22px;
        }
        .vault-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .vault-name { display: flex; align-items: center; gap: 10px; }
        .plant {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(20,241,149,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
        }
        .title { font-weight: 700; font-size: 15px; color: var(--c-text); text-align: left; }
        .sub { font-size: 11px; color: var(--c-muted); text-align: left; }
        .tvl {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 700; font-size: 18px;
          color: var(--c-brand-green);
        }

        .stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 10px; margin-bottom: 18px;
        }
        .stat {
          background: var(--c-card-2);
          border-radius: 10px;
          padding: 10px 12px;
          text-align: left;
        }
        .lbl {
          font-size: 10px; color: var(--c-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .val {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 700; font-size: 14px; color: var(--c-text);
          margin-top: 2px;
        }
        .val.up { color: var(--c-brand-green); }

        .proposal {
          background: var(--c-card-2);
          border: 1px solid var(--c-border);
          border-radius: 12px;
          padding: 14px;
        }
        .proposal-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .proposal-title { font-size: 13px; font-weight: 600; color: var(--c-text); text-align: left; }
        .badge {
          font-size: 10px; padding: 3px 8px; border-radius: 6px;
          background: rgba(20,241,149,0.1); color: var(--c-brand-green);
          font-weight: 700;
        }
        .bar {
          height: 8px; background: var(--c-bg);
          border-radius: 999px; overflow: hidden;
          margin-bottom: 8px;
        }
        .fill {
          height: 100%; width: 0;
          background: linear-gradient(135deg, var(--c-brand-green) 0%, var(--c-brand-accent) 100%);
          border-radius: 999px;
          animation: fill 2.2s cubic-bezier(0.2,0.8,0.2,1) forwards;
        }
        @keyframes fill { to { width: 72%; } }
        .vote-row {
          display: flex; justify-content: space-between;
          font-size: 11px; color: var(--c-muted);
        }
      `}</style>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Claude chat mockup — "Ask Claude to manage your vault"             */
/* ------------------------------------------------------------------ */
function AskClaudeChat() {
  return (
    <div className="claude-chat">
      <div className="claude-head">
        <div className="claude-brand">
          <div className="claude-logo">✻</div>
          <div>
            <div className="claude-name">Claude</div>
            <div className="claude-sub">connected to potbot-mcp · devnet</div>
          </div>
        </div>
        <span className="claude-pill">Live</span>
      </div>

      <div className="claude-body">
        <div className="bubble bubble-user">
          Hey Claude, if SOL drops below <strong>$130</strong>, propose buying 10% more
          using the Amsterdam DAO vault balance.
        </div>

        <div className="bubble bubble-claude">
          <div className="claude-think">Checking SOL price via Pyth…</div>
          <div className="claude-tool">
            <span className="tool-label">Tool call</span>
            <code>
              create_swap_proposal({'{'}<br />
              &nbsp;&nbsp;pot: <span className="s">"AmsterdamDAO"</span>,<br />
              &nbsp;&nbsp;trigger: <span className="s">"SOL &lt; 130 USD"</span>,<br />
              &nbsp;&nbsp;inputMint: USDC, outputMint: SOL,<br />
              &nbsp;&nbsp;amount: vault.<span className="fn">pct</span>(<span className="s">"10%"</span>),<br />
              {'}'})
            </code>
          </div>
          <div className="claude-result">
            ✓ Proposal <strong>#42</strong> drafted. Members notified.
            Voting closes in 4h.
          </div>
        </div>
      </div>

      <style jsx>{`
        .claude-chat {
          max-width: 640px;
          margin: 0 auto;
          background: var(--c-card);
          border: 1px solid var(--c-border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 30px 60px var(--c-surface-shadow);
        }
        .claude-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px;
          background: linear-gradient(180deg, var(--c-card-2) 0%, var(--c-card) 100%);
          border-bottom: 1px solid var(--c-border);
        }
        .claude-brand { display: flex; align-items: center; gap: 12px; }
        .claude-logo {
          width: 32px; height: 32px; border-radius: 8px;
          background: #D97757; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700;
        }
        .claude-name { font-weight: 700; color: var(--c-text); font-size: 14px; }
        .claude-sub {
          font-size: 11px; color: var(--c-muted);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .claude-pill {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          padding: 3px 10px; border-radius: 999px;
          background: rgba(20,241,149,0.12); color: var(--c-brand-green);
          text-transform: uppercase;
        }
        .claude-body {
          padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .bubble {
          padding: 14px 16px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.5;
          max-width: 92%;
        }
        .bubble-user {
          align-self: flex-end;
          background: rgba(153,69,255,0.12);
          border: 1px solid rgba(153,69,255,0.25);
          color: var(--c-text);
        }
        .bubble-claude {
          align-self: flex-start;
          background: var(--c-card-2);
          border: 1px solid var(--c-border);
          color: var(--c-text-soft);
        }
        .claude-think {
          font-size: 12px; color: var(--c-muted);
          font-style: italic; margin-bottom: 10px;
        }
        .claude-tool {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }
        .tool-label {
          display: inline-block; font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--c-brand-accent); margin-bottom: 6px;
        }
        .claude-tool code {
          display: block;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11.5px; line-height: 1.6;
          color: var(--c-text-soft);
          white-space: pre-wrap;
        }
        .claude-tool .s { color: var(--c-brand-green); }
        .claude-tool .fn { color: #58A6FF; }
        .claude-result {
          font-size: 13px; color: var(--c-brand-green);
          padding-top: 4px;
        }
      `}</style>
    </div>
  )
}

function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  if (value === 0) return <span className="text-pot-muted">—</span>
  return <>{prefix}{value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toLocaleString()}{suffix}</>
}

function WaitlistSection() {
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
          Early members get lower fees, founding member NFT badge, and priority access to Strategy Vaults.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/signup" className="btn-primary text-base px-8 py-3 glow-green flex items-center gap-2">
            🚀 Get Early Access
          </Link>
          <Link href="/create" className="btn-secondary text-base px-6 py-3 flex items-center gap-2">
            🪴 Try devnet first
          </Link>
        </div>
        <p className="text-pot-muted/50 text-xs mt-6">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}

function FrontierFocusStrip() {
  return (
    <section className="max-w-6xl mx-auto px-4 pb-10">
      <div className="card grid gap-4 p-4 sm:grid-cols-4 sm:p-5">
        {[
          { step: '01', title: 'Create a POT', desc: 'Name the vault and choose voting rules.' },
          { step: '02', title: 'Pool SOL', desc: 'Members receive NAV-based shares.' },
          { step: '03', title: 'AI proposes', desc: 'MCP rule drafts a Jupiter swap proposal.' },
          { step: '04', title: 'Group executes', desc: 'Votes pass, program signs, swap settles.' },
        ].map((item) => (
          <div key={item.step} className="rounded-xl border border-pot-border bg-pot-dark/60 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-pot-green">
              {item.step}
            </div>
            <div className="mt-1 font-bold text-white">{item.title}</div>
            <p className="mt-1 text-sm leading-snug text-pot-muted">{item.desc}</p>
          </div>
        ))}
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
      <section className="relative flex flex-col items-center text-center pt-14 pb-12 px-4 overflow-hidden">
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

          <div className="text-7xl mb-5 animate-float" aria-hidden="true">🪴</div>

          <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-4">
            Shared trading vaults<br />
            <span className="text-pot-green">run by votes</span>{' '}
            <span className="text-pot-accent">and AI proposals.</span>
          </h1>

          <p className="text-xl text-pot-muted max-w-2xl mx-auto mb-4 leading-relaxed">
            Launch a Solana vault for a group, pool funds without a custodian, let an
            MCP agent draft trades, then execute only after the members vote.
          </p>

          <p className="text-sm text-pot-muted/70 max-w-xl mx-auto mb-8">
            Frontier demo focus: create one public AI strategy vault, deposit, propose,
            vote, and execute a Jupiter swap on devnet.
          </p>

          {/* CTA buttons — only 2: primary + Follow X. Browse / Leaderboard / Connect live further down the page where they belong. */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link
              href="/signup"
              className="btn-primary text-base px-6 py-3 glow-green flex items-center gap-2"
            >
              🚀 Get Early Access
            </Link>
            <a
              href="https://x.com/PotBot_sol"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-base px-6 py-3 flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Follow on X
            </a>
            <Link
              href="/create"
              className="btn-secondary text-base px-6 py-3 flex items-center gap-2"
            >
              🪴 Try devnet (no wallet)
            </Link>
          </div>
          <p className="text-pot-muted/50 text-xs -mt-8 mb-4 text-center">
            Demo mode · no wallet needed · Solana devnet
          </p>

          {/* Live protocol stats — only shown when data is real */}
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

      <FrontierFocusStrip />

      {/* ── Trust & Risk ── */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { k: 'Network', v: 'Solana Devnet', sub: 'Live · Mainnet Q3 2026' },
            { k: 'Custody', v: 'Program-controlled vaults', sub: 'No bot-held treasury keys' },
            { k: 'Execution', v: 'Vote-gated actions', sub: 'AI proposes, members approve' },
            { k: 'Status', v: 'Live API health', sub: 'Public endpoint: /api/health' },
          ].map((item) => (
            <div key={item.k} className="card p-4">
              <div className="text-[11px] uppercase tracking-wider text-pot-muted">{item.k}</div>
              <div className="text-white font-bold mt-1">{item.v}</div>
              <div className="text-xs text-pot-muted mt-1">{item.sub}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-pot-muted mt-4 text-center">
          Risk disclosure: DeFi strategies can lose principal. Start with demo mode and small sizes.
        </p>
        <div className="text-center mt-2">
          <Link href="/status" className="text-xs text-pot-green hover:underline">
            View public status checks →
          </Link>
        </div>
      </section>

      {/* ── Live vault mockup ── */}
      <LiveVaultMockup />

      {/* ── Features grid ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-3">Everything your trading group needs</h2>
          <p className="text-pot-muted max-w-xl mx-auto">One protocol. Group governance, AI automation, creator monetization, and DeFi yield — all composable on Solana.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 hover:border-pot-green/20 transition-all group">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="text-3xl group-hover:animate-float" aria-hidden="true">{f.icon}</div>
                <span className="rounded-full border border-pot-border bg-pot-dark px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-pot-muted">
                  {f.status}
                </span>
              </div>
              <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-pot-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Secondary CTAs — the ones we removed from the hero live here, in context */}
        <div className="flex flex-wrap gap-3 justify-center mt-10">
          <Link href="/vaults" className="btn-secondary text-sm px-5 py-2.5">
            ⚡ Browse Strategy Vaults
          </Link>
          <Link href="/leaderboard" className="btn-secondary text-sm px-5 py-2.5">
            🏆 Leaderboard
          </Link>
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

      {/* ── Why now / Why crypto / How we earn ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-3">Why PotBot, why now</h2>
          <p className="text-pot-muted max-w-2xl mx-auto">
            Three honest questions, three direct answers.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="text-2xl mb-3">🔓</div>
            <h3 className="font-bold text-white text-lg mb-2">Why crypto, not a database</h3>
            <p className="text-pot-muted text-sm leading-relaxed">
              Group custody without a trusted middleman. The vault <em>is</em> the on-chain
              account — every deposit, vote and trade is signed by the program itself.
              A database can&apos;t enforce that without re-introducing the operator we&apos;re
              removing.
            </p>
          </div>
          <div className="card p-6">
            <div className="text-2xl mb-3">⏰</div>
            <h3 className="font-bold text-white text-lg mb-2">Why now</h3>
            <p className="text-pot-muted text-sm leading-relaxed">
              MCP standardised how AI agents connect to real systems. Solana ships
              the throughput, Jupiter the routing, Pyth the prices. The full
              agent-driven group-trading stack exists in 2026 — and the coordination
              layer hasn&apos;t shipped. We&apos;re shipping it.
            </p>
          </div>
          <div className="card p-6">
            <div className="text-2xl mb-3">💰</div>
            <h3 className="font-bold text-white text-lg mb-2">How we earn</h3>
            <p className="text-pot-muted text-sm leading-relaxed">
              <strong className="text-white">0.30%</strong> fee on every swap routed
              through a pot. <strong className="text-white">10% performance fee</strong>{' '}
              on Strategy Vaults, split with the strategy creator. No token, no
              airdrop farming. If usage is zero, revenue is zero — honest unit
              economics.
            </p>
          </div>
        </div>
      </section>

      {/* ── Privacy layer (STAMPPOT) ── */}
      <section className="bg-gradient-to-br from-pot-accent/10 to-pot-card border-y border-pot-border py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-pot-dark border border-pot-accent/30 rounded-full px-4 py-1.5 text-xs text-pot-accent mb-4">
                🥷 STAMPPOT · Privacy layer
              </div>
              <h2 className="text-3xl font-black text-white mb-3">
                Public governance, <span className="text-pot-accent">private balances</span>
              </h2>
              <p className="text-pot-muted leading-relaxed mb-4">
                Retail investors don't want their wallet tracked every time they join a
                pot. STAMPPOT wraps deposits in <strong className="text-white">
                PrivacyCash ZK proofs</strong> — members prove shares ownership without
                exposing their address. Governance votes and swaps still settle on-chain
                publicly; only the wallet-to-share link is hidden.
              </p>
              <p className="text-pot-muted text-sm">
                Opt-in per pot. Transparency on demand.
              </p>
            </div>
            <div className="bg-pot-dark border border-pot-border rounded-2xl p-6 font-mono text-xs">
              <div className="text-pot-muted mb-2">// What an auditor sees</div>
              <div className="text-pot-green">✓ Pot treasury: <span className="text-white">184 SOL</span></div>
              <div className="text-pot-green">✓ Members: <span className="text-white">12</span></div>
              <div className="text-pot-green">✓ Last trade: <span className="text-white">SOL → JUP, 8m ago</span></div>
              <div className="text-pot-muted mt-3">// What stays private</div>
              <div className="text-pot-accent">✗ Which wallet owns which shares</div>
              <div className="text-pot-accent">✗ Individual deposit timing</div>
              <div className="text-pot-accent">✗ Exit amounts per member</div>
            </div>
          </div>
        </div>
      </section>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
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

          {/* Ask Claude — expanded into a real chat UI */}
          <AskClaudeChat />
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


    </div>
  )
}
