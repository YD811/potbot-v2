'use client'

import { useState } from 'react'
import Link from 'next/link'

const BOUNTIES = [
  {
    sponsor: 'Jupiter',
    prize: '$10,000',
    track: 'Best DEX Integration',
    color: '#37B24D',
    emoji: '⚡',
    summary: 'Full Jupiter DEX stack integrated into PotBot governance flow.',
    details: [
      {
        title: 'Swap V2 — Best-price routing',
        desc: 'Group vaults execute swaps via Jupiter Swap V2 API. Any member can propose a swap; once approved by governance, the vault PDA signs the transaction. Server-side API key injection keeps the key off the client.',
      },
      {
        title: 'Trigger Orders (Limit Orders)',
        desc: 'Members can propose limit orders: "buy X token when price hits Y". The vault creates a Jupiter Trigger order on-chain. Executed automatically by Jupiter when the condition is met.',
      },
      {
        title: 'DCA — Dollar Cost Averaging',
        desc: 'Governance can approve recurring buy/sell proposals: e.g. "buy 0.5 SOL of BONK every day for 7 days". Fully parameterized: cycle duration, total cycles, amount per cycle.',
      },
      {
        title: 'Price API v2 — Real-time feeds',
        desc: 'Token prices fetched via Jupiter Price API v2 with API key auth. Proxied server-side via /api/jupiter/price/v2 to keep credentials secure. Used in AI agent triggers and PnL calculations.',
      },
      {
        title: 'Governance-gated execution',
        desc: 'No swap happens without a passed proposal. Every Jupiter call goes through: propose → vote → timelock → execute. The vault PDA is the signer — individual members cannot bypass governance.',
      },
    ],
  },
  {
    sponsor: 'Ika / Encrypt',
    prize: '$10,000',
    track: 'Privacy & ZK Layer',
    color: '#7048E8',
    emoji: '🔒',
    summary: 'STAMPPOT — ZK privacy layer for pot membership and transactions.',
    details: [
      {
        title: 'STAMPPOT privacy layer',
        desc: 'Built on PrivacyCash ZK proofs. Members can participate in a pot without revealing their wallet address publicly. The vault tracks shares via zero-knowledge commitments.',
      },
      {
        title: 'Private membership',
        desc: 'With STAMPPOT enabled, joining a pot does not expose your wallet on-chain in a readable form. You hold a ZK proof of membership instead of a visible MemberAccount.',
      },
      {
        title: 'Shielded withdrawals',
        desc: 'Members can withdraw their share to a stealth address, breaking the on-chain link between vault participation and the final destination wallet.',
      },
    ],
  },
  {
    sponsor: 'Dune Analytics',
    prize: '$5,000',
    track: 'On-Chain Analytics',
    color: '#F03E3E',
    emoji: '📊',
    summary: 'Full PnL dashboard with on-chain data, Pyth prices, and Supabase snapshots.',
    details: [
      {
        title: 'Per-member PnL tracking',
        desc: 'Every deposit records the SOL/USD price at entry time (via Pyth oracle). PnL is calculated as: current share value − entry cost, in both SOL and USD.',
      },
      {
        title: 'Daily NAV snapshots',
        desc: 'A daily cron job snapshots each vault\'s Net Asset Value into pot_nav_daily. This powers performance charts and rolling return calculations.',
      },
      {
        title: 'Cross-pot portfolio view',
        desc: 'Members can see their total portfolio PnL across all pots they\'re in. Aggregated from on-chain share data + Supabase price snapshots.',
      },
      {
        title: 'Leaderboard analytics',
        desc: 'Public vault leaderboard ranks pots by TVL, trade volume, and member growth. All data derived from on-chain Anchor accounts — fully verifiable.',
      },
    ],
  },
  {
    sponsor: 'Umbra',
    prize: '$5,000',
    track: 'Stealth Payments',
    color: '#1C7ED6',
    emoji: '🌫️',
    summary: 'Stealth address support for private vault withdrawals.',
    details: [
      {
        title: 'Stealth withdrawal addresses',
        desc: 'Members can generate a one-time stealth address for their withdrawal. The vault sends SOL to the stealth address instead of the registered wallet, breaking the on-chain trail.',
      },
      {
        title: 'Combined with STAMPPOT',
        desc: 'When used alongside STAMPPOT ZK layer, the full flow is private: hidden membership + stealth withdrawal = no on-chain link between the user and their pot activity.',
      },
    ],
  },
  {
    sponsor: 'SNS',
    prize: '$5,000',
    track: 'Solana Name Service',
    color: '#E67700',
    emoji: '🏷️',
    summary: 'SNS reverse lookup for human-readable wallet names across the app.',
    details: [
      {
        title: 'Reverse SNS lookup',
        desc: 'All wallet addresses in the UI are resolved to .sol names when available. Member lists, proposal authors, and deposit history all show "alice.sol" instead of raw pubkeys.',
      },
      {
        title: 'SNS in governance',
        desc: 'Proposal cards show "alice.sol proposed: swap 1 SOL → BONK" instead of truncated addresses. Makes governance readable for non-technical group members.',
      },
      {
        title: 'SNS-gated pots',
        desc: 'Pot creators can restrict membership to .sol name holders, adding a layer of identity verification to private vaults.',
      },
    ],
  },
  {
    sponsor: 'Kora',
    prize: '$5,000',
    track: 'Group Finance',
    color: '#2F9E44',
    emoji: '🏦',
    summary: 'Core group finance primitives: shared treasury, budget grants, multi-level governance.',
    details: [
      {
        title: 'Multi-member shared vault',
        desc: 'Up to 1,000 members per pot. Each member holds shares proportional to their deposit. Shares represent a claim on the vault\'s SOL balance.',
      },
      {
        title: 'Budget grant proposals',
        desc: 'Governance can allocate a budget to an active trader: "give Alice 20% of vault for 7 days". Alice can swap freely within budget; unused funds return automatically.',
      },
      {
        title: '5-level governance system',
        desc: 'Trade level, withdraw level, member change level, settings level, yield level — each independently configurable. Supports everything from single-signer autocracy to multi-sig consensus.',
      },
      {
        title: 'Withdrawal reserves',
        desc: 'Protocol-level fee reserves and withdrawal buffers ensure the vault can always process redemptions even during active yield strategies.',
      },
    ],
  },
]

