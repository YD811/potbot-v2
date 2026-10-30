import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/v3/Reveal'

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'What PotBot has built, where it stands today, what it needs to reach mainnet, and where it goes after.',
}

const STAGES = [
  { id: 'built', label: 'Built', state: 'done' },
  { id: 'now', label: 'Now', state: 'current' },
  { id: 'need', label: 'What we need', state: 'current' },
  { id: 'mainnet', label: 'Mainnet', state: 'next' },
  { id: 'later', label: 'Later', state: 'later' },
  { id: 'vision', label: 'Vision', state: 'later' },
] as const

const BUILT = [
  { k: '2025', t: 'Started as group trading', b: 'PotBot v1: a Telegram bot for trading together from one wallet. Built at a hackathon in the Netherlands, and won it.' },
  { k: 'May 2026', t: 'The vault', b: 'PotBot v2: a non-custodial group treasury with onchain rules, a Squads multisig and an AI agent that acts only inside limits. A local-track win at Colosseum.' },
  { k: 'Oct 2026', t: 'POTFolio', b: 'The idea in its final shape: any basket of tokenized assets as one token. Program and app live on Solana devnet, submitted to Colosseum Crypto World’s Fair.' },
  { k: 'Program', t: '18 instructions, 40 tests', b: 'Open source. Three public security reviews so far. No withdraw instruction: nobody can move a holder’s assets, including us.' },
  { k: 'Backing', t: 'Grant funded', b: 'Supported by a Superteam Netherlands grant. Built in public in Amsterdam, with the Y-DAO builder community.' },
  { k: 'Speed', t: 'One founder, built with AI', b: 'What took a team a month at our first hackathon now ships in a week. That is how we keep the burn low.' },
]

const NOW = [
  { t: 'Devnet, working end to end', b: 'Create a POTFolio, deposit, hold, redeem for the assets or for USDC. Showcase baskets run on test tokens. Deposits are paused while we move to a new price feed.' },
  { t: 'Raising a pre-seed round', b: 'To take PotBot from devnet to mainnet. Talking to funds and angels now.' },
  { t: 'Preparing the audit', b: 'Audit scope is written and public. Quotes are being collected from security firms.' },
  { t: 'Building the team', b: 'Looking for a technical co-founder first, then a Solana engineer and early contributors.' },
]

const NEED = [
  { n: '01', t: 'An external audit', b: 'One full audit of the final program before the first real deposit. The single biggest item between us and mainnet.' },
  { n: '02', t: 'Engineers', b: 'A technical co-founder who owns the program, and a Solana engineer next to them.' },
  { n: '03', t: 'Launch liquidity', b: 'Seed capital for the first flagship POTFolio and its trading pool, so the token trades from day one.' },
  { n: '04', t: 'Price data', b: 'Reliable onchain prices for tokenized stocks, gold and other real-world assets, beyond the free crypto feeds.' },
  { n: '05', t: 'Partners', b: 'Wallets, Telegram bots and apps that list POTFolios, and creators who launch the first baskets.' },
  { n: '06', t: 'Runway', b: 'Twelve months to ship mainnet, grow the first baskets and reach revenue from fees.' },
]

const MAINNET = [
  { t: 'Audit, then multisig', b: 'Upgrade authority and asset listing behind a multisig with a timelock.' },
  { t: 'One flagship POTFolio', b: 'Real assets, a deposit cap, clearly labelled beta. Then invited creators.' },
  { t: 'Exits through Jupiter', b: 'Redeem to USDC and rebalance through Jupiter’s routing.' },
  { t: 'Trade the token', b: 'A POTFolio/USDC pool, so the token shows up in every wallet and aggregator.' },
  { t: 'Creators and referrers paid', b: 'Earnings per creator and referrer, with share cards for X.' },
  { t: 'Garden levels unlock', b: 'Catalog, verified badge, featured placement and a trading pool as a POTFolio grows.' },
]

const LATER = [
  { t: 'Bigger baskets', b: 'More assets per POTFolio, long-tail tokens and more real-world assets.' },
  { t: 'Managed POTFolios', b: 'The creator adjusts weights inside a public mandate, with a timelock.' },
  { t: 'Community POTFolios', b: 'Holders vote with the token on what goes in.' },
  { t: 'Smart rules', b: 'DCA in, rebalancing rules, and agents that act only inside onchain limits.' },
]

const VISION = [
  { t: 'Any asset inside', b: 'Tokens, stocks, gold, real estate: anything that gets tokenized can sit in a Pot.' },
  { t: 'One token that works everywhere', b: 'Send it, trade it, and later lend it and borrow against it.' },
  { t: 'The rails, not the fund', b: 'PotBot is the protocol. Creators, apps and communities build the baskets.' },
]

function Section({ id, eyebrow, title, lede, children }: { id: string; eyebrow: string; title: React.ReactNode; lede?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-pot-border pt-12">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{eyebrow}</p>
        <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[44px]">{title}</h2>
        {lede && <p className="mt-4 max-w-[38em] text-lg text-pot-muted">{lede}</p>}
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  )
}

