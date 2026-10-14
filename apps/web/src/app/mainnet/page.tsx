import type { Metadata } from 'next'
import Link from 'next/link'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { PageHeader } from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How PotBot POTFolio keeps assets safe: program-owned accounts with no withdraw instruction, exits that cannot be paused, keepers bounded by code, three security reviews with every finding published, and the checklist before mainnet.',
}

const isMainnet = POT_INDEX_SETTINGS.cluster === 'mainnet-beta'

const REVIEWS: { date: string; who: string; scope: string; result: string }[] = [
  {
    date: 'Oct 8, 2026',
    who: 'Internal',
    scope: 'Initial program against the Solana Foundation program-security checklist.',
    result: 'Oracle age cap, conservative confidence pricing, rebalance deadband and slippage cap, two-step admin transfer. All fixed in code.',
  },
  {
    date: 'Oct 10, 2026',
    who: 'Independent reviewer agent',
    scope: 'After exit to USDC, deposit-and-allocate and the cash-deploy cooldown change. The reviewer had not seen the code being written.',
    result: 'Two mediums, three lows, five informational. Both mediums fixed before the next upgrade.',
  },
  {
    date: 'Oct 11, 2026',
    who: 'Independent engineer',
    scope: 'Full human review of the whole program, draft audit, continuing.',
    result: 'Thirteen findings, none critical or high. One showed our earlier oracle fix did not close the window; fixed, tested and published in the Oct 12 upgrade.',
  },
]

const FINDINGS: { id: string; severity: string; title: string; status: string }[] = [
  { id: 'F1', severity: 'Medium', title: 'Oracle tick shopping through the pull oracle window.', status: 'Fixed. Price window 60 s, cap lowered in code so no admin can widen it. Test added.' },
  { id: 'F2', severity: 'Medium', title: 'Asset registration binds any mint to any price feed.', status: 'Governance. Allowlist published; registration goes behind a multisig with a timelock before mainnet.' },
  { id: 'F3', severity: 'Medium', title: 'Upgrade authority is a single key.', status: 'Governance. Squads 2 of 3 with a timelock before the first mainnet deposit; verified build.' },
  { id: 'F4', severity: 'Low', title: 'Config initialisation callable by whoever is first.', status: 'Fixed. Only the upgrade authority, only the compiled USDC mint. Test added.' },
  { id: 'F5', severity: 'Low', title: 'USDC could be registered as a basket leg.', status: 'Fixed. The cash mint is refused as a leg. Test added.' },
  { id: 'F6', severity: 'Low', title: 'Slippage band is a floor a keeper can take in full.', status: 'Default slippage halved. Same-transaction deploys and Dutch-auction rotations in program v2.' },
  { id: 'F8', severity: 'Low', title: 'A frozen leg vault would block every exit.', status: 'Fixed. Mints with a freeze authority cannot be registered. Test added.' },
  { id: 'M1', severity: 'Medium', title: 'Favourable Pyth tick selectable within the age window.', status: 'Fixed through F1.' },
  { id: 'M2', severity: 'Medium', title: 'Keeper margin on cash deploys was band plus confidence.', status: 'Fixed. Cash deploys priced at mid; rotations stay conservative.' },
  { id: 'O1', severity: 'High (operator)', title: 'Sponsored account rent recoverable by any caller.', status: 'Fixed. The holder pays its own rent. Off-chain flow only; holder funds were never at risk.' },
  { id: 'O2', severity: 'Medium (operator)', title: 'Test market maker quote fixed at prepare time.', status: 'Open on the test path. Mainnet routes through Jupiter at execution time, so the option does not exist.' },
  { id: 'O3', severity: 'Medium (operator)', title: 'Holder transaction carries no minimum of its own.', status: 'Planned. Minimums set from the quote shown, minus about 1%.' },
]

const GUARANTEES: { title: string; body: string }[] = [
  { title: 'No withdraw instruction', body: 'Assets sit in program-owned accounts with no private key. The program can mint, redeem and let keepers swap inside limits. It cannot send assets to anyone. Nobody can reach anyone else’s money.' },
  { title: 'Exit always works', body: 'Redeeming the token for the assets needs no oracle, no keeper and no permission. It cannot be paused.' },
  { title: 'Keepers are boxed in', body: 'Toward the target weights only, at most 25% of the basket per trade, price inside the Pyth band. Under-delivery reverts the whole transaction.' },
  { title: 'Upgrades need two people', body: 'Before the first mainnet deposit the upgrade authority, the protocol admin and asset registration move to a Squads multisig, 2 of 3, with a timelock.' },
  { title: 'Everything is public', body: 'Program source on GitHub, every deposit, trade and exit on Explorer, the activity feed on each POTFolio page, every finding and its status in the repository.' },
]

