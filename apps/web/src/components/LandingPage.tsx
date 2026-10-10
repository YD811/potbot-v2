'use client'

import Link from 'next/link'
import { HowAPotWorks } from '@/components/pot-index/HowAPotWorks'
import { GardenMode } from '@/components/pot-index/GardenMode'
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
    status: 'In progress',
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
          transform: perspective(1400px) rotateY(0deg) scale(1.015);
        }
        @keyframes potbot-tilt {
          0%, 100% { transform: perspective(1400px) rotateY(-10deg); }
          50% { transform: perspective(1400px) rotateY(8deg); }
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
  if (value === 0) return <span className="text-white/70">—</span>
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
  const topVaults = [...potRows].sort((a, b) => b.balance - a.balance).slice(0, 3)

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center text-center pt-8 pb-12 px-4 overflow-hidden">
        {/* Glow background — masked so the blurred blobs fade to zero before
            the section's overflow-hidden edge instead of getting hard-clipped
            at the seam with the Top vaults block below. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          }}
        >
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pot-green/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-pot-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-7xl mb-6 mt-2 animate-float" aria-hidden="true">🪴</div>

          <h1
            className="font-black text-white leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(1.75rem, 5.5vw, 4rem)' }}
          >
            Pot<span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">Bot</span>
            <br />
            Any basket of Solana assets. One liquid token.
          </h1>

          <p className="text-lg sm:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            {isLight ? (
              <>
                Invest and stay liquid.
                <br />
                No rugs, no exit liquidity.
              </>
            ) : (
              <>
                Invest and stay liquid.
                <br />
                No rugs, no exit liquidity.
              </>
            )}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/portfolios/new"
              className="btn-primary text-base px-6 py-3 glow-green flex items-center gap-2"
            >
              Create a POTfolio
            </Link>
            <Link
              href="/portfolios"
              className="btn-secondary text-base px-6 py-3 flex items-center gap-2"
            >
              Explore POTfolios
            </Link>
          </div>

        </div>
      </section>

      {/* ── How a Pot works — the four moves, right under the hero ── */}
      <HowAPotWorks />

      {/* ── Legacy top vaults (pot_vault mock) — hidden on the Portfolios landing ── */}
      {false && topVaults.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
                <span className="text-xs font-bold uppercase tracking-[0.4em] text-pot-green">
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
                      <div className="text-xs text-white/70">{pot.memberCount} members</div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-pot-green">{pot.balance.toFixed(2)} SOL</div>
                  {balanceUsd > 0 && (
                    <div className="text-xs text-white/70 mt-0.5">≈ ${balanceUsd >= 1000 ? (balanceUsd / 1000).toFixed(1) + 'K' : balanceUsd.toFixed(0)}</div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-pot-green/10 border border-pot-green/20 text-pot-green">
                      {pot.isPublic ? 'Public' : 'Private'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-pot-card border border-pot-border text-white/70">
                      L{pot.governanceLevel} Gov
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

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
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-pot-green">
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
              Bring <span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">people</span> and{' '}
              <span className="bg-gradient-to-r from-pot-green to-pot-green/80 bg-clip-text text-transparent">capital</span> together.
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-pot-accent to-pot-accent/80 bg-clip-text text-transparent">Simple, honest, safe.</span>
            </p>
          )}
        </div>
      </section>

      {/* ── Garden mode: one plant grows with deposits, six-stage ladder below ── */}
      <GardenMode />

      {/* ── POT + BOT: the two halves of the name ── */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
              <span className="text-xs font-bold uppercase tracking-[0.4em] text-pot-green">Pot + Bot</span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-green/60" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                word: 'POT',
                full: 'Programmable On-chain Treasury',
                role: 'holds the assets',
                color: '#14F195',
                rgb: '20,241,149',
                text: 'A wallet owned by code, not by a person. It holds the basket, mints the token and lets every holder leave with their share. Nobody can withdraw.',
                href: '/learn',
                cta: 'How it works',
              },
              {
                word: 'BOT',
                full: 'Blockchain Orchestration Tool',
                role: 'does the work',
                color: '#9945FF',
                rgb: '153,69,255',
                text: 'Keeps the basket balanced, lets AI agents read and act on every Pot through MCP, and soon tells your group what grew, what fell and why.',
                href: '/for-agents',
                cta: 'For AI agents',
              },
            ].map((c) => (
              <div
                key={c.word}
                className="relative flex flex-col items-center rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, rgba(${c.rgb},0.08), rgba(${c.rgb},0.01))`,
                  border: `1px solid rgba(${c.rgb},0.3)`,
                }}
              >
                <div className="text-5xl font-black tracking-tight" style={{ color: c.color, textShadow: `0 0 32px rgba(${c.rgb},0.45)` }}>
                  {c.word}
                </div>
                <div className="mt-3 text-lg font-bold text-white">{c.full}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: c.color }}>{c.role}</div>
                <p className="mt-4 max-w-sm text-base leading-relaxed text-white/80">{c.text}</p>
                <Link href={c.href} className="mt-6 text-sm font-semibold hover:text-white transition" style={{ color: c.color }}>
                  {c.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two products, one protocol: POTfolio and Vault ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-pot-green">Two products</span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-green/60" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight">
            Hold a token, or run a treasury.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-green mb-2">POTfolio · live on devnet</div>
            <h3 className="text-2xl font-bold text-white mb-3">One token, a whole basket inside</h3>
            <ul className="space-y-2 text-base text-white/80">
              <li>Fixed basket, chosen once by the creator.</li>
              <li>Hold it in your wallet, send it, use it.</li>
              <li>Leave any time for the assets or USDC.</li>
              <li>For people who want exposure, not meetings.</li>
            </ul>
            <Link href="/portfolios" className="mt-5 inline-block text-sm font-semibold text-pot-green hover:text-white">Open POTfolios →</Link>
          </div>
          <div className="card p-7">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-accent mb-2">Vault · PotBot v2</div>
            <h3 className="text-2xl font-bold text-white mb-3">A treasury your group runs together</h3>
            <ul className="space-y-2 text-base text-white/80">
              <li>Members deposit, propose trades and vote.</li>
              <li>The program executes what the vote approved.</li>
              <li>Public vaults open to all; private vaults in development.</li>
              <li>For groups who want to decide together.</li>
            </ul>
            <Link href="/vaults" className="mt-5 inline-block text-sm font-semibold text-pot-accent hover:text-white">Explore vaults →</Link>
          </div>
        </div>
      </section>

      {/* ── The Bot: what the AI side does for a holder ── */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(153,69,255,0.06), transparent 60%)' }}
        />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-accent/60" />
              <span className="text-xs font-bold uppercase tracking-[0.4em] text-pot-accent">The Bot</span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-accent/60" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-4">
              You hold the token.{' '}
              <span className="bg-gradient-to-r from-pot-accent to-pot-green bg-clip-text text-transparent">The Bot does the rest.</span>
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Everything complicated on-chain, from keeping the basket balanced to reading the market, happens behind one token.
              You see the result, not the machinery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              { title: 'Keeps the basket honest', desc: 'Buys and rebalances inside limits the program enforces. It cannot overshoot, overpay or touch your share.', tag: 'live' },
              { title: 'Explains what happened', desc: 'A digest for holders and groups: what grew, what fell and why, in plain words. No charts to decode.', tag: 'in development' },
              { title: 'Answers your questions', desc: 'Ask about any POTfolio in chat: composition, value, what changed this week. Works with Claude, ChatGPT and your own agents.', tag: 'live' },
            ].map((item) => (
              <div key={item.title} className="card p-6">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-bold text-white text-lg">{item.title}</div>
                  <span className="rounded-full border border-pot-accent/40 px-2 py-0.5 text-xs text-pot-accent">{item.tag}</span>
                </div>
                <div className="text-sm text-white/75 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>

          <AskClaudeChat />
          <p className="mt-6 text-center text-sm text-white/70">
            Building an agent? <Link href="/for-agents" className="text-pot-accent hover:text-white">PotBot speaks MCP: every Pot is readable and actionable by AI agents →</Link>
          </p>
        </div>
      </section>

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
              hold your portfolio as one token?
            </span>
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            {isLight
              ? 'Create a portfolio, hold the token. No coding. Free to try on devnet.'
              : 'Create a portfolio, hold the token. No coding. Open source and free to try on Solana devnet.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/signup"
              className="px-7 py-4 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold transition text-base shadow-[0_0_50px_rgba(20,241,149,0.3)]"
            >
              Get early access
            </Link>
            <Link
              href="/portfolios/new"
              className="px-7 py-4 rounded-xl bg-pot-card/80 border border-pot-accent/40 hover:border-pot-accent text-white font-bold transition text-base"
            >
              Create a POTfolio
            </Link>
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noreferrer"
              className="px-7 py-4 rounded-xl bg-pot-card/80 backdrop-blur border border-pot-border hover:border-white/30 text-white font-bold transition text-base"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>


    </div>
  )
}
