import type { Metadata } from 'next'
import Link from 'next/link'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { HowAPotWorks } from '@/components/pot-index/HowAPotWorks'
import { LivePots } from '@/components/pot-index/LivePots'
import { PageHeader } from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'PotBot POTFolio × Crypto World\'s Fair',
  description:
    'PotBot POTFolio: a basket of Solana assets (crypto, Solana natives, tokenized stocks, memes) as one liquid index token. Built for Colosseum Crypto World\'s Fair, Sept 14 – Oct 12, 2026.',
}

const PROGRAM = POT_INDEX_SETTINGS.programId
const explorer = `https://explorer.solana.com/address/${PROGRAM}?cluster=devnet`

export default function WorldsFairPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Colosseum · Crypto World's Fair · Solana"
        title={<>PotBot <span className="text-pot-green">POTFolio</span></>}
        lede="Any basket of Solana assets as one liquid token. Create a portfolio, hold the token."
        className="mb-6"
      />

      {/* The whole submission in 30 seconds. Everything below is the long version. */}
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-pot-accent">In 30 seconds</p>
        <dl className="mt-4 grid gap-4 text-[15px] leading-relaxed sm:grid-cols-[140px_1fr]">
          <dt className="font-semibold text-white">What</dt>
          <dd className="text-pot-muted">Pick up to 5 Solana assets and weights. The program issues one token that mirrors the basket. Deposit USDC to mint it, redeem any time for the assets or USDC.</dd>
          <dt className="font-semibold text-white">For whom</dt>
          <dd className="text-pot-muted">Holders get one token instead of ten. Creators publish a thesis and earn on every deposit without holding anyone&apos;s money.</dd>
          <dt className="font-semibold text-white">Why trust it</dt>
          <dd className="text-pot-muted">No withdraw instruction. Exit cannot be paused. Keepers bounded by code. Three security reviews, all published.</dd>
          <dt className="font-semibold text-white">Live today</dt>
          <dd className="text-pot-muted">Devnet since Oct 8, five POTFolios, one signature per action, exit to assets or USDC, P&amp;L per wallet.</dd>
        </dl>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/portfolios/Pot6gaQTW8NeMckGDWg4MRGvMaq5QNYimj1xRwQKVka" className="btn-primary text-center">Try it (2 minutes)</Link>
          <a href="https://github.com/YD811/potbot-v2/blob/main/HACKATHON.md" target="_blank" rel="noreferrer" className="btn-secondary text-center">What we built</a>
          <a href={explorer} target="_blank" rel="noreferrer" className="btn-secondary text-center">Program on Explorer</a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['18', 'program instructions'],
          ['40 / 40', 'end-to-end tests'],
          ['3', 'security reviews'],
          ['1', 'signature per action'],
        ].map(([v, l]) => (
          <div key={l} className="card p-4 text-center">
            <p className="text-2xl font-black text-white">{v}</p>
            <p className="mt-1 text-sm text-pot-muted">{l}</p>
          </div>
        ))}
      </div>

      <Section title="Try it in two minutes" summary="Real devnet transactions, test money." open>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open <Link href="/portfolios/Pot6gaQTW8NeMckGDWg4MRGvMaq5QNYimj1xRwQKVka" className="text-pot-green underline">Solana Blue Chips</Link>. Connect a devnet wallet or sign in with email.</li>
          <li><b className="text-white">Get test USDC.</b> 1,000 tUSDC and a little SOL for fees.</li>
          <li><b className="text-white">Deposit 100.</b> One signature. Tokens minted at NAV, then the basket is bought.</li>
          <li><b className="text-white">Redeem</b> for the assets or for USDC. One signature again.</li>
        </ol>
      </Section>

      <Section title="Three hackathons, one idea" summary="Group trading, then vaults, now one token.">
        <ol className="space-y-3">
          <li>
            <b className="text-white">PotBot v1: group trading.</b> At our first Colosseum we came together as a team and built a request from
            Matty Taylor, Colosseum co-founder: arm the group chat. A Telegram bot for trading together from one wallet. It won a local
            track, we kept building, and we did not find product-market fit. So we moved on.
          </li>
          <li>
            <b className="text-white">PotBot v2: the vault.</b> The next hackathon and sprint were research. We found the shape that works:
            a non-custodial vault, capital in program-owned accounts, rules on-chain.
          </li>
          <li>
            <b className="text-white">PotBot v3: POTFolio.</b> The vault as one liquid token. Easy to understand, easy to hold, send, trade
            or redeem. This is the product we keep building after the Fair.
          </li>
        </ol>
      </Section>

      <Section title="What a POTFolio is" summary="One token, a slice of the basket. Nobody can withdraw. Creators earn.">
        <ul className="list-disc space-y-2 pl-5">
          <li><b className="text-white">One token = a slice of the basket.</b> Minted at the basket&apos;s value (NAV), it moves with its assets.</li>
          <li><b className="text-white">No exit liquidity games.</b> Redeem for your share of every asset, or for USDC with an on-chain minimum. 0.5% stays with remaining holders.</li>
          <li><b className="text-white">Nobody can withdraw.</b> Assets sit in program-owned accounts. Not the creator, not PotBot.</li>
          <li><b className="text-white">Keepers inside limits.</b> Toward target only, max 25% per trade, at Pyth prices, or the transaction reverts.</li>
          <li><b className="text-white">Creators earn.</b> 0.30% per deposit, split on-chain: 40% creator, 40% referrer, 20% protocol.</li>
        </ul>
      </Section>

      <Section title="Live on devnet now" summary="Five POTFolios, live Pyth prices, test tokens.">
        <LivePots />
      </Section>

      <Section title="How it works" summary="Invest or create: the four moves.">
        <HowAPotWorks compact />
      </Section>

      <Section title="Creator ETFs, as crypto Twitter asked for" summary="The idea came from CT in Dec 2025. The difference: the creator cannot touch the money.">
        <p>
          On Dec 20, 2025 mert (Helius) and Akshay BD asked for creator-made index funds: a basket built on a public thesis, a fee on AUM.{' '}
          <a className="text-pot-green underline" href="https://x.com/mert/status/2002394652993851679" target="_blank" rel="noreferrer">The thread</a>.
          POTFolio is that product, with one change: the creator earns on deposits but holds nothing. No custody, no manager liability.
        </p>
      </Section>

      <Section title="Where it sits" summary="Symmetry, Cesto, DiversiFi, GLAM, Ondo, and what POTFolio adds.">
        <p>Baskets on Solana exist. New here: a basket that is a token anyone can hold, an exit nobody can pause, keepers bounded by code.</p>
        <CompetitorTable />
      </Section>

      <Section title="Why now, and where it goes" summary="Every asset is moving on-chain. The Pot holds any of it.">
        <p>
          In September 2026 Ondo shipped model portfolios as one token, designed by BlackRock, for eligible investors only. xStocks put
          Tesla and the Nasdaq-100 on Solana as plain tokens. Real-world assets are moving on-chain fast.
        </p>
        <p>
          A Pot is a container for any asset: tokens, stocks, gold, real estate, cars, anything that gets tokenized. POTFolio turns what is
          inside into one index token you can send, lend, borrow against, stake and restake. That is the open layer we are building.
        </p>
      </Section>

      <Section title="Built during the Fair" summary="Sept 14 to Oct 12: program, app, tests, three reviews.">
        <ul className="list-disc space-y-2 pl-5">
          <li><b className="text-white">Program <code>pot_index</code></b>, Anchor 1.2, 18 instructions, from scratch. Devnet since Oct 8, v1.2 at a new address after an independent review.</li>
          <li><b className="text-white">Honest pricing.</b> Pyth prices max 60 s old (hard cap in code), priced at price ± confidence.</li>
          <li><b className="text-white">Atomic rebalancing.</b> Open and close in one transaction, or nothing happens.</li>
          <li><b className="text-white">Exit to USDC in one transaction</b> with an on-chain minimum.</li>
          <li><b className="text-white">One signature per action.</b> Our operator refreshes prices and submits; the program checks everything.</li>
          <li><b className="text-white">40 end-to-end tests, three reviews.</b> No fund-draining path, no critical or high findings. One review caught our own oracle fix not working; we fixed it and published everything.{' '}
            <a className="text-pot-green underline" href="https://github.com/YD811/potbot-v2/blob/main/docs/potfolio/security.md" target="_blank" rel="noreferrer">Report</a></li>
        </ul>
      </Section>

      <Section title="Honest limits, what comes next" summary="Devnet, fixed weights, 5 assets. Then guarded mainnet.">
        <ul className="list-disc space-y-2 pl-5">
          <li>Today: devnet, fixed weights, up to 5 assets, swaps through a test market maker.</li>
          <li>Mainnet: a capped flagship POTFolio, Jupiter swaps, upgrade authority on a multisig.</li>
          <li>Then: Managed and Community POTFolios, 10 assets, a Meteora pool, real-world assets.</li>
        </ul>
        <p>
          <Link href="/roadmap" className="text-pot-green underline">Roadmap</Link> ·{' '}
          <Link href="/mainnet" className="text-pot-green underline">Mainnet plan</Link>
        </p>
      </Section>

      <Section title="Team" summary="Yehor (YD), Amsterdam. Y-DAO, Superteam NL.">
        <p>
          Yehor (YD), founder. 10 years in crypto, BD at Binance and Trust Wallet, runs Y-DAO Amsterdam, helped set up Superteam
          Netherlands. Builds with AI engineering, reviewed by people.{' '}
          <a className="text-pot-green underline" href="https://x.com/PotBot_sol" target="_blank" rel="noreferrer">@PotBot_sol</a> ·{' '}
          <a className="text-pot-green underline" href="https://x.com/CryptoYDao" target="_blank" rel="noreferrer">@CryptoYDao</a>
        </p>
      </Section>
    </div>
  )
}

