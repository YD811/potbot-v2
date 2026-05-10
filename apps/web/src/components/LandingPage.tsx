'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePots } from '@/hooks/usePots'
import { useSolPrice } from '@/lib/prices'
import { useTheme } from '@/contexts/ThemeContext'
import { useHumanText } from '@/hooks/useHumanText'

interface FeatureCard {
  icon: string
  title: string
  status: string
  desc: string
}

const FEATURES_CRYPTO: FeatureCard[] = [
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

const FEATURES_NORMIE: FeatureCard[] = [
  {
    icon: '🪴',
    title: 'Shared pot',
    status: 'Test mode',
    desc: 'Add money to a single pot with your group. Everyone gets a slice that matches what they put in. No middleman holds it.',
  },
  {
    icon: '🏛️',
    title: 'Group decisions',
    status: 'Test mode',
    desc: 'Every trade or change goes to a vote. Pick how strict the rules are — from "creator decides" all the way to "everyone has to agree".',
  },
  {
    icon: '🤖',
    title: 'AI helper',
    status: 'Coming soon',
    desc: 'Set simple rules — "if the price drops 5%, suggest buying more." The AI writes the trade idea, the group still decides.',
  },
  {
    icon: '🆔',
    title: 'Easy name for your pot',
    status: 'Next',
    desc: 'Each pot can have a friendly name like amsterdam-alpha.potbot.sol instead of a long random address.',
  },
  {
    icon: '🌱',
    title: 'A plant that grows',
    status: 'Game layer',
    desc: 'Your pot has a plant that grows from a seedling to a full tree as your group is active. Higher levels unlock perks and lower fees.',
  },
  {
    icon: '🥷',
    title: 'Private mode',
    status: 'Later',
    desc: 'Want to keep your strategy to yourselves? Turn on private mode. Members and amounts stay hidden, group decisions still happen.',
  },
]

// HOW_IT_WORKS const was removed — the steps block is now inlined with
// the actual 4-step pot lifecycle (deposit → propose → vote → execute)
// directly in the section body so the page mirrors the on-pot UI.

const FOR_BUILDERS = [
  { icon: '🔌', title: 'MCP Server', desc: '60+ on-chain actions via Model Context Protocol. Any LLM can control the vault.', href: '/for-agents' },
  { icon: '📦', title: 'TypeScript SDK', desc: 'Full SDK for vault creation, governance, trading, and analytics.', href: 'https://github.com/YD811/potbot-v2/tree/main/packages/sdk' },
  { icon: '⚡', title: 'REST API', desc: 'Price oracle, PnL engine, leaderboard — all available as public API endpoints.', href: '/api/leaderboard' },
]

/* ------------------------------------------------------------------ */
/*  Product mockup with 3-D tilt + gentle auto-rotation                */
/* ------------------------------------------------------------------ */
function LiveVaultMockup() {
  const { isLight } = useTheme()
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-white mb-3">
          {isLight ? (
            <>See your pot <span className="text-pot-green">at a glance</span></>
          ) : (
            <>See your vault <span className="text-pot-green">at a glance</span></>
          )}
        </h2>
        <p className="text-white/75 max-w-xl mx-auto text-base">
          {isLight
            ? 'How much money is in. Who has voted. What is being decided. Everyone in the pot sees the same thing, in real time.'
            : 'Every pot is a Solana program account. TVL, quorum, active proposals — all live onchain, all visible to every member.'}
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

// WaitlistSection and FrontierFocusStrip were removed:
//   - WaitlistSection duplicated the final CTA at the bottom of the page.
//   - FrontierFocusStrip was a 4-step compressed teaser that overlapped
//     with the new full "How it works" section directly below the hero.
// Both deletions consolidate the "what" of the protocol into one place
// instead of three near-identical cards.

export default function LandingPage() {
  const { data: pots } = usePots()
  const { price: solPrice } = useSolPrice()
  const { isLight } = useTheme()
  const t = useHumanText()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const potRows = (pots ?? []) as any[]
  const totalTvlSol = potRows.reduce((s, p) => s + p.balance, 0)
  const totalTvlUsd = solPrice ? totalTvlSol * solPrice : 0
  const totalMembers = potRows.reduce((s, p) => s + p.memberCount, 0)
  const totalTrades = potRows.reduce((s, p) => s + p.tradeCount, 0)
  const topVaults = [...potRows].sort((a, b) => b.balance - a.balance).slice(0, 3)

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center text-center pt-8 pb-12 px-4 overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pot-green/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-pot-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Frontier badge */}
          <div className="inline-flex items-center gap-2 bg-pot-card/60 backdrop-blur border border-pot-border rounded-full px-4 py-1.5 text-[11px] font-medium text-pot-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-pot-green animate-pulse inline-block" />
            Built for Solana Frontier 2026 · Open source
          </div>

          <div className="text-7xl mb-6 animate-float" aria-hidden="true">🪴</div>

          <h1
            className="whitespace-nowrap font-black text-white leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(1.5rem, 5.5vw, 4rem)' }}
          >
            A vault for{' '}
            <span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">
              anything
            </span>{' '}
            on{' '}
            <span className="bg-gradient-to-r from-pot-accent to-pot-accent/80 bg-clip-text text-transparent">
              Solana
            </span>
            .
          </h1>

          <p className="text-lg sm:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            {isLight ? (
              <>
                A shared money pot for any group online.
                <br />
                Everyone votes. An AI helps. The money stays safe.
              </>
            ) : (
              <>
                Programmable treasuries for internet communities.
                <br />
                Owned by the group, run by an AI agent,
                <br className="hidden sm:block" />
                {' '}settled onchain.
              </>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto mb-10 text-left">
            <div
              className="group relative rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(20,241,149,0.06), rgba(20,241,149,0.01))',
                border: '1px solid rgba(20,241,149,0.25)',
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: '0 0 50px rgba(20,241,149,0.12), inset 0 0 0 1px rgba(20,241,149,0.4)' }}
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                <span className="text-2xl font-black text-pot-green">POT</span>
                <span className="text-sm font-semibold text-white">
                  Programmable On-chain Treasury
                </span>
              </div>
              <div className="text-[11px] text-pot-muted uppercase tracking-wider mb-2">
                the container
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                {isLight
                  ? 'A shared pot you and your friends own together. Add money, hold a share, take it out any time. Nobody else can touch it.'
                  : 'A program-controlled vault on Solana. Drop in SOL, USDC, LSTs, LP positions, memecoins, anything tokenized. Members hold shares, the vault holds the assets.'}
              </p>
            </div>
            <div
              className="group relative rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(153,69,255,0.06), rgba(153,69,255,0.01))',
                border: '1px solid rgba(153,69,255,0.25)',
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: '0 0 50px rgba(153,69,255,0.12), inset 0 0 0 1px rgba(153,69,255,0.4)' }}
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                <span className="text-2xl font-black text-pot-accent">BOT</span>
                <span className="text-sm font-semibold text-white">
                  Blockchain Orchestration Tool
                </span>
              </div>
              <div className="text-[11px] text-pot-muted uppercase tracking-wider mb-2">
                the AI agent
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                {isLight
                  ? 'An AI helper that suggests trades and runs them once the group says yes. Or set rules and let it vote for you.'
                  : 'Suggests trades, posts proposals, executes once the vote passes. Delegate it to vote on your behalf based on rules you set, or keep it advisory.'}
              </p>
            </div>
          </div>

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
              href="/vaults"
              className="btn-secondary text-base px-6 py-3 flex items-center gap-2"
            >
              🪴 {isLight ? 'See a live POT' : 'Explore live vault'}
            </Link>
          </div>

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

      {/* ── Mission statement — readable: white kicker, large body, no
           italics, no decorative chrome. ── */}
      <section className="relative py-24 sm:py-32 px-4 overflow-hidden">
        {/* Subtle radial backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(20,241,149,0.06), transparent 60%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(153,69,255,0.04), transparent 60%)',
          }}
        />
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 mb-10">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-pot-green/60" />
            <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-green">
              Our mission
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-pot-green/60" />
          </div>
          {isLight ? (
            <p className="text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.15] tracking-tight">
              Bring <span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">people</span> and their{' '}
              <span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">money</span> together,
              <br className="hidden sm:block" />
              in one <span className="bg-gradient-to-r from-pot-accent to-pot-accent/80 bg-clip-text text-transparent">shared pot</span>,
              <br className="hidden sm:block" />
              with an <span className="bg-gradient-to-r from-pot-accent to-pot-accent/80 bg-clip-text text-transparent">AI helper</span>.
            </p>
          ) : (
            <p className="text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.15] tracking-tight">
              Unite <span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">people</span> and{' '}
              <span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">capital</span>{' '}
              across every direction Solana offers,
              <br className="hidden sm:block" />
              as <span className="bg-gradient-to-r from-pot-accent to-pot-accent/80 bg-clip-text text-transparent">vault infrastructure</span> for tokenized funds,
              <br className="hidden sm:block" />
              built natively for <span className="bg-gradient-to-r from-pot-accent to-pot-accent/80 bg-clip-text text-transparent">AI agents</span>.
            </p>
          )}
        </div>
      </section>

      {/* ── Two pot modes — promoted up the page so it sits right after
           the mission, before the step-by-step protocol mechanics. ── */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 40% 40% at 25% 50%, rgba(20,241,149,0.05), transparent 60%), radial-gradient(ellipse 40% 40% at 75% 50%, rgba(153,69,255,0.05), transparent 60%)',
          }}
        />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-green">
                Two pot modes
              </span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-green/60" />
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.15] tracking-tight">
              {isLight ? 'Open or private. ' : 'Social-Fi or Privacy. '}
              <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
                {isLight ? 'Your call.' : 'Pick per pot.'}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PUBLIC / Social-Fi */}
            <div
              className="group relative rounded-3xl p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(20,241,149,0.06), rgba(20,241,149,0.01))',
                border: '1px solid rgba(20,241,149,0.25)',
                boxShadow: '0 0 0 transparent',
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: '0 0 60px rgba(20,241,149,0.12), inset 0 0 0 1px rgba(20,241,149,0.4)' }}
              />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(20,241,149,.12)', boxShadow: '0 0 24px rgba(20,241,149,.2)' }}
                >
                  🌐
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full border"
                  style={{ background: 'rgba(20,241,149,.12)', borderColor: 'rgba(20,241,149,.3)', color: '#14F195' }}
                >
                  {isLight ? 'Open' : 'Social-Fi'}
                </span>
              </div>
              <div className="text-xl font-extrabold mb-1" style={{ color: '#14F195' }}>
                {isLight ? 'Open POT' : 'Public POT'}
              </div>
              <p className="text-base text-white/80 leading-relaxed mb-4">
                {isLight
                  ? 'Anyone can join. Real people, real money in. You can see who is in and how the pot is doing.'
                  : 'Open to anyone. Real members, real deposits, visible on the leaderboard. The proof that people actually use it is the thing that pulls more in.'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['🏆 Leaderboard', '⚔️ Duels', '🔗 Referrals', '📊 Strategy Share', '👥 Community'].map((f) => (
                  <span
                    key={f}
                    className="text-xs font-semibold px-2 py-1 rounded-full border"
                    style={{ background: 'rgba(20,241,149,.08)', borderColor: 'rgba(20,241,149,.2)', color: '#14F195' }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* PRIVATE / Privacy layer */}
            <div
              className="group relative rounded-3xl p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(153,69,255,0.06), rgba(153,69,255,0.01))',
                border: '1px solid rgba(153,69,255,0.25)',
                boxShadow: '0 0 0 transparent',
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: '0 0 60px rgba(153,69,255,0.12), inset 0 0 0 1px rgba(153,69,255,0.4)' }}
              />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(153,69,255,.12)', boxShadow: '0 0 24px rgba(153,69,255,.25)' }}
                >
                  🥷
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full border"
                  style={{ background: 'rgba(153,69,255,.12)', borderColor: 'rgba(153,69,255,.3)', color: '#9945FF' }}
                >
                  {isLight ? 'Private' : 'Privacy layer'}
                </span>
              </div>
              <div className="text-xl font-extrabold mb-1" style={{ color: '#9945FF' }}>
                {isLight ? 'Private POT' : 'Private POT (STAMPPOT)'}
              </div>
              <p className="text-base text-white/80 leading-relaxed mb-4">
                {isLight
                  ? 'For groups who want to keep their strategy to themselves. Members and amounts stay hidden, only the group can see inside.'
                  : "For groups that want their strategy to stay theirs. Deposits and members are hidden behind ZK proofs, so the alpha doesn't leak the moment you open the pot."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['🔐 ZK proofs', '🚫 No wallet doxxing', '🤝 Invite-only', '🛡 PrivacyCash', '📜 Auditor view'].map((f) => (
                  <span
                    key={f}
                    className="text-xs font-semibold px-2 py-1 rounded-full border"
                    style={{ background: 'rgba(153,69,255,.08)', borderColor: 'rgba(153,69,255,.2)', color: '#9945FF' }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — actual 4-step pot lifecycle. ── */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-muted/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-muted">
                How it works
              </span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-muted/60" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight">
              {isLight ? 'From sign-in to trade, ' : 'From deposit to execution, '}
              <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
                {isLight ? 'all in one place.' : 'fully onchain.'}
              </span>
            </h2>
          </div>

          {/* Desktop dotted connector */}
          <div className="relative">
            <div
              aria-hidden
              className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px pointer-events-none"
              style={{
                background:
                  'repeating-linear-gradient(to right, rgba(255,255,255,0.18) 0 6px, transparent 6px 12px)',
              }}
            />

            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-5">
              {(isLight
                ? [
                    {
                      n: '01',
                      title: 'Add money',
                      desc: 'Put money into the shared pot with your group. Everyone gets a slice that matches what they put in.',
                      color: '#14F195',
                      border: 'border-pot-green/30',
                    },
                    {
                      n: '02',
                      title: 'Suggest a trade',
                      desc: 'Anyone (or the AI helper) writes up a trade idea — what to buy, what to sell, how much. Nothing happens yet.',
                      color: '#9945FF',
                      border: 'border-pot-accent/30',
                    },
                    {
                      n: '03',
                      title: 'Decide together',
                      desc: 'The group votes yes or no. The bigger your slice, the bigger your vote.',
                      color: '#FCD34D',
                      border: 'border-amber-300/30',
                    },
                    {
                      n: '04',
                      title: 'Trade happens',
                      desc: 'If the group says yes, the trade runs automatically. No one person can move the money on their own.',
                      color: '#FFFFFF',
                      border: 'border-pot-border',
                    },
                  ]
                : [
                    {
                      n: '01',
                      title: 'Deposit SOL',
                      desc: 'Pool capital with your group in a single program-controlled vault. Each member gets shares proportional to their deposit.',
                      color: '#14F195',
                      border: 'border-pot-green/30',
                    },
                    {
                      n: '02',
                      title: 'Propose a swap',
                      desc: 'Anyone (or the AI agent) drafts a Jupiter swap with input mint, output mint and amount. Nothing moves yet.',
                      color: '#9945FF',
                      border: 'border-pot-accent/30',
                    },
                    {
                      n: '03',
                      title: 'Vote',
                      desc: 'Members vote yes/no with their shares. Quorum and approval thresholds are governance settings the pot picks at creation.',
                      color: '#FCD34D',
                      border: 'border-amber-300/30',
                    },
                    {
                      n: '04',
                      title: 'Execute onchain',
                      desc: 'Once a proposal passes, anyone can trigger the onchain execution. The vault PDA signs the Jupiter v6 CPI itself — no human keypair holds the funds.',
                      color: '#FFFFFF',
                      border: 'border-pot-border',
                    },
                  ]
              ).map((step) => (
                <div
                  key={step.n}
                  className={`relative rounded-2xl border ${step.border} bg-pot-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-pot-card/70`}
                >
                  {/* Step bullet on the connector */}
                  <div
                    className="hidden md:flex absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full items-center justify-center text-[10px] font-black"
                    style={{
                      background: 'var(--c-bg, #0D1117)',
                      border: `1.5px solid ${step.color}`,
                      color: step.color,
                      boxShadow: `0 0 16px ${step.color}40`,
                    }}
                  >
                    ●
                  </div>

                  <div
                    className="text-xs font-black tracking-widest mb-3"
                    style={{ color: step.color }}
                  >
                    {step.n}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2 leading-tight">{step.title}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live vault mockup — "See your vault at a glance" ── */}
      <LiveVaultMockup />

      {/* ── Features grid ── */}
      <section className="py-20 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-muted/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-muted">
                The protocol
              </span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-muted/60" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-4">
              Everything your community needs
            </h2>
            <p className="text-white/70 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
              {isLight
                ? 'One simple app. Group decisions, an AI helper, ways to earn, ways to invite friends. All in one place.'
                : 'One protocol. Group governance, AI automation, creator monetization, DeFi yield. All composable on Solana.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(isLight ? FEATURES_NORMIE : FEATURES_CRYPTO).map((f) => (
              <div
                key={f.title}
                className="group relative bg-pot-card/40 backdrop-blur-sm border border-pot-border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-pot-green/40 hover:bg-pot-card/70"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: '0 0 40px rgba(20,241,149,0.08)' }}
                />
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="text-3xl group-hover:animate-float" aria-hidden="true">{f.icon}</div>
                  <span className="rounded-full bg-pot-dark/60 border border-pot-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pot-muted">
                    {f.status}
                  </span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2 leading-tight">{f.title}</h3>
                <p className="text-white/75 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tamagotchi gamification — labelled section so the "Watch your vault grow"
           strip reads as a feature, not a random plant rail ── */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(20,241,149,0.05), transparent 60%)' }}
        />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-green">
                Garden mode
              </span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-green/60" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-4">
              Watch your vault{' '}
              <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
                grow.
              </span>
            </h2>
            <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Every deposit, vote, and member feeds the plant.
              Six stages. The streak you don&apos;t want to break.
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {[
              { emoji: '🌱', label: 'Seedling', tier: 'L1' },
              { emoji: '🌿', label: 'Sprout', tier: 'L2' },
              { emoji: '🍀', label: 'Bud', tier: 'L3' },
              { emoji: '🌾', label: 'Bloom', tier: 'L4' },
              { emoji: '🌺', label: 'Full Bloom', tier: 'L5' },
              { emoji: '🌳', label: 'Mature Tree', tier: 'L6' },
            ].map((stage, i) => (
              <div key={stage.label} className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl transition-transform hover:scale-110"
                  style={{
                    background: `rgba(20,241,149,${0.04 + i * 0.015})`,
                    border: `1px solid rgba(20,241,149,${0.15 + i * 0.04})`,
                    boxShadow: i >= 4 ? '0 0 24px rgba(20,241,149,0.25)' : 'none',
                  }}
                >
                  {stage.emoji}
                </div>
                <div className="text-xs font-bold text-white">{stage.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-pot-muted">{stage.tier}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top vaults ── */}
      {topVaults.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-20 sm:py-24">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
                <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-green">
                  Live on devnet
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight">
                Top vaults
              </h2>
              <p className="text-white/70 text-base mt-2">Best performing community vaults this week.</p>
            </div>
            <Link
              href="/leaderboard"
              className="text-sm font-semibold text-pot-green hover:text-white transition flex items-center gap-1"
            >
              Full leaderboard
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topVaults.map((pot, i) => {
              const balanceUsd = solPrice ? pot.balance * solPrice : 0
              const medals = ['🥇', '🥈', '🥉']
              return (
                <Link
                  key={pot.pubkey}
                  href={`/pots/${pot.pubkey}`}
                  className="group relative bg-pot-card/40 backdrop-blur-sm border border-pot-border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-pot-green/40 hover:bg-pot-card/70"
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ boxShadow: '0 0 40px rgba(20,241,149,0.08)' }}
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{medals[i]}</span>
                    <span className="text-3xl group-hover:animate-float">{pot.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{pot.name}</div>
                      <div className="text-xs text-pot-muted">{pot.memberCount} members</div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-pot-green">{pot.balance.toFixed(2)} SOL</div>
                  {balanceUsd > 0 && (
                    <div className="text-xs text-pot-muted mt-0.5">≈ ${balanceUsd >= 1000 ? (balanceUsd / 1000).toFixed(1) + 'K' : balanceUsd.toFixed(0)}</div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-pot-green/10 border border-pot-green/20 text-pot-green">
                      {pot.isPublic ? 'Public' : 'Private'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-pot-card border border-pot-border text-pot-muted">
                      L{pot.governanceLevel} Gov
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── For AI Agents & Developers (MCP) — promoted up the page so the
           agent-native angle lands right after the Tamagotchi strip and
           before any of the deeper "why now" prose. ── */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(153,69,255,0.06), transparent 60%)' }}
        />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-accent/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-accent">
                MCP-native protocol
              </span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-accent/60" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-4">
              {isLight ? 'Built for ' : 'Built for the '}
              <span className="bg-gradient-to-r from-pot-accent to-pot-green bg-clip-text text-transparent">
                {isLight ? 'AI helpers.' : 'agent economy.'}
              </span>
            </h2>
            <p className="text-white/75 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
              {isLight
                ? 'AI tools like ChatGPT and Claude can read your pot, suggest trades, and run them once the group says yes. Just install once.'
                : 'Any LLM can read, propose against, and execute on a POT through the MCP server. Claude, GPT, or your own agent — 60+ onchain actions, one install away.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {FOR_BUILDERS.map((item) => (
              <a
                key={item.title}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                className="group relative bg-pot-card/40 backdrop-blur-sm border border-pot-border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-pot-accent/40 hover:bg-pot-card/70"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: '0 0 40px rgba(153,69,255,0.10)' }}
                />
                <div className="text-2xl mb-3">{item.icon}</div>
                <div className="font-bold text-white text-lg mb-1 group-hover:text-pot-accent transition">{item.title}</div>
                <div className="text-sm text-white/75 leading-relaxed">{item.desc}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-pot-accent opacity-0 group-hover:opacity-100 transition">
                  Open <span aria-hidden>→</span>
                </div>
              </a>
            ))}
          </div>

          {/* Ask Claude — expanded into a real chat UI */}
          <AskClaudeChat />
        </div>
      </section>

      {/* ── Why PotBot, why now ── */}
      <section className="py-20 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-muted/60" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-muted">
                The thesis
              </span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-muted/60" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Why PotBot,{' '}
              <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
                why now.
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="group relative bg-pot-card/40 backdrop-blur-sm border border-pot-border rounded-2xl p-7 hover:border-pot-green/40 hover:bg-pot-card/70 transition-all duration-300">
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: '0 0 40px rgba(20,241,149,0.08)' }}
              />
              <div className="text-3xl mb-4">🔓</div>
              <h3 className="font-bold text-white text-xl mb-3 leading-tight">
                {isLight ? 'Nobody holds your money' : 'Why onchain, not a database'}
              </h3>
              <p className="text-white/80 text-base leading-relaxed">
                {isLight
                  ? "There's no company sitting between you and your money. The pot itself is the bank — only your group's votes can move what's inside."
                  : 'Community custody without a trusted middleman. The vault is the onchain account — every deposit, vote and trade is signed by the program itself. A database can’t enforce that without re-introducing the operator we’re removing.'}
              </p>
            </div>
            <div className="group relative bg-pot-card/40 backdrop-blur-sm border border-pot-border rounded-2xl p-7 hover:border-pot-accent/40 hover:bg-pot-card/70 transition-all duration-300">
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: '0 0 40px rgba(153,69,255,0.10)' }}
              />
              <div className="text-3xl mb-4">⏰</div>
              <h3 className="font-bold text-white text-xl mb-3 leading-tight">Why now</h3>
              <p className="text-white/80 text-base leading-relaxed">
                {isLight
                  ? 'AI helpers are finally smart enough to suggest real trades. Putting them inside a group pot — where humans still decide — turns "pool money with friends" from a spreadsheet into an actual product.'
                  : 'MCP standardised how AI agents connect to real systems. Solana ships the throughput, Jupiter the routing. The agent-driven community coordination stack exists in 2026 — and the layer hadn’t shipped. We’re shipping it.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two pot modes section was moved up to sit right after the
          mission strip; nothing renders here. */}

      {/* ── Final CTA ── */}
      <section className="relative py-28 sm:py-32 px-4 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(20,241,149,0.08), transparent 60%), radial-gradient(ellipse 70% 60% at 50% 50%, rgba(153,69,255,0.06), transparent 60%)',
          }}
        />
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-8 animate-float">🪴</div>
          <h2 className="text-4xl sm:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Ready to{' '}
            <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
              tokenize your community?
            </span>
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            {isLight
              ? 'Set up your shared pot in under a minute. No coding. Free to try in test mode.'
              : 'Spin up your treasury in under a minute. No coding required. Open source and free to use on Solana devnet.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/signup"
              className="px-7 py-4 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold transition text-base shadow-[0_0_50px_rgba(20,241,149,0.3)]"
            >
              🚀 Get Early Access
            </Link>
            <Link
              href="/create"
              className="px-7 py-4 rounded-xl bg-pot-card/80 backdrop-blur border border-pot-accent/40 hover:border-pot-accent text-white font-bold transition text-base"
            >
              🪴 {t('Create your vault')}
            </Link>
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noreferrer"
              className="px-7 py-4 rounded-xl bg-pot-card/80 backdrop-blur border border-pot-border hover:border-white/30 text-white font-bold transition text-base"
            >
              ⭐ Star on GitHub
            </a>
          </div>
        </div>
      </section>


    </div>
  )
}
