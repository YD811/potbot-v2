'use client'

import Link from 'next/link'
import { usePots, useAssetPrices, useAllPotStats } from '@/hooks/usePotIndex'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { PotCard } from '@/components/pot-index/PotCard'
import { HowAPotWorks } from '@/components/pot-index/HowAPotWorks'
import { GardenMode } from '@/components/pot-index/GardenMode'
import { Reveal } from './Reveal'
import { FlagshipCard } from './FlagshipCard'
import { PotAnimation } from './PotAnimation'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{children}</p>
}

function H2({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-5xl ${className}`}>{children}</h2>
}

const PROMISES = [
  { t: 'Nobody can reach your money', b: 'The assets sit in a program with no withdraw instruction. Not the creator, not us. You redeem your own token, nobody else can.' },
  { t: 'Leave any time', b: 'Redeem for your share of every asset, or for USDC in one transaction. Exits cannot be paused.' },
  { t: 'Creators earn, never hold', b: '40% of every entry fee goes to the creator. Your money never touches their wallet.' },
]

const GROW = [
  { k: 'Invite and earn', t: 'Share a POTFolio, earn on every deposit', b: '40% of the entry fee goes to whoever brought the holder. Your link is in the dashboard.', cta: 'Get your link', href: '/dashboard' },
  { k: 'Early access', t: 'Be first when mainnet opens', b: 'One email. We write when real money goes live and when a new POTFolio is featured.', cta: 'Join the waitlist', href: '/signup' },
  { k: 'Build in public', t: 'Follow the build', b: 'Every change ships to GitHub and to X the same day. No private roadmap.', cta: 'Follow @PotBot_sol', href: 'https://x.com/PotBot_sol', ext: true },
]


export function LandingV3() {
  const pots = usePots()
  const prices = useAssetPrices()
  const stats = useAllPotStats(pots.data)
  const flagship = POT_INDEX_SETTINGS.flagship
  const live = [...(pots.data ?? [])]
    .sort((a, b) => Number(b.indexMint.toBase58() === flagship) - Number(a.indexMint.toBase58() === flagship))
    .slice(0, 3)

  return (
    <div className="-mt-6 sm:-mt-8">
      {/* Hero */}
      <section className="grid items-center gap-14 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-12 lg:pb-20">
        <div>
          <h1 className="font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
            <span className="v3-line"><span>Your portfolio.</span></span>
            <span className="v3-line"><span className="italic text-pot-accent" style={{ animationDelay: '90ms' }}>One token.</span></span>
          </h1>
          <p className="v3-rise mt-6 max-w-[34em] text-lg text-pot-muted sm:text-xl" style={{ animationDelay: '220ms' }}>
            Creator ETFs without the exit liquidity. Put up to 5 assets in a Pot, hold one token, leave any time. Nobody can reach anyone else&apos;s money.
          </p>
          <div className="v3-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '320ms' }}>
            <Link href="/portfolios" className="btn-primary px-7 py-3 text-base">Explore POTFolios</Link>
            <Link href="/portfolios/new" className="btn-secondary px-7 py-3 text-base">Build your own</Link>
          </div>
        </div>
        <div className="pt-10 lg:pt-0">
          <FlagshipCard />
        </div>
      </section>

      {/* Promises */}
      <section className="grid gap-4 pb-20 sm:grid-cols-3">
        {PROMISES.map((p, i) => (
          <Reveal key={p.t} delay={i * 80} className="rounded-3xl border border-pot-border bg-pot-card p-6">
            <h3 className="font-display text-xl font-semibold text-white">{p.t}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-pot-muted">{p.b}</p>
          </Reveal>
        ))}
      </section>

      {/* What a Pot is */}
      <section className="grid items-center gap-10 pb-20 lg:grid-cols-[.8fr_1.2fr]">
        <Reveal><PotAnimation /></Reveal>
        <Reveal delay={100}>
          <Eyebrow>What a Pot is</Eyebrow>
          <H2 className="mt-3">Assets in. <i className="italic text-pot-accent">One token out.</i></H2>
          <p className="mt-5 max-w-[36em] text-lg text-pot-muted">
            A Pot is an onchain treasury. Tokens, tokenized stocks and real-world assets go in, up to five of them. What comes out is one token that mirrors the whole basket. Hold it, send it, redeem it for the assets or for USDC.
          </p>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="pb-20">
        <Reveal className="mb-8 text-center">
          <H2>How it works</H2>
        </Reveal>
        <Reveal delay={80}><HowAPotWorks compact /></Reveal>
      </section>

      {/* Live now */}
      <section className="pb-20">
        <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <H2>Live now.</H2>
          <Link href="/portfolios" className="btn-secondary px-5 py-2 text-sm">See all POTFolios</Link>
        </Reveal>
        {pots.isLoading && <p className="text-sm text-pot-muted">Reading from the chain…</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {live.map((p, i) => (
            <Reveal key={p.address.toBase58()} delay={i * 80}>
              <PotCard pot={p} prices={prices.data ?? {}} list={stats.data?.[p.address.toBase58()]} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Garden */}
      <Reveal as="section" className="pb-20">
        <GardenMode />
      </Reveal>

      {/* Grow with us */}
      <section className="grid gap-10 border-t border-pot-border pb-20 pt-14 lg:grid-cols-[.8fr_1.2fr]">
        <Reveal>
          <Eyebrow>Community</Eyebrow>
          <H2 className="mt-3">Growth is paid by the protocol, not by ads.</H2>
          <p className="mt-4 max-w-[30em] text-base text-pot-muted">Every deposit splits its fee between the creator, the person who invited the holder, and PotBot. The people who grow the garden get paid first.</p>
        </Reveal>
        <div className="grid gap-3.5 sm:grid-cols-3">
          {GROW.map((g, i) => (
            <Reveal key={g.t} delay={i * 70}>
              {g.ext ? (
                <a href={g.href} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col rounded-2xl border border-pot-border bg-pot-card p-5 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{g.k}</p>
                  <p className="mt-2 text-[17px] font-semibold text-white">{g.t}</p>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-pot-muted">{g.b}</p>
                  <span className="mt-4 text-sm font-semibold text-white">{g.cta}</span>
                </a>
              ) : (
                <Link href={g.href} className="flex h-full flex-col rounded-2xl border border-pot-border bg-pot-card p-5 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{g.k}</p>
                  <p className="mt-2 text-[17px] font-semibold text-white">{g.t}</p>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-pot-muted">{g.b}</p>
                  <span className="mt-4 text-sm font-semibold text-white">{g.cta}</span>
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* Creators / Holders */}
      <section className="grid gap-4 pb-20 lg:grid-cols-2">
        <Reveal className="rounded-[28px] bg-pot-accent p-8 text-[#1A120C] sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.14em] opacity-80">For creators</p>
          <h3 className="mt-3 font-display text-3xl font-semibold leading-tight">Turn your thesis into a token.</h3>
          <p className="mt-3 max-w-[30em] text-base opacity-90">Pick the assets, set the weights, share the link. Earn on every deposit. You never hold anyone&apos;s money.</p>
          <Link href="/portfolios/new" className="mt-6 inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1A120C]/10">Build a POTFolio</Link>
        </Reveal>
        <Reveal delay={80} className="rounded-[28px] p-8 sm:p-10" style={{ background: 'var(--pot-ink)', color: 'var(--pot-bg)' }}>
          <p className="font-mono text-xs uppercase tracking-[0.14em] opacity-70">For holders</p>
          <h3 className="mt-3 font-display text-3xl font-semibold leading-tight">Back an idea. Not copy trading.</h3>
          <p className="mt-3 max-w-[30em] text-base opacity-80">Nobody copies anyone&apos;s trades. Everyone pools into the same basket and holds the same token at the same price.</p>
          <Link href="/portfolios" className="mt-6 inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:opacity-80">Explore POTFolios</Link>
        </Reveal>
      </section>

      {/* Vision */}
      <Reveal as="section" className="pb-12 text-center">
        <h2 className="mx-auto max-w-[22em] font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
          Tokens, stocks and real-world assets, <i className="italic text-pot-accent">in one token.</i> Anything that gets tokenized fits in a Pot.
        </h2>
        <Link href="/portfolios" className="btn-primary mt-7 inline-flex px-7 py-3 text-base">Explore POTFolios</Link>
      </Reveal>
    </div>
  )
}
