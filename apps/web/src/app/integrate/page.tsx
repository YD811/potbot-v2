import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { POT_INDEX_SETTINGS, explorerAddress } from '@/lib/pot-index/registry'

export const metadata: Metadata = {
  title: 'Add POTFolios to your app',
  description:
    'For wallets, Telegram bots and apps: a POTFolio is a normal SPL token with an onchain price. List it, show it, route deposits through it and earn a fee share inside every deposit.',
}

const STEPS = [
  {
    n: '01',
    t: 'List the token',
    b: 'Every POTFolio is an SPL token with a name, symbol and logo set by the program. It shows up in a wallet like any other token. Nothing to build.',
  },
  {
    n: '02',
    t: 'Show what is inside',
    b: 'Read the basket, weights, NAV and price history from the program or from our read API. One call per POTFolio, cached, no key.',
  },
  {
    n: '03',
    t: 'Route a deposit',
    b: 'Build the deposit transaction with our SDK, set your integrator fee and let the holder sign in your app. The fee share lands in your wallet inside the same transaction.',
  },
  {
    n: '04',
    t: 'Redeem anywhere',
    b: 'Redeem for the assets needs no oracle and cannot be paused. Redeem for USDC settles in the same transaction. Both are one signature for the holder.',
  },
]

const API = [
  { path: '/api/pot-index/quotes', what: 'Display prices for every listed asset, keyed by Pyth feed id' },
  { path: '/api/pot-index/nav?mint=<index mint>&range=7d', what: 'Price history and stats for one POTFolio' },
  { path: '/api/pot-index/nav?all=1', what: 'Seven days of history for every POTFolio' },
  { path: 'MCP: @potbot/mcp', what: 'List baskets, read NAV and composition, quote a deposit or a redemption for agents' },
]

export default function IntegratePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="For wallets, bots and apps"
        title="Add POTFolios to your app"
        lede="A POTFolio is a normal SPL token with an onchain price. List it, show what is inside, route deposits through it and earn a share of every deposit you bring. No custody, no key, no permission needed."
      />

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-3xl border border-pot-border bg-pot-card p-6">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{s.n}</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-white">{s.t}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-pot-muted">{s.b}</p>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">What you earn</h2>
        <div className="rounded-3xl border border-pot-border bg-pot-card p-6 text-[15px] leading-relaxed text-pot-muted">
          <p>
            Today on devnet every deposit pays a 0.30% entry fee, split 40% to the creator, 40% to whoever brought the holder and 20% to
            the protocol. The referrer share is yours when the holder deposits through your app. The next program edition adds a
            separate integrator fee you set yourself, capped by the program, paid in the same transaction. Fees are read from the chain
            and shown on every POTFolio page; nothing is hidden in a dashboard.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Read API</h2>
        <div className="overflow-hidden rounded-3xl border border-pot-border bg-pot-card">
          <dl className="divide-y divide-pot-border">
            {API.map((a) => (
              <div key={a.path} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[1fr_1fr] sm:gap-4">
                <dt className="font-mono text-[13px] text-white break-all">{a.path}</dt>
                <dd className="text-[15px] text-pot-muted">{a.what}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-3 text-sm text-pot-muted">
          Program <a href={explorerAddress(POT_INDEX_SETTINGS.programId)} target="_blank" rel="noopener noreferrer" className="font-mono underline decoration-pot-border underline-offset-4 hover:text-white">{POT_INDEX_SETTINGS.programId.slice(0, 8)}…</a> on {POT_INDEX_SETTINGS.cluster}. SDK and IDL in the{' '}
          <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noopener noreferrer" className="underline decoration-pot-border underline-offset-4 hover:text-white">repository</a>.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Why it is safe to list</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[
            'No withdraw instruction in the program. Nobody can reach a holder’s money, including us.',
            'Redeem for the assets cannot be paused and needs no oracle.',
            'Keepers move the basket toward its weights and nothing else, inside limits the program checks.',
            'Three public security reviews; the external audit of the final program comes before mainnet.',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 rounded-2xl border border-pot-border bg-pot-card px-4 py-3 text-[15px] text-white">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pot-green" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-[28px] bg-pot-accent p-8 text-[#1A120C]">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Talk to us before mainnet</h2>
        <p className="mt-3 max-w-[40em] text-[15px] sm:text-base">
          We are lining up the first wallets and bots for the mainnet launch. A listing takes a day; a deposit route takes a week with
          our help. Write to hello@potbot.fun or DM @PotBot_sol.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="https://x.com/PotBot_sol" target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1A120C]/10">DM on X</a>
          <Link href="/for-agents" className="inline-block rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1A120C]/10">Agent guide</Link>
        </div>
      </section>
    </div>
  )
}
