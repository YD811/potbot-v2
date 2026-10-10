import Link from 'next/link'

const STEPS = [
  {
    n: '01',
    title: 'Create a POTfolio',
    body: 'Pick up to 5 assets and their weights. The program issues the index token. Weights are locked, so holders know exactly what they own.',
    tag: 'creator',
  },
  {
    n: '02',
    title: 'Deposit USDC, get the token',
    body: 'Tokens are minted at the live value of the basket (Pyth prices, same transaction). 0.30% entry fee goes to creator, referrer and protocol.',
    tag: 'one signature',
  },
  {
    n: '03',
    title: 'Keepers buy the basket',
    body: 'Keepers are bots (ours, partners or yours) that turn USDC into the target assets. The program sets the limits: toward target only, max 25% per trade, inside the Pyth price band.',
    tag: 'rules on-chain',
  },
  {
    n: '04',
    title: 'Exit any time',
    body: 'Burn the token and receive your share of every asset. Nothing is sold on other holders, no pause switch. 0.50% stays in the Pot. Or just sell the token.',
    tag: 'always open',
  },
]

export function HowAPotWorks({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? '' : 'mx-auto max-w-6xl px-4 py-16'}>
      {!compact && (
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">How a POTfolio works</h2>
        </div>
      )}
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="card relative p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs text-pot-green">{s.n}</span>
              <span className="rounded-full border border-pot-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">{s.tag}</span>
            </div>
            <h3 className="mb-2 font-semibold text-white">{s.title}</h3>
            <p className="text-sm leading-relaxed text-white/70">{s.body}</p>
          </li>
        ))}
      </ol>
      {!compact && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/portfolios" className="btn-primary">See live POTfolios</Link>
          <Link href="/worldsfair" className="btn-secondary">What we built for the World&apos;s Fair</Link>
        </div>
      )}
    </section>
  )
}
