import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Docs',
  description: 'How POTFolio works, what it costs, how it is secured, and how to build on it.',
}

const GH = 'https://github.com/YD811/potbot-v2/blob/main'

const START = [
  { k: 'Hold', t: 'Hold a basket as one token', b: 'Pick a POTFolio, deposit USDC with one signature, redeem any time for the assets or USDC.', cta: 'Explore POTFolios', href: '/portfolios' },
  { k: 'Create', t: 'Turn your thesis into a token', b: 'Up to 5 assets, weights lock at creation. You earn 40% of every entry fee and never hold anyone’s money.', cta: 'Build a POTFolio', href: '/portfolios/new' },
  { k: 'Build', t: 'Build on the program', b: 'Open source program and SDK. Read the instruction reference, run the tests, write a keeper.', cta: 'Program reference', href: `${GH}/docs/potfolio/program.md`, ext: true },
]

const SECTIONS: { title: string; items: { t: string; b: string; href: string }[] }[] = [
  {
    title: 'Understand it',
    items: [
      { t: 'Overview', b: 'What a POTFolio is, who does what, and what nobody can do.', href: `${GH}/docs/potfolio/overview.md` },
      { t: 'Fees and economics', b: 'Every fee, where it goes, and the planned mainnet pricing.', href: `${GH}/docs/potfolio/fees-and-economics.md` },
      { t: 'Garden levels', b: 'How the plant level is read from the chain and what each level unlocks.', href: `${GH}/docs/potfolio/garden-mode.md` },
      { t: 'FAQ', b: 'Short answers to the questions people ask first.', href: '/faq' },
    ],
  },
  {
    title: 'Trust it',
    items: [
      { t: 'Security', b: 'Three reviews, every finding and its status, the checklist before mainnet.', href: '/mainnet' },
      { t: 'Security review, full text', b: 'Finding by finding, with the code that fixed it.', href: `${GH}/docs/potfolio/security.md` },
      { t: 'Technical decisions', b: 'Choices that are not obvious from the code, with the reason and the cost.', href: `${GH}/docs/potfolio/decisions.md` },
    ],
  },
  {
    title: 'Build on it',
    items: [
      { t: 'Program reference', b: 'Every instruction of pot_index, its accounts and checks.', href: `${GH}/docs/potfolio/program.md` },
      { t: 'Keepers', b: 'How rebalancing works, the bounds the program enforces, how to run one.', href: `${GH}/docs/potfolio/keepers.md` },
      { t: 'Operations', b: 'Environment, scripts, deploy and the mainnet checklist.', href: `${GH}/docs/potfolio/operations.md` },
      { t: 'Source code', b: 'Program, SDK and app on GitHub under MIT.', href: 'https://github.com/YD811/potbot-v2' },
    ],
  },
]

function ItemLink({ href, children, className }: { href: string; children: React.ReactNode; className: string }) {
  return href.startsWith('http') ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  )
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Docs"
        title="How POTFolio works"
        lede="What it is, what it costs, how it is secured, and how to build on it. Start with the path that fits you."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {START.map((s) => (
          <ItemLink key={s.k} href={s.href} className="flex flex-col rounded-3xl border border-pot-border bg-pot-card p-6 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60">
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{s.k}</span>
            <span className="mt-2 font-display text-xl font-semibold text-white">{s.t}</span>
            <span className="mt-2 flex-1 text-[15px] leading-relaxed text-pot-muted">{s.b}</span>
            <span className="mt-5 text-sm font-semibold text-white">{s.cta}</span>
          </ItemLink>
        ))}
      </section>

      {SECTIONS.map((sec) => (
        <section key={sec.title} className="mt-14">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{sec.title}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {sec.items.map((it) => (
              <ItemLink key={it.t} href={it.href} className="block rounded-2xl border border-pot-border bg-pot-card p-5 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60">
                <p className="text-[17px] font-semibold text-white">{it.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-pot-muted">{it.b}</p>
              </ItemLink>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-16 rounded-[28px] bg-pot-accent p-8 text-[#1A120C] sm:p-10">
        <h2 className="font-display text-3xl font-semibold leading-tight">Questions the docs do not answer?</h2>
        <p className="mt-3 max-w-[34em] text-base opacity-90">Ask in public on X. Every answer becomes a docs page.</p>
        <a href="https://x.com/PotBot_sol" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1A120C]/10">Ask @PotBot_sol</a>
      </section>
    </div>
  )
}
