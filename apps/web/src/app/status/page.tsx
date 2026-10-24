import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { POT_INDEX_SETTINGS, explorerAddress } from '@/lib/pot-index/registry'

export const metadata: Metadata = {
  title: 'Status',
  description: 'What is live on PotBot today and what is not yet. Devnet. Mainnet opens after the external audit.',
}

const LIVE: { name: string; note: string }[] = [
  { name: 'Program pot_index', note: 'Deployed and verifiable. Create, deposit, redeem for assets, redeem for USDC, bounded rebalance.' },
  { name: 'Five showcase POTFolios', note: 'Real Pyth prices, test tokens. Keeper running.' },
  { name: 'Web app', note: 'Explore, create, deposit, redeem, dashboard, referral links.' },
  { name: 'MCP for AI agents', note: 'Every POTFolio readable and actionable over MCP.' },
  { name: 'Test USDC faucet', note: 'Get test USDC from any POTFolio page.' },
]

const NOT_YET: { name: string; note: string }[] = [
  { name: 'Mainnet', note: 'Opens after the external audit, with a multisig and a capped flagship POTFolio.' },
  { name: 'External audit', note: 'Three reviews done, one independent. The audit of the final program is next.' },
  { name: 'Jupiter swaps', note: 'Exits to USDC and rebalancing route through Jupiter on mainnet. Not available on devnet.' },
  { name: 'Vaults', note: 'The previous product. Interface being reworked.' },
  { name: 'Telegram digest', note: 'What grew, what fell and why, delivered to your group. On the roadmap.' },
]

const ENDPOINTS: { name: string; href: string; note: string }[] = [
  { name: 'Web API health', href: '/api/health', note: 'Route health check' },
  { name: 'Prices API', href: '/api/prices', note: 'Price feed endpoint' },
  { name: 'Leaderboard API', href: '/api/leaderboard', note: 'Public rankings endpoint' },
]

const PROOF: { k: string; v: string; href?: string; mono?: boolean }[] = [
  { k: 'Network', v: POT_INDEX_SETTINGS.cluster },
  { k: 'Program', v: POT_INDEX_SETTINGS.programId, href: explorerAddress(POT_INDEX_SETTINGS.programId), mono: true },
  { k: 'Program version', v: 'pot_index v1.2, 18 instructions, 40 tests', href: 'https://github.com/YD811/potbot-v2/tree/main/packages/pot-index' },
  { k: 'Security reviews', v: '3 published, none with a critical or high finding', href: 'https://github.com/YD811/potbot-v2/blob/main/docs/potfolio/security.md' },
  { k: 'External audit', v: 'Scope published, quotes requested', href: 'https://github.com/YD811/potbot-v2/pull/104' }, // audit-scope.md lands on main with PR 104,
  { k: 'Upgrade key', v: 'Team key on devnet; Squads multisig before mainnet' },
  { k: 'Incidents', v: 'None reported' },
]

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Status" title="What is live" lede="Devnet. Mainnet opens after the external audit." />

      <section className="mt-10 overflow-hidden rounded-3xl border border-pot-border bg-pot-card">
        <dl className="divide-y divide-pot-border">
          {PROOF.map((row) => (
            <div key={row.k} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted sm:pt-0.5">{row.k}</dt>
              <dd className={`${row.mono ? 'font-mono text-[13px] break-all' : 'text-[15px]'} text-white`}>
                {row.href ? (
                  <a href={row.href} target="_blank" rel="noopener noreferrer" className="underline decoration-pot-border underline-offset-4 transition hover:decoration-pot-muted">{row.v}</a>
                ) : row.v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Section title="Live">
        {LIVE.map((item) => (
          <Row key={item.name} name={item.name} note={item.note} live />
        ))}
      </Section>

      <Section title="Not yet">
        {NOT_YET.map((item) => (
          <Row key={item.name} name={item.name} note={item.note} />
        ))}
      </Section>

      <Section title="Endpoints">
        {ENDPOINTS.map((e) => (
          <a
            key={e.href}
            href={e.href}
            className="flex items-center justify-between gap-4 rounded-3xl border border-pot-border bg-pot-card p-5 transition duration-200 ease-pot hover:-translate-y-0.5 hover:border-pot-muted/60"
          >
            <div>
              <div className="font-semibold text-white">{e.name}</div>
              <div className="text-sm text-pot-muted">{e.note}</div>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">Open</span>
          </a>
        ))}
      </Section>

      <div className="mt-14 flex flex-wrap gap-3">
        <Link href="/portfolios" className="btn-primary">Explore POTFolios</Link>
        <Link href="/mainnet" className="btn-secondary">Security</Link>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Row({ name, note, live }: { name: string; note: string; live?: boolean }) {
  return (
    <div className="flex items-start gap-4 rounded-3xl border border-pot-border bg-pot-card p-5">
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${live ? 'bg-pot-green' : 'border border-pot-muted/60'}`} />
      <div>
        <div className="font-semibold text-white">{name}</div>
        <div className="mt-0.5 text-[15px] text-pot-muted">{note}</div>
      </div>
    </div>
  )
}
