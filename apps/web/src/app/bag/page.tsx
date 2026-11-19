import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { PageHeader } from '@/components/PageHeader'
import { BagArt } from '@/components/bag/BagArt'
import { WeightBar } from '@/components/bag/WeightBar'
import { CLASSIC_WEIGHTS, OFFICIAL_SLUG } from '@/lib/bag/recipes'
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

const RULES: [string, string][] = [
  ['Build or join a BAG', 'Free. You sign a message, not a transaction, and no funds move. At least two assets, whole percents that add up to 100, up to 3 BAGs built per wallet. You can join as many as you like, and buying a BAG joins it automatically.'],
  ['Buy', 'You pay USDC. Jupiter swaps it into each asset straight into your wallet, one approval per asset. An asset that is not live yet is skipped and the buy splits between the others.'],
  ['PotBot fee', '1% of each swap, buying or selling here, already included in the price you see before you sign. Jupiter keeps a fifth of it. There is no holding fee.'],
  ['Network costs', 'Solana network fees of a fraction of a cent, plus about 0.002 SOL the first time your wallet holds a new asset (a refundable account deposit).'],
  ['Limits (beta)', '$10 to $500 per buy. A swap with a price impact above 2% is stopped before you sign.'],
  ['Creators and inviters', 'The creator of the BAG you buy and the person who invited you earn BAG Points from your buys (+10% of yours). You lose nothing. There is no cash revenue share today.'],
  ['Rebalancing', 'New buys top up the assets you are underweight in first. Nothing is ever sold for you.'],
  ['Risks', 'Unaudited beta, not investment advice. Each token is issued by a third party that can freeze or claw it back. Tokenized stocks are not available to US persons, and Anthropic is not offered in the UK, Canada or Australia. Prices can go to zero. Only use money you can afford to lose.'],
  ['Selling', 'Sell any share of your BAG back to USDC here with one approval per asset, or move and sell the tokens anywhere else. They are yours.'],
]

const FAQ: [string, string][] = [
  ['What is a BAG?', 'A mix of three assets with your own percentages: Bitcoin (cbBTC), Anthropic stock (tokenized ANT) and gold. You set the weights, name it and share the link.'],
  ['How is a BAG different from a POTFolio?', 'A BAG puts the assets themselves in your wallet and works today on mainnet. A POTFolio wraps a basket into one index token and is a devnet demo until its audit. See Learn for the full comparison.'],
  ['What is the PotBot BAG?', 'The official BAG: Bitcoin, Anthropic and gold in equal parts. It is the default choice if you do not want to pick weights yourself.'],
  ['How do invites work?', 'Connect a wallet on any BAG page and copy your invite link. A wallet that joins through it is linked to you for good. Points come from what those wallets buy and hold once buying is open, so invites earn nothing until then.'],
  ['What happens when I save a BAG?', 'Your wallet signs a message that proves the BAG is yours. It is not a transaction and no funds move. The BAG gets its own page and a place in the community list.'],
  ['What does joining a BAG do?', 'It links your wallet to that BAG and its creator. It costs nothing and moves no funds. Buying a BAG joins it automatically, and a wallet can be in several BAGs.'],
  ['Can I buy a BAG today?', BAG_BUY_ENABLED
    ? 'Yes. You pay USDC and approve one swap per live asset, straight into your own wallet. An asset that is not live yet is skipped and the buy splits between the others.'
    : 'Not yet. Buying opens after the Anthropic listing, once the token is live and liquid. Then one click will buy your mix with USDC, straight into your own wallet.'],
  ['Does PotBot hold my money?', 'No. Every buy is a Jupiter swap signed by you. The tokens land in your wallet and you can move or sell them anywhere. There is no PotBot vault or token in this beta.'],
  ['Who issues the tokens?', 'cbBTC by Coinbase, tokenized Anthropic stock by a licensed tokenization issuer, gold by Tether or Paxos. Each issuer can freeze or claw back its token. Read each issuer’s terms.'],
  ['What are BAG Points?', 'A loyalty score for buying through PotBot, holding and bringing people in. Points have no monetary value, are not a token and come with no promise of any airdrop or payout.'],
  ['Who can use it?', 'Not US persons, and not residents of sanctioned countries. Tokenized stocks are not offered in the US. By buying you confirm this and accept that this is an unaudited beta.'],
]