function Cards({ items, cols = 'sm:grid-cols-2' }: { items: { k?: string; t: string; b: string }[]; cols?: string }) {
  return (
    <div className={`grid gap-3 ${cols}`}>
      {items.map((f, i) => (
        <Reveal key={f.t} delay={(i % 3) * 70} className="rounded-3xl border border-pot-border bg-pot-card p-6">
          {f.k && <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">{f.k}</p>}
          <h3 className={`font-display text-xl font-semibold text-white ${f.k ? 'mt-2' : ''}`}>{f.t}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-pot-muted">{f.b}</p>
        </Reveal>
      ))}
    </div>
  )
}

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <header>
        <p className="v3-rise font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Roadmap</p>
        <h1 className="mt-3 font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl">
          <span className="v3-line"><span>From devnet to</span></span>
          <span className="v3-line"><span className="italic text-pot-accent" style={{ animationDelay: '90ms' }}>every tokenized asset.</span></span>
        </h1>
        <p className="v3-rise mt-6 max-w-[36em] text-lg text-pot-muted sm:text-xl" style={{ animationDelay: '200ms' }}>
          What we have built, where we stand, what it takes to reach mainnet, and where PotBot goes after.
        </p>
      </header>

      {/* Progress rail */}
      <nav aria-label="Roadmap stages" className="v3-rise mt-10 overflow-x-auto pb-2" style={{ animationDelay: '300ms' }}>
        <ol className="relative flex min-w-[640px] justify-between">
          <span aria-hidden className="absolute left-3 right-3 top-[11px] h-px bg-pot-border" />
          <span aria-hidden className="roadmap-fill absolute left-3 top-[11px] h-px w-[34%] origin-left bg-pot-accent" />
          {STAGES.map((s) => (
            <li key={s.id} className="relative flex flex-col items-center gap-3 text-center">
              <a href={`#${s.id}`} className="group flex flex-col items-center gap-3">
                <span
                  className={`relative z-[1] flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 transition ${
                    s.state === 'done' ? 'border-pot-accent bg-pot-accent' : s.state === 'current' ? 'border-pot-accent bg-[var(--pot-bg)]' : 'border-pot-border bg-[var(--pot-bg)]'
                  }`}
                >
                  {s.state === 'current' && <span className="roadmap-pulse h-2 w-2 rounded-full bg-pot-accent" />}
                </span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.12em] transition group-hover:text-white ${s.state === 'later' || s.state === 'next' ? 'text-pot-muted' : 'text-white'}`}>{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-14 space-y-16">
        <Section id="built" eyebrow="Built" title={<>Three hackathons. <i className="italic text-pot-accent">One idea.</i></>} lede="People putting money to work together, made simple enough to hold as one token.">
          <Cards items={BUILT} cols="sm:grid-cols-2 lg:grid-cols-3" />
        </Section>

        <Section id="now" eyebrow="Now" title="Where we stand" lede="The product works on devnet. The work now is to make it safe and funded for real money.">
          <Cards items={NOW} />
        </Section>

        <Section id="need" eyebrow="What we need" title={<>What it takes to reach <i className="italic text-pot-accent">mainnet.</i></>} lede="We are raising a pre-seed round to cover exactly this list. If you can help with any line, we want to talk.">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NEED.map((f, i) => (
              <Reveal as="li" key={f.t} delay={(i % 3) * 70} className="relative overflow-hidden rounded-3xl border border-pot-border bg-pot-card p-6">
                <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-1 font-display text-[96px] font-semibold leading-none text-pot-accent/10">{f.n}</span>
                <h3 className="relative font-display text-xl font-semibold text-white">{f.t}</h3>
                <p className="relative mt-2 text-[15px] leading-relaxed text-pot-muted">{f.b}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-6 grid gap-3 sm:grid-cols-3">
            <a href="mailto:hello@potbot.fun?subject=PotBot%20pre-seed" className="rounded-2xl bg-pot-accent px-5 py-4 text-[#1A120C] transition duration-200 ease-pot hover:-translate-y-0.5">
              <p className="font-mono text-xs uppercase tracking-[0.14em] opacity-80">Investors</p>
              <p className="mt-1 font-semibold">Talk to the founder</p>
            </a>
            <Link href="/careers" className="rounded-2xl border border-pot-border bg-pot-card px-5 py-4 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Builders</p>
              <p className="mt-1 font-semibold text-white">Join the team</p>
            </Link>
            <Link href="/integrate" className="rounded-2xl border border-pot-border bg-pot-card px-5 py-4 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Partners</p>
              <p className="mt-1 font-semibold text-white">Add POTFolios to your app</p>
            </Link>
          </Reveal>
        </Section>

        <Section id="mainnet" eyebrow="Next" title="Mainnet, carefully" lede="External audit first. Then one capped flagship POTFolio, then invited creators. Target: December 2026, and only after the audit is done.">
          <Cards items={MAINNET} cols="sm:grid-cols-2 lg:grid-cols-3" />
        </Section>

        <Section id="later" eyebrow="Later" title="More kinds of POTFolio">
          <Cards items={LATER} />
        </Section>

        <Section id="vision" eyebrow="Vision" title={<>A DeFi layer for <i className="italic text-pot-accent">real-world assets.</i></>} lede="A Pot can hold any asset. POTFolio makes it one token.">
          <Cards items={VISION} cols="sm:grid-cols-3" />
        </Section>
      </div>

      <Reveal as="section" className="mt-20 rounded-[28px] p-8 sm:p-10" style={{ background: 'var(--pot-ink)', color: 'var(--pot-bg)' }}>
        <h2 className="font-display text-3xl font-semibold leading-tight">Built in public.</h2>
        <p className="mt-3 max-w-[34em] text-base opacity-80">
          The program is open source. Every change goes to GitHub and to X the same day.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:opacity-80">GitHub</a>
          <a href="https://x.com/PotBot_sol" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:opacity-80">Follow @PotBot_sol</a>
          <Link href="/status" className="inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:opacity-80">What is live</Link>
        </div>
      </Reveal>
    </div>
  )
}