const CHECKLIST: { step: string; done: boolean }[] = [
  { step: 'Security pass against the Solana Foundation checklist, tests green.', done: true },
  { step: 'Independent review of the whole program, findings fixed and published.', done: true },
  { step: 'External audit of the final program.', done: false },
  { step: 'Program deployed to mainnet, verified on Explorer, authority moved to the multisig.', done: isMainnet },
  { step: 'Flagship POTFolio created with a cap. First deposit, first rebalance and first exit published with links.', done: false },
  { step: 'Caps lift and creator access opens.', done: false },
]

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Security"
        title="Security"
        lede="Open code. No withdraw instruction. Reviewed three times, every finding published. Mainnet opens after the external audit, with a multisig and a capped first POTFolio."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value="3" label="security reviews" />
        <Stat value="0" label="critical or high findings in the program" />
        <Stat value="46" label="tests, run against both builds" />
      </div>

      <Section title="What the program guarantees">
        <div className="grid gap-3 sm:grid-cols-2">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="rounded-3xl border border-pot-border bg-pot-card p-5">
              <h3 className="font-semibold text-white">{g.title}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-pot-muted">{g.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Reviews">
        <div className="space-y-3">
          {REVIEWS.map((r) => (
            <div key={r.date} className="rounded-3xl border border-pot-border bg-pot-card p-5 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-5">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{r.date}</div>
                <div className="mt-1 text-sm text-white">{r.who}</div>
              </div>
              <div className="mt-3 sm:mt-0">
                <p className="text-[15px] text-white">{r.scope}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-pot-muted">{r.result}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Findings and what changed">
        <p>
          The full tables, with every informational item and the adversarial scenarios that pass, are in{' '}
          <a href="https://github.com/YD811/potbot-v2/blob/main/docs/potfolio/security.md" target="_blank" rel="noreferrer" className="text-white underline underline-offset-4">docs/potfolio/security.md</a>.
        </p>
        <div className="overflow-hidden rounded-3xl border border-pot-border bg-pot-card">
          <ul className="divide-y divide-pot-border">
            {FINDINGS.map((f) => (
              <li key={f.id} className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-1 px-5 py-4 sm:grid-cols-[3rem_9rem_1fr]">
                <span className="font-mono text-sm tabular-nums text-pot-muted">{f.id}</span>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted sm:order-none">{f.severity}</span>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[15px] text-white">{f.title}</p>
                  <p className="mt-0.5 text-sm text-pot-muted">{f.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Before mainnet">
        <div className="rounded-3xl border border-pot-border bg-pot-card p-5">
          <ol className="space-y-3">
            {CHECKLIST.map((c, i) => (
              <li key={c.step} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs tabular-nums ${c.done ? 'border-transparent bg-pot-green/15 text-pot-green' : 'border-pot-border text-pot-muted'}`}>
                  {i + 1}
                </span>
                <span className={`text-[15px] ${c.done ? 'text-white' : 'text-pot-muted'}`}>{c.step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-pot-border p-5">
            <h3 className="font-semibold text-white">Limited at launch, on purpose</h3>
            <ul className="mt-2 space-y-1 text-[15px] text-pot-muted">
              <li>One flagship POTFolio with a hard cap on total size.</li>
              <li>Up to 5 assets per basket, 10 next.</li>
              <li>Fixed weights only. Managed and Community POTFolios come after the audit.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-pot-border p-5">
            <h3 className="font-semibold text-white">Known risks</h3>
            <ul className="mt-2 space-y-1 text-[15px] text-pot-muted">
              <li>The assets inside can lose value, and the token follows them.</li>
              <li>Smart-contract risk exists in any program. Do not deposit what you are not ready to lose.</li>
              <li>Keeper slippage up to 1% per rebalance is the cost of keeping the basket at target.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Be there when mainnet opens">
        <p>Creators who want a basket at launch and holders who want early access: leave an address. We write once.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">Join the waitlist</Link>
          <Link href="/status" className="btn-secondary">What is live now</Link>
        </div>
      </Section>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-5">
      <div className="font-mono text-3xl font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-1 text-sm text-pot-muted">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-pot-muted">{children}</div>
    </section>
  )
}
