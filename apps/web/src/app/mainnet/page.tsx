import type { Metadata } from 'next'
import Link from 'next/link'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { PageHeader } from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Mainnet | PotBot POTfolio',
  description: 'What changes when PotBot POTfolio goes live on Solana mainnet: real assets, any token with a price feed, Jupiter keepers, guarded launch with caps and a multisig.',
}

const isMainnet = POT_INDEX_SETTINGS.cluster === 'mainnet-beta'

export default function MainnetPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Mainnet"
        title="From devnet to real money"
        lede="POTfolio runs on Solana devnet today: test tokens, real Pyth prices, every transaction public. This page is what changes when the same program goes live on mainnet, and what stays limited on purpose at the start."
        className="mb-6"
      />

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-pot-border bg-pot-card px-4 py-3 text-sm">
        <span className="font-semibold text-white">Status</span>
        {isMainnet ? (
          <span className="rounded-full bg-pot-green/15 px-3 py-1 text-pot-green">Live on mainnet, guarded beta</span>
        ) : (
          <>
            <span className="rounded-full bg-pot-accent/15 px-3 py-1 text-white">Devnet, open to testers</span>
            <span className="text-white/70">Mainnet: guarded launch in preparation</span>
          </>
        )}
      </div>

      <Section title="What changes">
        <Grid
          rows={[
            ['Assets', 'Test copies (tSOL, tBTC, tUSDC) minted by us', 'Real SPL tokens: SOL, wBTC, wETH, JitoSOL, xStocks and more'],
            ['Paste a token address', 'Only our 10 test tokens', 'Any token with a Pyth or Switchboard price feed, hundreds at launch'],
            ['Deposit currency', 'Test USDC from the faucet', 'USDC. Deposits from SOL and other assets in development'],
            ['Keepers', 'Our bot fills trades from a test inventory', 'Keepers trade through Jupiter, best route on Solana; anyone can run one'],
            ['Prices', 'Pyth free tier, majors only', 'Pyth Pro (long tail, stocks) plus Switchboard for the rest'],
            ['Fees', '0.30% entry, 0.50% exit', 'Same. No management fee, no performance fee'],
            ['Your token', 'Shows in wallets with name and logo', 'Same, plus a USDC pool on Meteora so it trades on Jupiter and in wallets'],
          ]}
        />
      </Section>

      <Section title="What stays limited at launch, on purpose">
        <ul className="list-disc space-y-2 pl-5">
          <li><b className="text-white">One flagship POTfolio</b> with a hard cap on total size. More baskets open as the cap fills without incident.</li>
          <li><b className="text-white">Up to 5 assets per basket</b>, 10 next.</li>
          <li><b className="text-white">Fixed weights only.</b> Managed and Community POTfolios come after an audit.</li>
          <li><b className="text-white">Beta.</b> The program is tested and reviewed, not yet audited by a third party. Do not deposit what you are not ready to lose.</li>
        </ul>
      </Section>

      <Section title="Safety, in plain words">
        <ul className="list-disc space-y-2 pl-5">
          <li><b className="text-white">Nobody can withdraw.</b> Assets sit in program-owned accounts with no private key. The program has no withdraw instruction, so there is nothing to steal a key for.</li>
          <li><b className="text-white">Exit always works.</b> Redeeming the token needs no oracle, no keeper and no permission. It cannot be paused.</li>
          <li><b className="text-white">Keepers are boxed in.</b> Only toward the target weights, max 25% of the basket per trade, price inside the Pyth band, under-delivery reverts the whole transaction.</li>
          <li><b className="text-white">Upgrades need two people.</b> The program upgrade authority and protocol admin sit in a Squads multisig (2 of 3), not in one wallet.</li>
          <li><b className="text-white">Everything is public.</b> Program source on GitHub, every deposit, trade and exit on Explorer, the activity feed on each POTfolio page.</li>
        </ul>
      </Section>

      <Section title="Launch checklist">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Security pass against the Solana Foundation checklist, tests green.</li>
          <li>Jupiter keeper live on devnet with real routes.</li>
          <li>Program deployed to mainnet, verified on Explorer, authority moved to the multisig.</li>
          <li>Flagship POTfolio created with a cap, first deposit, first rebalance and first exit published with links.</li>
          <li>Third-party audit, then caps lift and creator access opens.</li>
        </ol>
      </Section>

      <Section title="Want in?">
        <p>
          Creators who want a basket on mainnet at launch and holders who want early access: join the waitlist. Testers: devnet is open
          now, test USDC from the faucet on any POTfolio page.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">Join the mainnet waitlist</Link>
          <Link href="/portfolios" className="btn-secondary">Try it on devnet</Link>
          <Link href="/roadmap" className="btn-secondary">Roadmap</Link>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-2xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-white/70">{children}</div>
    </section>
  )
}

function Grid({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/70">
            <th className="py-2 pr-4"></th>
            <th className="py-2 pr-4">Devnet today</th>
            <th className="py-2">Mainnet</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pot-border">
          {rows.map(([k, a, b]) => (
            <tr key={k}>
              <td className="py-2 pr-4 font-semibold text-white">{k}</td>
              <td className="py-2 pr-4">{a}</td>
              <td className="py-2 text-white/85">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
