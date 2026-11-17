import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { PageHeader } from '@/components/PageHeader'
import { BagBuilder } from '@/components/bag/BagBuilder'
import { BagClient } from '@/components/bag/BagClient'
import { BagGallery } from '@/components/bag/BagGallery'
import { BAG_BUY_ENABLED, blockedCountries } from '@/lib/bag/config'

export const metadata: Metadata = {
  title: 'Build your BAG: Bitcoin · Anthropic · Gold | PotBot',
  description:
    'Set your own mix of Bitcoin, Anthropic and gold, name it and share it. Build your BAG on Solana with PotBot. Beta.',
  openGraph: {
    title: 'Build your BAG: Bitcoin · Anthropic · Gold',
    description: 'Pick your percentages, name your BAG, share the link. Beta on Solana.',
  },
}

export const dynamic = 'force-dynamic'

const FAQ: [string, string][] = [
  ['What is a BAG?', 'A mix of three assets with your own percentages: Bitcoin (cbBTC), Anthropic stock (tokenized ANT) and gold. You set the weights, name it and share the link.'],
  ['What happens when I save a BAG?', 'Your wallet signs a message that proves the BAG is yours. It is not a transaction and no funds move. The BAG gets its own page and a place in the community list.'],
  ['What does joining a BAG do?', 'It links your wallet to that BAG and its creator. It costs nothing and moves no funds. A wallet can be in one BAG at a time.'],
  ['Can I buy a BAG today?', BAG_BUY_ENABLED
    ? 'Yes. One click buys every live asset with USDC, straight into your own wallet. The Anthropic leg opens after the Nasdaq listing.'
    : 'Not yet. Buying opens after the Anthropic listing, once the token is live and liquid. Then one click will buy your mix with USDC, straight into your own wallet.'],
  ['Does PotBot hold my money?', 'No. Every buy is a Jupiter swap signed by you. The tokens land in your wallet and you can move or sell them anywhere. There is no PotBot vault or token in this beta.'],
  ['What does it cost?', 'Building and joining are free. When buying is open, each swap includes a 1% PotBot fee shown before you sign, plus Solana network fees.'],
  ['Who issues the tokens?', 'cbBTC by Coinbase, tokenized Anthropic stock by a licensed tokenization issuer, gold by Tether or Paxos. Each issuer can freeze or claw back its token. Read each issuer’s terms.'],
  ['What are BAG Points?', 'A loyalty score for buying through PotBot, holding and bringing people in. Points have no monetary value, are not a token and come with no promise of any airdrop or payout.'],
  ['Who can use it?', 'Not US persons, and not residents of sanctioned countries. Tokenized stocks are not offered in the US.'],
]

export default async function BagPage() {
  const country = ((await headers()).get('x-vercel-ip-country') ?? '').toUpperCase()
  const blocked = country !== '' && blockedCountries().has(country)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Beta · Solana · Season 0"
        title={<>Build your <span className="text-pot-green">BAG</span></>}
        lede="Bitcoin · Anthropic · Gold. Set your own mix, name it, share the link."
      />

      {blocked ? (
        <div className="card p-6 text-pot-muted">BAG is not available in your region.</div>
      ) : (
        <div className="space-y-10">
          <BagBuilder />
          <BagGallery />
          {BAG_BUY_ENABLED ? (
            <BagClient title="Buy the classic BAG" />
          ) : (
            <div className="card p-5 text-sm text-pot-muted">
              <p className="font-semibold text-white">Buying opens after the Anthropic listing</p>
              <p className="mt-1">
                Once the tokenized stock is live and liquid, one click will buy your mix with USDC, straight into your own wallet.
                Build and share your BAG now, so the wallets that join are already with you on day one.
              </p>
            </div>
          )}
        </div>
      )}

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ['1. Set your mix', 'Move the sliders. The three assets always add up to 100%.'],
          ['2. Name and share', 'Sign a free message, get your own link and a card for X.'],
          ['3. Grow your BAG', 'Wallets that join are linked to you. Their buys count for you when buying opens.'],
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
          <li><span className="text-white">Create:</span> wallets that join your BAG are linked to you. You earn +10% of the points they earn. They lose nothing.</li>
          <li><span className="text-white">Buy:</span> 10 points per $1 bought through potbot.fun/bag, ×2 during Genesis. Confirmed after 7 days if you still hold at least half of what you bought.</li>
          <li><span className="text-white">Hold:</span> 1 point per $1 held per day, up to what you bought through PotBot. ×1.25 for a Full BAG (each leg within ±10% of target).</li>
          <li><span className="text-white">Refer:</span> your own link works the same way as a BAG: +10% of the points earned by wallets you bring.</li>
          <li><span className="text-white">Early holders</span> are first in line for the PotBot Tamagotchi NFT.</li>
        </ul>
        <p className="mt-3 text-xs text-pot-muted">Buy and hold points start when buying opens. Points have no monetary value, are not a token, and carry no promise of any future token, airdrop or payout. Rules may change during the beta; wash trading and multi-wallet farming are excluded.</p>
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