export default async function BagPage() {
  const country = ((await headers()).get('x-vercel-ip-country') ?? '').toUpperCase()
  const blocked = country !== '' && blockedCountries().has(country)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Live beta · Solana mainnet · Season 0"
        title={<>Build your <span className="text-pot-green">BAG</span></>}
        lede="A BAG is a mix of Bitcoin, Anthropic and gold that you buy in one go with USDC. Each asset lands in your own wallet. Buy the PotBot BAG or build your own mix."
      />

      {blocked ? (
        <div className="card p-6 text-pot-muted">BAG is not available in your region.</div>
      ) : (
        <div className="space-y-10">
          <section className="v3-rise card flex flex-col items-center gap-6 border-pot-accent/60 p-5 sm:flex-row sm:p-6" style={{ backgroundImage: 'radial-gradient(circle at 12% 40%, rgba(224,122,79,0.10), transparent 55%)' }}>
            <BagArt className="h-36 w-auto shrink-0 animate-float" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">The official BAG</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">PotBot BAG</h2>
              <p className="mt-2 text-sm text-pot-muted">
                Bitcoin, Anthropic and gold in equal parts. The simple choice if you do not want to pick weights yourself.
              </p>
              <WeightBar weights={CLASSIC_WEIGHTS} legend className="mt-4" />
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={BAG_BUY_ENABLED ? '#buy' : `/bag/${OFFICIAL_SLUG}`} className="btn-primary">{BAG_BUY_ENABLED ? 'Buy the PotBot BAG' : 'Join the PotBot BAG'}</a>
                <a href="#build" className="btn-secondary">Build your own</a>
              </div>
            </div>
          </section>
          {BAG_BUY_ENABLED ? (
            <div id="buy" className="scroll-mt-24"><BagClient title="Buy the PotBot BAG" /></div>
          ) : (
            <div className="card p-5 text-sm text-pot-muted">
              <p className="font-semibold text-white">Buying opens after the Anthropic listing</p>
              <p className="mt-1">
                Once the tokenized stock is live and liquid, one click will buy your mix with USDC, straight into your own wallet.
                Build and share your BAG now, so the wallets that join are already with you on day one.
              </p>
            </div>
          )}
          <div id="build" className="scroll-mt-24"><BagBuilder /></div>
          <BagGallery />
        </div>
      )}


      <section className="mt-12 scroll-mt-24" id="rules">
        <h2 className="font-display text-2xl font-semibold text-white">Rules and fees</h2>
        <p className="mt-2 max-w-[44em] text-sm text-pot-muted">Short version: building is free, buying costs 1%, your assets land in your own wallet and PotBot never holds them.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-pot-border">
          <table className="w-full text-sm">
            <tbody>
              {RULES.map(([k, v]) => (
                <tr key={k} className="border-b border-pot-border/60 last:border-0 align-top">
                  <th scope="row" className="w-[34%] bg-pot-card px-4 py-3 text-left font-semibold text-white">{k}</th>
                  <td className="px-4 py-3 text-pot-muted">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-white">BAG Points · Season 0 “Genesis”</h2>
        <ul className="mt-4 space-y-2 text-sm text-pot-muted">
          <li><span className="text-white">Invite:</span> share your link to the PotBot BAG or to any other BAG. Wallets that join through it are linked to you, and you earn +10% of the points they earn. They lose nothing.</li>
          <li><span className="text-white">Create:</span> wallets that join your own BAG without an invite link are linked to you the same way.</li>
          <li><span className="text-white">Buy:</span> 10 points per $1 bought through potbot.fun/bag, ×2 during Genesis. Confirmed after 7 days if you still hold at least half of what you bought.</li>
          <li><span className="text-white">Hold:</span> 1 point per $1 held per day, up to what you bought through PotBot. ×1.25 for a Full BAG (each leg within 10 percentage points of target).</li>
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
