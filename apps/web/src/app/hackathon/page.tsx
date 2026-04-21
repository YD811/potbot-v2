'use client'

export default function HackathonPage() {
  const sponsors = [
    { name: 'Jupiter', prize: '$10K', track: 'Best DEX Integration', color: '#37B24D' },
    { name: 'Ika / Encrypt', prize: '$10K', track: 'Privacy & ZK', color: '#7048E8' },
    { name: 'Dune SIM', prize: '$5K', track: 'On-Chain Analytics', color: '#F03E3E' },
    { name: 'Umbra', prize: '$5K', track: 'Stealth Payments', color: '#1C7ED6' },
    { name: 'SNS', prize: '$5K', track: 'Solana Name Service', color: '#E67700' },
    { name: 'Kora', prize: '$5K', track: 'Group Finance', color: '#2F9E44' },
  ]

  const features = [
    { icon: '🏦', title: 'Group Vaults', desc: 'Pool SOL with up to 50 frens. One shared vault, everyone has a stake.' },
    { icon: '🗳️', title: 'On-Chain Governance', desc: '5 governance modes from autocracy to consensus. Proposals, voting, timelock — all on Solana.' },
    { icon: '⚡', title: 'Jupiter Swaps', desc: 'Best-price DEX swaps via Jupiter Swap V2. Trigger orders, DCA, and limit orders — all proposed by governance.' },
    { icon: '🤖', title: 'AI Trading Agent', desc: 'Configurable AI agent that proposes swaps based on on-chain rules. Rate-limited, community-controlled.' },
    { icon: '🔒', title: 'STAMPPOT Privacy', desc: 'ZK-private pot participation via PrivacyCash. Hide your position, not your results.' },
    { icon: '🐣', title: 'Tamagotchi NFT', desc: 'Every pot hatches an egg. Trade, grow members, earn XP — evolve to Dragon or Titan.' },
  ]

  const timeline = [
    { date: 'Apr 6', label: 'Hackathon started', done: true },
    { date: 'Apr 21', label: 'Program compiled + Jupiter integration', done: true },
    { date: 'Apr 25', label: 'Devnet deploy + E2E tests', done: false },
    { date: 'May 1', label: 'Demo video recorded', done: false },
    { date: 'May 11', label: 'Submission deadline', done: false },
  ]

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', background: '#0a0a0f', color: '#e8e8f0', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 60px', background: 'linear-gradient(135deg, #0a0a0f 0%, #12121e 100%)' }}>
        <div style={{ fontSize: 14, color: '#7048E8', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
          Solana Frontier Hackathon 2026
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, margin: '0 0 20px', lineHeight: 1.1 }}>
          🫕 PotBot
        </h1>
        <p style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', color: '#a0a0c0', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.5 }}>
          Group trading vaults on Solana. Pool capital, vote on swaps, share the gains.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://t.me/Trade_pot_bot" target="_blank" rel="noreferrer"
            style={{ background: '#7048E8', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            🚀 Try the Bot
          </a>
          <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer"
            style={{ background: '#1a1a2e', color: '#e8e8f0', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none', border: '1px solid #2a2a4a' }}>
            GitHub →
          </a>
        </div>
      </section>

      {/* Sponsor tracks */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Bounty Tracks</h2>
        <p style={{ textAlign: 'center', color: '#7070a0', marginBottom: 40 }}>$40K+ in sponsor prizes we're targeting</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {sponsors.map(s => (
            <div key={s.name} style={{ background: '#12121e', border: `1px solid ${s.color}33`, borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.prize}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{s.name}</div>
              <div style={{ fontSize: 14, color: '#7070a0', marginTop: 8 }}>{s.track}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto', background: '#0d0d1a', borderRadius: 24 }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>What PotBot Does</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: '#12121e', borderRadius: 16, padding: 24, border: '1px solid #1e1e36' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#8080a0', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section style={{ padding: '60px 24px', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>Build Timeline</h2>
        {timeline.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
              background: t.done ? '#2F9E44' : '#1a1a2e',
              border: t.done ? 'none' : '2px solid #2a2a4a'
            }}>
              {t.done ? '✓' : '○'}
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6060a0', fontWeight: 600, textTransform: 'uppercase' }}>{t.date}</div>
              <div style={{ fontSize: 16, fontWeight: t.done ? 600 : 400, color: t.done ? '#e8e8f0' : '#6060a0' }}>{t.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Stack */}
      <section style={{ padding: '40px 24px 80px', textAlign: 'center' }}>
        <div style={{ color: '#4040a0', fontSize: 13, fontWeight: 600, letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' }}>Tech Stack</div>
        {['Solana · Anchor 0.30', 'Jupiter Swap V2 + Trigger + DCA', 'Next.js 14 · TanStack Query', 'Pyth Price Feeds', 'Supabase · Cloudflare Pages'].map(s => (
          <span key={s} style={{ display: 'inline-block', background: '#12121e', border: '1px solid #1e1e36', borderRadius: 20, padding: '6px 16px', margin: '4px', fontSize: 13, color: '#9090c0' }}>
            {s}
          </span>
        ))}
        <div style={{ marginTop: 40, fontSize: 13, color: '#4040a0' }}>
          Built by <a href="https://x.com/CryptoYDao" style={{ color: '#7048E8' }}>@CryptoYDao</a> · Y-DAO Amsterdam · Superteam NL
        </div>
      </section>
    </main>
  )
}
