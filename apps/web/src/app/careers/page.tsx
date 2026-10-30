import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/v3/Reveal'

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Build PotBot: the protocol for baskets of tokenized assets on Solana. Open roles for a technical co-founder, a Solana engineer and early contributors.',
}

type Role = { t: string; type: string; when: string; b: string; you: string[] }

const ROLES: Role[] = [
  {
    t: 'Technical co-founder',
    type: 'Co-founder · equity',
    when: 'Open now',
    b: 'Own the Anchor program, the audit and the mainnet launch. You set the engineering bar and grow the team after the round.',
    you: ['Shipped Solana programs to mainnet (Anchor, Rust)', 'Think in invariants, limits and failure modes', 'Want to own a protocol, not a ticket queue'],
  },
  {
    t: 'Solana engineer',
    type: 'Full-time · paid',
    when: 'Opens with the pre-seed round',
    b: 'Program work, keepers, SDK and integrations with wallets and bots, next to the technical co-founder.',
    you: ['Anchor and TypeScript', 'Comfortable with oracles, token programs and CPIs', 'Writes tests before anyone asks'],
  },
  {
    t: 'Community and X contributor',
    type: 'Part-time · volunteer · 3 months',
    when: 'Open now',
    b: 'Run the PotBot X account with us: threads, replies, Spaces, the first creator community.',
    you: ['Lives on crypto X and knows the Solana scene', 'Writes short and clear in English', 'Ships something every day'],
  },
  {
    t: 'BD contributor',
    type: 'Part-time · success fee after the round · 3 months',
    when: 'Open now',
    b: 'Bring the first wallets, Telegram bots, creators and ecosystem partners to POTFolio.',
    you: ['Network across Solana projects and communities', 'Comfortable opening a conversation cold', 'Tracks every lead, follows up without being asked'],
  },
]

const HOW = [
  { t: 'Small team, real ownership', b: 'Every person here owns a whole area. No layers between you and the product.' },
  { t: 'Built with AI, every day', b: 'We use AI agents for code, research and operations, so a small team ships like a big one.' },
  { t: 'In public', b: 'Code is open source. Progress goes to GitHub and X the same day.' },
  { t: 'Amsterdam, remote friendly', b: 'Based in Amsterdam with the Y-DAO builder community. Remote works too.' },
]

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <header>
        <p className="v3-rise font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Careers</p>
        <h1 className="mt-3 font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl">
          <span className="v3-line"><span>Build the rails for</span></span>
          <span className="v3-line"><span className="italic text-pot-accent" style={{ animationDelay: '90ms' }}>tokenized everything.</span></span>
        </h1>
        <p className="v3-rise mt-6 max-w-[36em] text-lg text-pot-muted sm:text-xl" style={{ animationDelay: '200ms' }}>
          PotBot turns any basket of tokenized assets into one token. We are on devnet, raising a pre-seed round and heading to mainnet. These are the people we need to get there.
        </p>
      </header>

      <section className="mt-14 space-y-3">
        {ROLES.map((r, i) => (
          <Reveal key={r.t} delay={i * 60}>
            <details className="group rounded-3xl border border-pot-border bg-pot-card p-6 transition hover:border-pot-muted/60 open:border-pot-muted/60 sm:p-7">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white">{r.t}</h2>
                  <p className="mt-1 text-sm text-pot-muted">{r.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${r.when === 'Open now' ? 'bg-pot-green/15 text-pot-green' : 'border border-pot-border text-pot-muted'}`}>{r.when}</span>
                  <span aria-hidden className="text-2xl leading-none text-pot-muted transition group-open:rotate-45">+</span>
                </div>
              </summary>
              <div className="mt-5 grid gap-6 border-t border-pot-border pt-5 sm:grid-cols-[1.2fr_1fr]">
                <p className="text-[15px] leading-relaxed text-pot-muted">{r.b}</p>
                <ul className="space-y-2">
                  {r.you.map((y) => (
                    <li key={y} className="flex items-start gap-2 text-[15px] text-white">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pot-accent" />
                      <span>{y}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a href="https://x.com/PotBot_sol" target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 inline-flex px-5 py-2.5 text-sm">Apply via DM on X</a>
            </details>
          </Reveal>
        ))}
      </section>

      <section className="mt-16 border-t border-pot-border pt-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">How we work</p>
          <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[44px]">Small, fast, in the open.</h2>
        </Reveal>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {HOW.map((h, i) => (
            <Reveal key={h.t} delay={(i % 2) * 70} className="rounded-3xl border border-pot-border bg-pot-card p-6">
              <h3 className="font-display text-xl font-semibold text-white">{h.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-pot-muted">{h.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="mt-16 rounded-[28px] bg-pot-accent p-8 text-[#1A120C] sm:p-10">
        <h2 className="font-display text-3xl font-semibold leading-tight">Not on the list?</h2>
        <p className="mt-3 max-w-[34em] text-base opacity-90">
          Security researchers, designers, lawyers and creators who want to launch a basket: message us anyway. Tell us what you would own.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="https://x.com/PotBot_sol" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1A120C]/10">DM @PotBot_sol</a>
          <Link href="/roadmap#need" className="inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1A120C]/10">What we need</Link>
        </div>
      </Reveal>
    </div>
  )
}
