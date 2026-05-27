import type { Metadata } from 'next'
import ClaimWidget from '@/components/sns/ClaimWidget'
import MyNames from '@/components/sns/MyNames'
import { PRICE_TIERS, DEFAULT_PRICING } from '@/lib/sns'

export const metadata: Metadata = {
  title: 'Claim your .potbot.sol — PotBot',
  description: 'Your on-chain identity in the PotBot ecosystem. Grab a human-readable .potbot.sol name that resolves to your wallet.',
}

const GREEN = '#14F195'
const MUTED = '#6B7280'

export default function NamePage({ searchParams }: { searchParams?: { name?: string; pot?: string } }) {
  const initialName = typeof searchParams?.name === 'string' ? searchParams.name : ''
  const potPubkey = typeof searchParams?.pot === 'string' ? searchParams.pot : undefined
  return (
    <main style={{ minHeight: '100vh', background: '#0D1117', color: '#fff', padding: '64px 20px 96px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, border: '1px solid #1A2332', background: '#111827', color: GREEN, fontSize: 13, marginBottom: 20 }}>{'🌿'} Powered by Solana Name Service</div>
        <h1 style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 800, margin: '0 0 14px', letterSpacing: -0.5 }}>Claim your <span style={{ color: GREEN }}>.potbot.sol</span></h1>
        <p style={{ fontSize: 17, color: MUTED, maxWidth: 520, margin: '0 auto 36px' }}>One human-readable name for the whole PotBot ecosystem. It resolves to your wallet today — and to your pots tomorrow.</p>
      </div>
      <ClaimWidget initialName={initialName} potPubkey={potPubkey} />
      <MyNames />
      <div style={{ maxWidth: 560, margin: '40px auto 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Feature title="One identity" body="Send & receive with a name, not a 44-char address." />
        <Feature title="You own it" body="Minted to your wallet on-chain. Non-custodial." />
        <Feature title="Ecosystem-wide" body="Works across PotBot, Y-DAO & SOLO." />
      </div>
      <PricingTable />
      <Faq />
    </main>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: '16px', background: '#111827', border: '1px solid #1A2332', borderRadius: 12, textAlign: 'left' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.45 }}>{body}</div>
    </div>
  )
}

function PricingTable() {
  const rows = [
    { len: '1 char', p: PRICE_TIERS[1] }, { len: '2 chars', p: PRICE_TIERS[2] },
    { len: '3 chars', p: PRICE_TIERS[3] }, { len: '4 chars', p: PRICE_TIERS[4] },
    { len: '5+ chars', p: DEFAULT_PRICING },
  ]
  return (
    <div style={{ maxWidth: 560, margin: '48px auto 0', width: '100%' }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>Pricing</div>
      <div style={{ background: '#111827', border: '1px solid #1A2332', borderRadius: 12, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.len} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid #1A2332' }}>
            <span style={{ color: '#fff', fontSize: 14 }}>{r.len}</span>
            <span style={{ color: GREEN, fontSize: 14, fontWeight: 600 }}>{r.p.sol} SOL · {r.p.usdc} USDC</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Shorter names are scarcer, so they cost more. You pay once — no renewals.</div>
    </div>
  )
}

function Faq() {
  return (
    <div style={{ maxWidth: 560, margin: '40px auto 0', width: '100%' }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>FAQ</div>
      <FaqItem q="What is a .potbot.sol name?" a="A Solana Name Service subdomain under potbot.sol. A human-readable handle that resolves to your wallet across Solana apps." />
      <FaqItem q="Do I actually own it?" a="Yes — it's minted directly to your wallet on-chain. Non-custodial. PotBot only authorizes the creation." />
      <FaqItem q="Which wallets work?" a="Any Solana wallet supported in PotBot — Phantom/Backpack via the adapter, or a Privy embedded wallet." />
      <FaqItem q="Can I point it at a pot?" a="Soon. Names resolve to your wallet today; binding a name to a pot ships once pots are fully on mainnet." />
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ padding: '14px 16px', background: '#0D1117', border: '1px solid #1A2332', borderRadius: 12, marginBottom: 8, textAlign: 'left' }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 4 }}>{q}</div>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.45 }}>{a}</div>
    </div>
  )
}
