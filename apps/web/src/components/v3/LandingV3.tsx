'use client'

import Link from 'next/link'
import { usePots, useAssetPrices, useAllPotStats } from '@/hooks/usePotIndex'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { PotCard } from '@/components/pot-index/PotCard'
import { PotCardSkeletonGrid } from '@/components/pot-index/PotCardSkeleton'
import { HowAPotWorks } from '@/components/pot-index/HowAPotWorks'
import { GardenMode } from '@/components/pot-index/GardenMode'
import { Reveal } from './Reveal'
import { FlagshipCard } from './FlagshipCard'
import { PotAnimation } from './PotAnimation'
import { HeroGlow } from './HeroGlow'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{children}</p>
}

function H2({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-5xl ${className}`}>{children}</h2>
}

const PROMISES = [
  { t: 'No withdraw instruction', b: 'The assets sit in a program that has no way to move them out except your own redemption. Not the creator, not us.' },
  { t: 'Leave any time', b: 'Redeem for your share of every asset, or for USDC in one transaction. Exits cannot be paused.' },
  { t: 'Creators earn, never hold', b: '40% of every entry fee goes to the creator. Your money never touches their wallet.' },
]

const NEEDS = [
  { t: 'External audit', b: 'One full audit of the final program before real money.' },
  { t: 'Engineers', b: 'A technical co-founder and a Solana engineer.' },
  { t: 'Launch liquidity', b: 'Seed for the first flagship POTFolio and its pool.' },
  { t: 'Partners', b: 'Wallets, bots and creators who launch the first baskets.' },
]

const STATUS = [
  { t: 'Built', s: 'done' },
  { t: 'Devnet', s: 'done' },
  { t: 'Raise', s: 'now' },
  { t: 'Audit', s: 'next' },
  { t: 'Mainnet', s: 'next' },
] as const

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
      <section className="relative isolate grid items-center gap-14 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-12 lg:pb-20">
        <HeroGlow />
        <div>
          <Link href="/roadmap" className="v3-rise mb-7 inline-flex items-center gap-2.5 rounded-full border border-pot-border bg-pot-card/60 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-pot-muted backdrop-blur transition hover:border-pot-muted/60 hover:text-white">
            <span className="v3-live-dot h-1.5 w-1.5 rounded-full bg-pot-green" />
            Live on Solana devnet · Audit next · Raising pre-seed
          </Link>
          <h1 className="font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
            <span className="v3-line"><span>Your portfolio.</span></span>
            <span className="v3-line"><span className="italic text-pot-accent" style={{ animationDelay: '90ms' }}><span className="v3-sheen">One token.</span></span></span>
          </h1>
          <p className="v3-rise mt-6 max-w-[34em] text-lg text-pot-muted sm:text-xl" style={{ animationDelay: '220ms' }}>
            Crypto, tokenized stocks and real-world assets in one basket. Hold one token for all of it, redeem for what is inside any time.
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
            A Pot is an onchain treasury. Tokens, tokenized stocks and real-world assets go in. What comes out is one token that mirrors the whole basket. Hold it, send it, redeem it for the assets or for USDC.
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
          <div>
            <H2>Live now.</H2>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-pot-muted">On Solana devnet · test tokens</p>
          </div>
          <Link href="/portfolios" className="btn-secondary px-5 py-2 text-sm">See all POTFolios</Link>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pots.isLoading && <PotCardSkeletonGrid count={3} />}
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

      {/* Where we are / what we need */}
      <section className="mb-20 overflow-hidden rounded-[32px] border border-pot-border bg-pot-card">
        <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-[.9fr_1.1fr]">
          <Reveal>
            <Eyebrow>Where we are</Eyebrow>
            <H2 className="mt-3">Built. Now we go <i className="italic text-pot-accent">to mainnet.</i></H2>
            <p className="mt-4 max-w-[30em] text-base text-pot-muted">
              The program works end to end on devnet. We are raising a pre-seed round to fund the audit, the team and the launch.
            </p>
            <ol className="mt-8 flex items-center gap-0">
              {STATUS.map((st, i) => (
                <li key={st.t} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${st.s === 'done' ? 'bg-pot-accent' : st.s === 'now' ? 'v3-live-dot bg-pot-green' : 'border border-pot-muted/60'}`} />
                    <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${st.s === 'next' ? 'text-pot-muted' : 'text-white'}`}>{st.t}</span>
                  </div>
                  {i < STATUS.length - 1 && <span className={`mx-1 mb-6 h-px flex-1 ${st.s === 'done' ? 'bg-pot-accent' : 'bg-pot-border'}`} />}
                </li>
              ))}
            </ol>
          </Reveal>
          <div>
            <Reveal><p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">What we need</p></Reveal>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {NEEDS.map((n, i) => (
                <Reveal key={n.t} delay={i * 60} className="rounded-2xl border border-pot-border p-5" style={{ background: 'var(--pot-bg)' }}>
                  <p className="font-semibold text-white">{n.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-pot-muted">{n.b}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120} className="mt-6 flex flex-wrap gap-3">
              <a href="mailto:hello@potbot.fun?subject=PotBot%20pre-seed" className="btn-primary px-5 py-2.5 text-sm">Investors: talk to us</a>
              <Link href="/careers" className="btn-secondary px-5 py-2.5 text-sm">Join the team</Link>
              <Link href="/roadmap#need" className="px-2 py-2.5 text-sm font-semibold text-white underline-offset-4 hover:underline">Full roadmap</Link>
            </Reveal>
          </div>
        </div>
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