const ROWS: { name: string; what: string; token: string; exit: string; keepers: string; create: string; earn: string }[] = [
  {
    name: 'PotBot POTFolio',
    what: 'Basket as one SPL token, fixed weights, up to 5 assets',
    token: 'Yes, any wallet',
    exit: 'In kind or USDC, never pausable, on-chain minimum',
    keepers: 'Anyone; bounded on-chain (toward target, 25% cap, Pyth band, atomic)',
    create: 'One transaction, no code',
    earn: '0.30% entry split 40 / 40 / 20 on-chain',
  },
  {
    name: 'Symmetry',
    what: 'Baskets and funds for builders, V3 mainnet beta',
    token: 'Yes',
    exit: 'Via protocol liquidity',
    keepers: 'Protocol engine',
    create: 'SDK / UI',
    earn: 'Manager fees',
  },
  {
    name: 'Cesto',
    what: 'Thematic baskets bought as a bundle (Frontier winner)',
    token: 'No, assets in your wallet',
    exit: 'Sell each asset',
    keepers: 'None',
    create: 'Curated',
    earn: 'No',
  },
  {
    name: 'DiversiFi',
    what: 'Self-rebalancing vaults',
    token: 'Vault shares',
    exit: 'Vault withdraw',
    keepers: 'Protocol keepers',
    create: 'Curated',
    earn: 'No',
  },
  {
    name: 'GLAM',
    what: 'On-chain asset management for funds and managers',
    token: 'Fund shares',
    exit: 'Manager-defined',
    keepers: 'Manager and integrations',
    create: 'Manager setup',
    earn: 'Manager fees',
  },
  {
    name: 'Ondo Intelligent Portfolios',
    what: 'Model portfolios as one token, designed by BlackRock',
    token: 'Yes, eligible investors',
    exit: 'Issuer redemption',
    keepers: 'Issuer',
    create: 'Issuer only',
    earn: 'No',
  },
]

function CompetitorTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-pot-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-white/5 text-white">
          <tr>
            {['', 'What', 'Holdable token', 'Exit', 'Rebalancing', 'Creating', 'Creators earn'].map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={r.name} className={`border-t border-pot-border align-top ${i === 0 ? 'bg-pot-green/5' : ''}`}>
              <td className={`px-3 py-2 font-semibold ${i === 0 ? 'text-pot-green' : 'text-white'}`}>{r.name}</td>
              <td className="px-3 py-2">{r.what}</td>
              <td className="px-3 py-2">{r.token}</td>
              <td className="px-3 py-2">{r.exit}</td>
              <td className="px-3 py-2">{r.keepers}</td>
              <td className="px-3 py-2">{r.create}</td>
              <td className="px-3 py-2">{r.earn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A section that opens on demand: title + one-line summary always visible, the long version inside. */
function Section({ title, summary, open = false, children }: { title: string; summary?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group mt-4 rounded-2xl border border-pot-border bg-pot-card/40 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
        <span>
          <span className="block text-lg font-bold text-white sm:text-xl">{title}</span>
          {summary && <span className="mt-1 block text-[15px] text-pot-muted">{summary}</span>}
        </span>
        <span className="mt-1 shrink-0 text-pot-muted transition group-open:rotate-45" aria-hidden>+</span>
      </summary>
      <div className="space-y-3 px-5 pb-6 text-[15px] leading-relaxed text-pot-muted">{children}</div>
    </details>
  )
}