const STACK = [
  'Solana · Anchor 0.30',
  'Jupiter Swap V2 + Trigger + DCA',
  'Pyth Network (price feeds)',
  'PrivacyCash ZK proofs',
  'Solana Name Service',
  'Next.js 14 · TanStack Query',
  'Supabase · Cloudflare Pages',
]

export default function HackathonPage() {
  const [open, setOpen] = useState<string | null>(null)

  const totalPrize = BOUNTIES.reduce((sum, b) => sum + parseInt(b.prize.replace(/\D/g, '')), 0)

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', background: '#08080f', color: '#e8e8f0', minHeight: '100vh' }}>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ color: '#7048E8', fontWeight: 800, fontSize: 18, textDecoration: 'none' }}>🫕 PotBot</a>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <a href="https://t.me/Trade_pot_bot" target="_blank" rel="noreferrer" style={{ color: '#a0a0c0', textDecoration: 'none' }}>Telegram Bot</a>
          <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" style={{ color: '#a0a0c0', textDecoration: 'none' }}>GitHub</a>
          <a href="https://x.com/PotBot_sol" target="_blank" rel="noreferrer" style={{ color: '#a0a0c0', textDecoration: 'none' }}>Twitter</a>
        </div>
      </div>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 56px', background: 'radial-gradient(ellipse at 50% 0%, #1a0a3e 0%, #08080f 60%)' }}>
        <div style={{ display: 'inline-block', background: '#7048E820', border: '1px solid #7048E840', borderRadius: 100, padding: '6px 18px', fontSize: 12, color: '#9d6fff', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
          Solana Frontier Hackathon 2026 · Apr 6 – May 11
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.05, background: 'linear-gradient(135deg, #fff 30%, #9d6fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🫕 PotBot
        </h1>
        <p style={{ fontSize: 'clamp(17px, 2.5vw, 22px)', color: '#8080b0', maxWidth: 560, margin: '0 auto 12px', lineHeight: 1.6 }}>
          Group trading vaults on Solana. Pool capital, vote on swaps, share the gains.
        </p>
        <p style={{ fontSize: 14, color: '#5050a0', marginBottom: 40 }}>
          Targeting <strong style={{ color: '#9d6fff' }}>${totalPrize.toLocaleString()}</strong> across {BOUNTIES.length} bounty tracks
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://t.me/Trade_pot_bot" target="_blank" rel="noreferrer"
            style={{ background: '#7048E8', color: '#fff', padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            🚀 Try the Bot
          </a>
          <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer"
            style={{ background: '#12121e', color: '#e8e8f0', padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', border: '1px solid #2a2a4a' }}>
            View Source →
          </a>
        </div>
      </section>

      {/* Bounty tracks — accordion */}
      <section style={{ padding: '60px 24px', maxWidth: 860, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 800, marginBottom: 8 }}>What We Built — Per Bounty</h2>
        <p style={{ textAlign: 'center', color: '#5050a0', marginBottom: 48, fontSize: 15 }}>
          Click each track to see exact implementation details
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BOUNTIES.map((b) => {
            const isOpen = open === b.sponsor
            return (
              <div key={b.sponsor} style={{
                background: '#10101c',
                border: `1px solid ${isOpen ? b.color + '60' : '#1e1e36'}`,
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}>
                {/* Header */}
                <button
                  onClick={() => setOpen(isOpen ? null : b.sponsor)}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    color: '#e8e8f0', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 28 }}>{b.emoji}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18, fontWeight: 800 }}>{b.sponsor}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: b.color }}>{b.prize}</span>
                        <span style={{ fontSize: 11, background: b.color + '20', color: b.color, borderRadius: 100, padding: '2px 10px', fontWeight: 600 }}>{b.track}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#6060a0', marginTop: 4 }}>{b.summary}</div>
                    </div>
                  </div>
                  <span style={{ color: b.color, fontSize: 20, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </button>

                {/* Expandable details */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${b.color}30`, padding: '0 24px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {b.details.map((d, i) => (
                        <div key={i} style={{
                          padding: '16px 0',
                          borderBottom: i < b.details.length - 1 ? '1px solid #1a1a30' : 'none',
                          display: 'flex', gap: 16,
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, flexShrink: 0, marginTop: 7 }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#d0d0f0', marginBottom: 6 }}>{d.title}</div>
                            <div style={{ fontSize: 13, color: '#6060a0', lineHeight: 1.65 }}>{d.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Architecture overview */}
      <section style={{ padding: '0 24px 60px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ background: '#10101c', border: '1px solid #1e1e36', borderRadius: 20, padding: '32px 40px' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>🏗️ Architecture</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { layer: 'On-Chain', color: '#37B24D', items: ['Anchor 0.30 program', 'PotAccount PDA', 'ProposalAccount PDA', 'MemberAccount PDA', 'Tamagotchi NFT mint', 'Timelock enforcement'] },
              { layer: 'Off-Chain', color: '#7048E8', items: ['Next.js 14 frontend', 'Jupiter API proxy', 'Pyth price feeds', 'Supabase PostgreSQL', 'PnL calculation engine', 'AI agent evaluation loop'] },
              { layer: 'Integrations', color: '#E67700', items: ['Jupiter Swap V2', 'Jupiter Trigger', 'Jupiter DCA', 'Pyth Network', 'Solana Name Service', 'PrivacyCash ZK'] },
            ].map(({ layer, color, items }) => (
              <div key={layer}>
                <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{layer}</div>
                {items.map(item => (
                  <div key={item} style={{ fontSize: 13, color: '#7070a0', padding: '4px 0', borderBottom: '1px solid #14142a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color, opacity: 0.6 }}>·</span> {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ padding: '0 24px 60px', maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, marginBottom: 36 }}>Build Timeline</h2>
        {[
          { date: 'Apr 6', label: 'Hackathon started · repo initialized', done: true },
          { date: 'Apr 18', label: 'Anchor program + all compile errors fixed', done: true },
          { date: 'Apr 21', label: 'Jupiter full stack · Pyth PnL · Supabase backend · localStorage removed', done: true },
          { date: 'Apr 25', label: 'Devnet deploy · E2E demo flow', done: false },
          { date: 'May 1', label: 'Demo video · submission draft', done: false },
          { date: 'May 11', label: '🏁 Submission deadline', done: false },
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
              background: t.done ? '#2F9E44' : '#10101c',
              border: t.done ? 'none' : '2px solid #2a2a4a',
            }}>
              {t.done ? '✓' : '○'}
            </div>
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: '#4040a0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t.date}</div>
              <div style={{ fontSize: 14, fontWeight: t.done ? 600 : 400, color: t.done ? '#d0d0f0' : '#5050a0', marginTop: 2 }}>{t.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Stack pills */}
      <section style={{ padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#3030a0', fontWeight: 700, letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' }}>Tech Stack</div>
        <div>
          {STACK.map(s => (
            <span key={s} style={{ display: 'inline-block', background: '#10101c', border: '1px solid #1e1e36', borderRadius: 100, padding: '6px 16px', margin: '4px', fontSize: 12, color: '#7070a0' }}>
              {s}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 40, fontSize: 13, color: '#3030a0' }}>
          Built by <a href="https://x.com/CryptoYDao" target="_blank" rel="noreferrer" style={{ color: '#7048E8', textDecoration: 'none' }}>@CryptoYDao</a>
          {' · '}Y-DAO Amsterdam{' · '}Superteam NL
        </div>
      </section>

    </main>
  )
}