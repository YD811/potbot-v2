import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { PageHeader } from '@/components/PageHeader'
import { BagClient } from '@/components/bag/BagClient'
import { blockedCountries } from '@/lib/bag/config'

export const metadata: Metadata = {
  title: 'BAG — Bitcoin · Anthropic · Gold | PotBot',
  description:
    'Hold the BAG: Bitcoin, Anthropic and gold in one click on Solana. Non-custodial, swaps by Jupiter, straight into your wallet. Beta.',
  openGraph: {
    title: 'Hold the BAG — Bitcoin · Anthropic · Gold',
    description: 'Three assets that define this decade, one click, your own wallet. Beta on Solana.',
  },
}

export const dynamic = 'force-dynamic'

const FAQ: [string, string][] = [
  ['What is the BAG?', 'An equal-weight basket of three assets: Bitcoin (cbBTC), Anthropic stock (tokenized ANT) and gold. One click buys all three with USDC, straight into your own wallet.'],
  ['Does PotBot hold my money?', 'No. Every leg is a Jupiter swap signed by you. The tokens land in your wallet and you can move or sell them anywhere. There is no PotBot vault or token in this beta.'],
  ['Why these three?', 'Bitcoin is the hard-money bet, gold is the oldest hedge, and Anthropic is a bet on frontier AI. Three different risks in one bag.'],
  ['What does it cost?', 'Jupiter routing plus a small PotBot integrator fee on each swap, shown before you sign, and Solana network fees.'],
  ['Who issues the tokens?', 'cbBTC by Coinbase, tokenized Anthropic stock by a licensed tokenization issuer, gold by Tether or Paxos. Each issuer can freeze or claw back its token. Read each issuer’s terms.'],
  ['What are BAG Points?', 'A loyalty score for buying through PotBot and holding. Points have no monetary value, are not a token and come with no promise of any airdrop or payout.'],
  ['Who can use it?', 'Not US persons, and not residents of sanctioned countries. Tokenized stocks are not offered in the US.'],
]

export default async function BagPage() {
  const country = ((await headers()).get('x-vercel-ip-country') ?? '').toUpperCase()
  const blocked = country !== '' && blockedCountries().has(country)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Beta · Solana mainnet · non-custodial"
        title={<>Hold the <span className="text-pot-green">BAG</span></>}
        lede="Bitcoin · Anthropic · Gold. One click, three assets, your own wallet."
      />

      {blocked ? (
        <div className="card p-6 text-pot-muted">BAG is not available in your region.</div>
      ) : (
        <BagClient />
      )}

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ['1. Pay USDC', 'Pick an amount. We split it across the three legs, underweight legs first.'],
          ['2. Sign once', 'Jupiter finds the best route for each leg. You approve all swaps in one wallet prompt.'],
          ['3. Hold & earn points', 'Tokens land in your wallet. Holding a balanced BAG earns BAG Points every day.'],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <p className="font-semibold text-white">{t}</p>
            <p className="mt-2 text-sm text-pot-muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-white">BAG Points · Season 0 “Genesis”</h2>
        <ul className="mt-4 space-y-2 text-sm text-pot-muted">
          <li><span className="text-white">Buy:</span> 10 points per $1 bought through potbot.fun/bag, ×2 during Genesis. Confirmed after 7 days if you still hold at least half of what you bought.</li>
          <li><span className="text-white">Hold:</span> 1 point per $1 held per day, up to what you bought through PotBot. ×1.25 for a Full BAG (each leg within ±10% of target).</li>
          <li><span className="text-white">Refer:</span> +10% of the points earned by wallets you bring. They lose nothing.</li>
          <li><span className="text-white">Early holders</span> are first in line for the PotBot Tamagotchi NFT.</li>
        </ul>
        <p className="mt-3 text-xs text-pot-muted">Points have no monetary value, are not a token, and carry no promise of any future token, airdrop or payout. Rules may change during the beta; wash trading and multi-wallet farming are excluded.</p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-white">FAQ</h2>
        <dl className="mt-4 space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold text-white">{q}</dt>
              <dd className="mt-1 text-sm text-pot-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
