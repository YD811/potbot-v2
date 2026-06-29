'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * PotBot Documentation — served at /docs (and docs.potbot.fun via a Vercel
 * subdomain rewrite → /docs). Replaces the old /learn page.
 *
 * Structure & framing distilled from the best of:
 *  - Cesto  → "invest in what you believe": a Pot is a narrative basket, self-custodial, transparent.
 *  - Kamino → curator model: the creator manages allocation; honest fee + trust structure.
 *  - Meteora→ composable liquidity: how Pots can earn via LP (Phase 2).
 */

type Phase = 'live' | 'devnet' | 'soon'

const PHASE_LABEL: Record<Phase, { text: string; cls: string }> = {
  live:   { text: '🟢 Live',       cls: 'text-pot-green border-pot-green/40 bg-pot-green/10' },
  devnet: { text: '🟡 Devnet',     cls: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
  soon:   { text: '🔵 Phase 2',    cls: 'text-sky-400 border-sky-400/40 bg-sky-400/10' },
}

function Badge({ phase }: { phase: Phase }) {
  const p = PHASE_LABEL[phase]
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${p.cls}`}>
      {p.text}
    </span>
  )
}

const SECTIONS: { id: string; label: string }[] = [
  { id: 'intro',       label: 'What is PotBot' },
  { id: 'concepts',    label: 'Core concepts' },
  { id: 'lifecycle',   label: 'How a Pot works' },
  { id: 'nav',         label: 'NAV & share tokens' },
  { id: 'assets',      label: 'Assets & weights' },
  { id: 'curators',    label: 'Curators & fees' },
  { id: 'strategies',  label: 'How Pots earn' },
  { id: 'security',    label: 'Security & trust' },
  { id: 'roadmap',     label: 'Roadmap' },
  { id: 'faq',         label: 'FAQ' },
]

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [ids])
  return active
}

// ── Reusable bits ───────────────────────────────────────────────────────────

function H2({ id, children, phase }: { id: string; children: React.ReactNode; phase?: Phase }) {
  return (
    <h2 id={id} className="scroll-mt-24 flex items-center gap-3 text-2xl font-black text-white mb-3">
      {children}
      {phase && <Badge phase={phase} />}
    </h2>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-gray-300 leading-relaxed">{children}</p>
    </div>
  )
}

const FAQ = [
  { q: 'Who controls the money in a Pot?', a: 'No one with a private key. Each Pot’s funds sit in a program-owned vault (a PDA) on Solana. Not the PotBot team, not the Pot creator, not our servers can move them outside the rules written in the program.' },
  { q: 'Can I withdraw whenever I want?', a: 'Yes. You burn your share tokens and receive your proportional slice of the vault at the current NAV. There are no lock-ups in the core v1 product.' },
  { q: 'What is a share / NAV token?', a: 'When you deposit, the Pot mints you an SPL token representing your slice. Its value tracks the Pot’s net asset value (vault balance ÷ total shares). It lives in your own wallet and is composable.' },
  { q: 'Is the program audited?', a: 'The minimal v1 core is being hardened toward an external audit before mainnet handles real capital. Until then, treat anything beyond devnet as experimental. We publish status openly.' },
  { q: 'Is this an investment product?', a: 'PotBot is non-custodial infrastructure for pooling and managing capital on-chain. It is not financial advice, and depending on your jurisdiction, share tokens may carry regulatory implications. Do your own research.' },
]

export default function DocsPage() {
  const active = useScrollSpy(SECTIONS.map((s) => s.id))

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-black text-white">PotBot Docs</h1>
          <span className="text-pot-muted text-sm">docs.potbot.fun</span>
        </div>
        <p className="text-pot-muted max-w-2xl">
          The operating system for programmable on-chain funds. Create a Pot, pool capital,
          hold a transparent basket of assets, and let your share token do the rest — all
          self-custodial on Solana.
        </p>
      </header>

      <div className="grid md:grid-cols-[220px_1fr] gap-10">
        {/* Sidebar */}
        <aside className="hidden md:block">
          <nav className="sticky top-24 space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block px-3 py-1.5 rounded-lg text-sm transition ${
                  active === s.id
                    ? 'bg-pot-green/10 text-pot-green font-semibold'
                    : 'text-pot-muted hover:text-white'
                }`}
              >
                {s.label}
              </a>
            ))}
            <div className="pt-4">
              <Link href="/create" className="btn-primary text-sm py-2 px-4 w-full text-center block">
                Create a Pot →
              </Link>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <article className="min-w-0 space-y-16">

          {/* 1. Intro */}
          <section>
            <H2 id="intro">Invest in what you believe</H2>
            <p className="text-gray-300 leading-relaxed mb-4">
              A <strong className="text-white">Pot</strong> is a programmable investment fund you can
              spin up in seconds. Think of it as a basket built around a thesis — a Solana-ecosystem
              bet, an AI-narrative play, a stablecoin yield pool, a group of friends investing together.
              People deposit, receive NAV-backed share tokens, and the Pot holds a transparent, on-chain
              portfolio that anyone can inspect down to the last lamport.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Card title="Self-custodial">
                Funds live in a program-owned vault. PotBot never takes custody — your share token
                sits in your own wallet, always.
              </Card>
              <Card title="Transparent">
                Every asset, its weight, and every transaction the Pot has ever made are public on Solana.
                No black boxes.
              </Card>
              <Card title="Composable">
                Your share is a real SPL token — transferable, tradeable, and usable across DeFi.
              </Card>
            </div>
          </section>

          {/* 2. Concepts */}
          <section>
            <H2 id="concepts">Core concepts</H2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Card title="🫙 Pot">
                The fund itself: an on-chain account holding configuration and the running share total.
                Created by anyone; identified by a Program Derived Address (PDA).
              </Card>
              <Card title="🔐 Vault">
                A separate PDA that holds the Pot’s capital. It has no private key — only the
                program can move funds, and only by the rules in the code. Each Pot has its own vault, so
                funds are fully isolated.
              </Card>
              <Card title="🎟️ Share / NAV token">
                A per-Pot SPL token minted to you on deposit and burned on withdrawal. Its value tracks
                the Pot’s net asset value.
              </Card>
              <Card title="🧑‍🌾 Curator (creator)">
                The person who creates and manages a Pot’s strategy. They set the allocation and
                parameters — but, by design, can never withdraw other members’ funds.
              </Card>
            </div>
          </section>

          {/* 3. Lifecycle */}
          <section>
            <H2 id="lifecycle" phase="devnet">How a Pot works</H2>
            <p className="text-pot-muted mb-6 max-w-2xl">
              Four steps, all enforced on-chain. No human touches pooled money at any point.
            </p>
            <ol className="space-y-3">
              {[
                ['1 · Create', 'A curator creates the Pot. The program initializes the Pot account, a vault PDA, and the Pot’s own share-token mint (mint authority = the Pot itself, no private key).'],
                ['2 · Deposit', 'You send SOL into the vault. The program mints you shares proportional to your contribution: the first deposit is 1:1, later deposits get shares = amount × total_shares ÷ vault_balance. Tokens land in your wallet.'],
                ['3 · Hold & manage', 'The Pot holds its basket. NAV updates automatically from on-chain balances. (Trading, rebalancing and yield strategies arrive in Phase 2, gated behind an audit.)'],
                ['4 · Withdraw', 'Burn your shares and the program pays you your proportional slice of the vault at the current NAV. Always open, no lock-up.'],
              ].map(([t, d]) => (
                <li key={t} className="card p-5 flex gap-4">
                  <span className="text-pot-green font-black shrink-0">{t}</span>
                  <span className="text-sm text-gray-300 leading-relaxed">{d}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 4. NAV */}
          <section>
            <H2 id="nav">NAV &amp; share tokens</H2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Net Asset Value is the worth of one share. Because the share supply and the vault balance
              both live on-chain, NAV cannot be faked or manipulated off-chain:
            </p>
            <pre className="card p-4 text-sm text-pot-green overflow-x-auto mb-4">
{`NAV per share   = vault_value / total_share_supply
deposit shares  = (supply == 0) ? amount
                                : amount * supply / vault_before
withdraw payout = vault_value * shares_burned / supply`}
            </pre>
            <p className="text-gray-300 leading-relaxed">
              The single source of truth for total shares is the SPL mint supply itself. Your share token
              is a normal token: hold it, send it, or use it elsewhere in DeFi — and redeem it against
              the vault at any time.
            </p>
          </section>

          {/* 5. Assets */}
          <section>
            <H2 id="assets" phase="soon">Assets &amp; weights</H2>
            <p className="text-gray-300 leading-relaxed mb-4">
              A Pot can target up to <strong className="text-white">10 assets</strong>, with weights that
              sum to <strong className="text-white">100%</strong>. Every asset comes from a curated,
              verified registry — organised by category and risk tier so curators build with known,
              vetted tokens rather than arbitrary mints.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <Card title="Categories">
                SOL &amp; LSTs, stablecoins, blue chips, DeFi, AI, infrastructure, RWAs, yield assets,
                tokenized stocks (xStocks), and — clearly flagged — memes.
              </Card>
              <Card title="Safety rails">
                Only <em>verified, enabled</em> assets can be added. Each has a per-Pot weight cap and a
                risk tier; risky assets require an explicit acknowledgement before they go into a Pot.
              </Card>
            </div>
            <p className="text-sm text-pot-muted">
              Mint addresses are verified against the Jupiter token list before an asset is ever enabled.
              Nothing unverified is selectable — protecting depositors from scam tokens by default.
            </p>
          </section>

          {/* 6. Curators & fees */}
          <section>
            <H2 id="curators">Curators &amp; fees</H2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Choosing a Pot is choosing a <strong className="text-white">curator and their strategy</strong>.
              A curator constructs the portfolio: which assets, what weights, when to rebalance. Several
              Pots can target the same asset — each with a different curator, allocation, and track record.
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border border-pot-border rounded-xl overflow-hidden">
                <thead className="bg-pot-card/60 text-white">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Fee</th>
                    <th className="text-left px-4 py-2 font-semibold">Who</th>
                    <th className="text-left px-4 py-2 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-t border-pot-border">
                    <td className="px-4 py-2">No deposit fee</td>
                    <td className="px-4 py-2">—</td>
                    <td className="px-4 py-2">Joining a Pot costs only a normal network fee.</td>
                  </tr>
                  <tr className="border-t border-pot-border">
                    <td className="px-4 py-2">Performance fee</td>
                    <td className="px-4 py-2">Curator</td>
                    <td className="px-4 py-2">% of profits only — never charged on a loss.</td>
                  </tr>
                  <tr className="border-t border-pot-border">
                    <td className="px-4 py-2">Management fee</td>
                    <td className="px-4 py-2">Curator</td>
                    <td className="px-4 py-2">Small annual % of assets for ongoing management.</td>
                  </tr>
                  <tr className="border-t border-pot-border">
                    <td className="px-4 py-2">Withdrawal penalty</td>
                    <td className="px-4 py-2">Back to the Pot</td>
                    <td className="px-4 py-2">Returned to remaining members to discourage hit-and-run capital.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-pot-muted">
              Trust feature (planned): curators can lock their own capital into the Pot with a cooldown —
              real skin in the game, so they can’t exit ahead of depositors.
            </p>
          </section>

          {/* 7. Strategies */}
          <section>
            <H2 id="strategies" phase="soon">How Pots earn</H2>
            <div className="grid sm:grid-cols-3 gap-3">
              <Card title="Hold">
                The simplest strategy: hold the basket. NAV moves with the assets. Available from day one.
              </Card>
              <Card title="Liquidity (LP)">
                Pair assets with SOL/USDC and provide liquidity on Meteora’s DLMM / DAMM pools to earn
                trading fees — the reason Pots hold native SOL. Arrives in Phase 2.
              </Card>
              <Card title="Yield">
                Route idle capital into vetted lending/yield venues. Phase 2, behind per-protocol exposure caps.
              </Card>
            </div>
            <p className="text-sm text-pot-muted mt-4">
              Every active strategy runs through on-chain limits (max swap size, daily budget, allow-lists)
              and — where the Pot opts in — member governance. Automation can <em>propose</em>, but
              never moves money without the rules being satisfied.
            </p>
          </section>

          {/* 8. Security */}
          <section>
            <H2 id="security">Security &amp; trust</H2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Card title="🔐 Owned by code, not people">
                The vault is a PDA with no private key. The PotBot team literally cannot move your funds.
              </Card>
              <Card title="👀 Fully on-chain & public">
                Vault address, balance, and every transaction are verifiable on Solana. Never take our word for it.
              </Card>
              <Card title="🧊 Isolation">
                Each Pot has its own vault — no shared honeypot of user funds. A problem in one Pot can’t reach another.
              </Card>
              <Card title="🛡️ Audit-gated mainnet">
                The minimal core is being hardened and audited before mainnet handles real capital. Status is published openly.
              </Card>
            </div>
            <div className="mt-4 p-4 rounded-xl border border-yellow-400/30 bg-yellow-400/5 text-sm text-yellow-100/90">
              <strong>Not financial advice.</strong> PotBot is non-custodial infrastructure. Crypto is volatile,
              and depending on your jurisdiction, pooled funds and share tokens may carry regulatory implications.
              Invest only what you can afford to lose.
            </div>
          </section>

          {/* 9. Roadmap */}
          <section>
            <H2 id="roadmap">Roadmap</H2>
            <div className="space-y-2">
              {[
                ['Phase 1 · Core', 'live', 'Create, deposit, withdraw, NAV-backed share token. The minimal trustless primitive.'],
                ['Phase 1 · Mainnet', 'devnet', 'Harden + audit the core, deploy to mainnet with deposit caps and a multisig upgrade authority.'],
                ['Phase 2 · Multi-asset', 'soon', 'Asset registry, weighted baskets, swaps via Jupiter, LP on Meteora.'],
                ['Phase 3 · Curators', 'soon', 'Public curators with track records, performance fees, skin-in-the-game lockups.'],
              ].map(([t, ph, d]) => (
                <div key={t as string} className="card p-4 flex items-start gap-3">
                  <Badge phase={ph as Phase} />
                  <div>
                    <div className="font-semibold text-white text-sm">{t}</div>
                    <div className="text-sm text-gray-300 leading-relaxed">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 10. FAQ */}
          <section>
            <H2 id="faq">FAQ</H2>
            <div className="space-y-2">
              {FAQ.map((item) => (
                <details key={item.q} className="group border border-pot-border rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-pot-card/50 transition">
                    <span className="text-sm font-medium text-white">{item.q}</span>
                    <span className="shrink-0 text-pot-muted transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <div className="px-5 pb-5 bg-pot-card/30">
                    <p className="text-sm text-gray-300 leading-relaxed">{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="p-8 rounded-2xl border border-pot-border bg-pot-card/50 text-center">
            <h2 className="text-xl font-black text-white mb-2">Ready to build a Pot? 🚀</h2>
            <p className="text-sm text-pot-muted mb-5">The fastest way to learn is to peek inside a live Pot.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/pots" className="btn-primary text-sm py-2.5 px-6">Browse Pots →</Link>
              <Link href="/create" className="btn-secondary text-sm py-2.5 px-6">Create your own →</Link>
            </div>
          </section>
        </article>
      </div>
    </div>
  )
}
