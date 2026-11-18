import Link from 'next/link'

const ROWS: [string, string, string][] = [
  ['What you get', 'The assets themselves, in your own wallet', 'One index token that stands for the whole basket'],
  ['How it is built', 'Jupiter swaps signed by you. No PotBot program holds anything', 'The PotBot program holds the assets and mints the token'],
  ['Stage', 'Live beta on Solana mainnet', 'Demo on devnet with test tokens. Mainnet after an external audit'],
  ['Custody', 'None. PotBot never touches your funds', 'Program-owned accounts with no withdraw instruction'],
  ['Changing the mix', 'Buy more to top up, sell any share, per asset', 'Rebalanced inside the basket, you just hold the token'],
  ['Cost', '1% per swap, buying or selling', 'Deposit and exit fees set per basket'],
  ['Use it elsewhere', 'Each asset is a normal token', 'One token to send, trade or use as collateral'],
]

/** BAG (live router) vs POTFolio (index token, demo): the same idea at two stages. */
export function BagVsPotfolio() {
  return (
    <section id="bag-vs-potfolio" className="scroll-mt-24">
      <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">BAG and POTFolio: one idea, two stages</h2>
      <p className="mt-3 max-w-[44em] text-pot-muted">
        Both let you hold a basket instead of picking assets one by one. A BAG is the simple version that works today. A POTFolio wraps the same basket into a single token, and waits for its audit.
      </p>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-pot-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-pot-border bg-pot-card text-left">
              <th className="w-[22%] px-4 py-3 font-mono text-xs font-normal uppercase tracking-[0.12em] text-pot-muted" />
              <th className="px-4 py-3 font-semibold text-pot-green">BAG <span className="ml-1 rounded-full border border-pot-green px-1.5 py-0.5 font-mono text-[9px] uppercase">live</span></th>
              <th className="px-4 py-3 font-semibold text-white">POTFolio <span className="ml-1 rounded-full border border-pot-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-pot-muted">demo</span></th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([k, a, b]) => (
              <tr key={k} className="border-b border-pot-border/60 align-top last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-white">{k}</th>
                <td className="px-4 py-3 text-pot-muted">{a}</td>
                <td className="px-4 py-3 text-pot-muted">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/bag" className="btn-primary px-5 py-2.5 text-sm">Open BAG</Link>
        <Link href="/portfolios" className="btn-secondary px-5 py-2.5 text-sm">See the POTFolio demo</Link>
      </div>
    </section>
  )
}
