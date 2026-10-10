import Link from 'next/link'

const STEPS = [
  {
    n: '01',
    title: 'Create a Pot',
    body: 'Pick 2–5 Solana assets and target weights. The program issues an empty index token. Weights are locked — depositors know exactly what they buy.',
    tag: 'creator · 60 seconds',
  },
  {
    n: '02',
    title: 'Deposit USDC, mint the token',
    body: 'USDC goes into the Pot; you receive index tokens at the current NAV, priced by Pyth in the same transaction. 0.30% entry fee is split between creator, referrer and protocol on-chain.',
    tag: 'anyone · one transaction',
  },
  {
    n: '03',
    title: 'Keepers rebalance within limits',
    body: 'Anyone can move the Pot toward its targets, but the program enforces the box: overweight → underweight only, never past target, capped per trade, inside a Pyth price band. Under-delivery reverts the whole transaction.',
    tag: 'permissionless · bounded',
  },
  {
    n: '04',
    title: 'Exit in kind, any time',
    body: 'Burn the token and receive your share of every asset inside. No oracle, no pause switch. 0.50% stays in the Pot for the holders who remain. Or just sell the token.',
    tag: 'holder · always open',
  },
]

export function HowAPotWorks({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? '' : 'mx-auto max-w-6xl px-4 py-16'}>
      {!compact && (
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-3">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-pot-green/60" />
            <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-pot-green">How a Pot works</span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-pot-green/60" />
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">Four moves. No withdraw button.</h2>
        </div>
      )}
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="card relative p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs text-pot-green">{s.n}</span>
              <span className="rounded-full border border-pot-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-pot-muted">{s.tag}</span>
            </div>
            <h3 className="mb-2 font-semibold text-white">{s.title}</h3>
            <p className="text-sm leading-relaxed text-pot-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      {!compact && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/portfolios" className="btn-primary">See live Pots</Link>
          <Link href="/worldsfair" className="btn-secondary">What we built for the World&apos;s Fair</Link>
        </div>
      )}
    </section>
  )
}
