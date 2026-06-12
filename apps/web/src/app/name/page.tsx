import type { Metadata } from 'next'
import ClaimWidget from '@/components/sns/ClaimWidget'
import MyNames from '@/components/sns/MyNames'
import { PRICE_TIERS, DEFAULT_PRICING, SNS_PROMO_FLAT } from '@/lib/sns'

export const metadata: Metadata = {
  title: 'Claim your .potbot.sol — PotBot',
  description: 'Your on-chain identity in the PotBot ecosystem. Grab a human-readable .potbot.sol name that resolves to your wallet.',
}

export default function NamePage({ searchParams }: { searchParams?: { name?: string; pot?: string } }) {
  const initialName = typeof searchParams?.name === 'string' ? searchParams.name : ''
  const potPubkey = typeof searchParams?.pot === 'string' ? searchParams.pot : undefined
  return (
    <main className="min-h-screen bg-pot-dark text-white" style={{ padding: '64px 20px 96px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div className="inline-flex items-center gap-2" style={{ marginBottom: 20 }}>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-pot-border bg-pot-card text-pot-green text-xs">{'🌿'} Powered by Solana Name Service</span>
          {SNS_PROMO_FLAT && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-pot-green/40 bg-pot-green/10 text-pot-green text-xs font-bold">{'🔥'} PROMO</span>
          )}
        </div>
        <h1 className="text-4xl font-extrabold" style={{ lineHeight: 1.1, margin: '0 0 14px', letterSpacing: -0.5 }}>Claim your <span className="text-pot-green">.potbot.sol</span></h1>
        <p className="text-pot-muted" style={{ fontSize: 17, maxWidth: 520, margin: '0 auto 36px' }}>One human-readable name for the whole PotBot ecosystem. It resolves to your wallet today — and to your pots tomorrow.</p>
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
    <div className="bg-pot-card border border-pot-border rounded-xl p-4 text-left">
      <div className="font-bold text-sm mb-1.5">{title}</div>
      <div className="text-pot-muted text-xs" style={{ lineHeight: 1.45 }}>{body}</div>
    </div>
  )
}

function PricingTable() {
  // Launch promo: one flat price for every name. The length-based ladder is
  // preserved behind the !SNS_PROMO_FLAT branch so flipping the flag restores it.
  if (SNS_PROMO_FLAT) {
    return (
      <div style={{ maxWidth: 560, margin: '48px auto 0', width: '100%' }}>
        <div className="text-pot-muted text-xs mb-2.5">Pricing</div>
        <div className="bg-pot-card border border-pot-green/40 rounded-xl overflow-hidden">
          <div className="flex justify-between px-4 py-3 text-sm">
            <span>Any name</span>
            <span className="text-pot-green font-semibold">{DEFAULT_PRICING.sol} SOL · {DEFAULT_PRICING.usdc} USDC</span>
          </div>
        </div>
        <div className="text-pot-muted text-xs mt-2">Launch promo — flat price for every name, any length. Pay once, no renewals.</div>
      </div>
    )
  }
  const rows = [
    { len: '1 char', p: PRICE_TIERS[1] }, { len: '2 chars', p: PRICE_TIERS[2] },
    { len: '3 chars', p: PRICE_TIERS[3] }, { len: '4 chars', p: PRICE_TIERS[4] },
    { len: '5+ chars', p: DEFAULT_PRICING },
  ]
  return (
    <div style={{ maxWidth: 560, margin: '48px auto 0', width: '100%' }}>
      <div className="text-pot-muted text-xs mb-2.5">Pricing</div>
      <div className="bg-pot-card border border-pot-border rounded-xl overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.len} className={`flex justify-between px-4 py-3 text-sm ${i > 0 ? 'border-t border-pot-border' : ''}`}>
            <span>{r.len}</span>
            <span className="text-pot-green font-semibold">{r.p.sol} SOL · {r.p.usdc} USDC</span>
          </div>
        ))}
      </div>
      <div className="text-pot-muted text-xs mt-2">Shorter names are scarcer, so they cost more. You pay once — no renewals.</div>
    </div>
  )
}

function Faq() {
  return (
    <div style={{ maxWidth: 560, margin: '40px auto 0', width: '100%' }}>
      <div className="text-pot-muted text-xs mb-2.5">FAQ</div>
      <FaqItem q="What is a .potbot.sol name?" a="A Solana Name Service subdomain under potbot.sol. A human-readable handle that resolves to your wallet across Solana apps." />
      <FaqItem q="Do I actually own it?" a="Yes — it's minted directly to your wallet on-chain. Non-custodial. PotBot only authorizes the creation." />
      <FaqItem q="Which wallets work?" a="Any Solana wallet supported in PotBot — Phantom/Backpack via the adapter, or a Privy embedded wallet." />
      <FaqItem q="Can I point it at a pot?" a="Soon. Names resolve to your wallet today; binding a name to a pot ships once pots are fully on mainnet." />
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-pot-card/60 border border-pot-border rounded-xl mb-2 p-4 text-left">
      <div className="font-semibold text-sm mb-1">{q}</div>
      <div className="text-pot-muted text-xs" style={{ lineHeight: 1.45 }}>{a}</div>
    </div>
  )
}
