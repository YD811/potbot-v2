import type { Metadata } from 'next'
import Link from 'next/link'
import { HowAPotWorks } from '@/components/pot-index/HowAPotWorks'
import { FeeCalculator } from '@/components/pot-index/FeeCalculator'
import { STAGES } from '@/lib/pot-index/garden'
import { PageHeader } from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Learn: what is a POTFolio?',
  description:
    'POTFolios, Vaults and the Bot, explained in plain words: how the index token is minted and redeemed, who can and cannot touch the assets, fees, keepers and Garden levels.',
}

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Learn"
        title="What a POTFolio is"
        lede="A basket of Solana assets issued as one liquid token. Create a portfolio, hold the token. Deposit USDC to mint it at the current value of the basket, redeem it any time for every asset inside or for USDC. No withdraw instruction."
      />

      <Section title="What a POTFolio is">
        <HowAPotWorks compact />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Point title="One Pot, one program-owned wallet">
            The Pot is a PDA: an address derived from the program, with no private key. It owns one token account per asset in the
            basket plus one for USDC that has not been bought into assets yet.
          </Point>
          <Point title="One token, a slice of everything inside">
            The index token supply is the only record of ownership. Your share of the Pot is your tokens divided by total supply. Send
            the token and you send the share.
          </Point>
          <Point title="No withdraw instruction">
            The program can mint, redeem, and let keepers swap inside limits. It cannot send assets to anyone. Nobody can reach anyone
            else&apos;s money: not the creator, not PotBot, not an admin.
          </Point>
          <Point title="A real token in your wallet">
            Each POTFolio token has a name, symbol and logo set by the program, so it shows up properly in wallets and explorers.
          </Point>
        </div>
      </Section>

      <Section title="Deposit and redeem">
        <div className="grid gap-3 sm:grid-cols-2">
          <Point title="Deposit USDC, one approval">
            Current Pyth prices are posted on-chain in the same approval. The program values the basket, mints your tokens at that
            value, then buys the basket leg by leg with your cash. Every step is visible in the activity feed and on Explorer.
          </Point>
          <Point title="Redeem for the assets">
            Your tokens are redeemed for your share of every asset in kind. This needs no oracle, no keeper and no permission, and it
            cannot be paused.
          </Point>
          <Point title="Redeem for USDC">
            The same, but the assets are sold in the same transaction and you receive USDC. The program checks you received at least a
            minimum computed from Pyth prices, or the whole transaction is reverted.
          </Point>
          <Point title="Prices come from Pyth">
            Prices must be fresh and are applied conservatively, price plus or minus confidence. Stale prices are refused, which is why
            stock POTFolios only take deposits while US markets are open. Redeeming for assets needs no price at all.
          </Point>
        </div>
      </Section>

      <Section title="Fees">
        <div className="grid gap-3 sm:grid-cols-3">
          <Fee label="Entry" value="0.30%" note="40% creator, 40% referrer, 20% protocol, paid in the deposit transaction" />
          <Fee label="Exit" value="0.50%" note="stays in the Pot for the holders who remain" />
          <Fee label="Holding" value="0%" note="no management fee, no performance fee" />
        </div>
        <p>
          Example: a <Num>$10,000</Num> deposit pays <Num>$30</Num> at entry (<Num>$12</Num> to the creator, <Num>$12</Num> to the
          referrer, <Num>$6</Num> to the protocol) and mints <Num>$9,970</Num> of tokens. Exiting <Num>$10,000</Num> later leaves{' '}
          <Num>$50</Num> in the Pot and returns <Num>$9,950</Num> in assets.
        </p>
        <FeeCalculator />
        <div className="rounded-2xl border border-pot-border bg-pot-card p-5">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">Mainnet pricing (planned)</p>
          <p className="mt-2 text-[15px] text-white">
            <Num>0.5%</Num> in, <Num>0.5%</Num> on each rebalance, <Num>0.5%</Num> out.
          </p>
          <p className="mt-1 text-sm text-pot-muted">
            Devnet today: <Num>0.30%</Num> in, <Num>0.50%</Num> out (stays in the Pot), plus <Num>0.10%</Num> when you redeem for USDC.
          </p>
        </div>
      </Section>

      <Section title="Keepers">
        <p>
          A keeper is a bot that turns USDC in the Pot into the target assets and keeps the basket near its weights. Anyone can run one.
          The program checks every keeper trade.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          <Rule>Toward target only, never past it.</Rule>
          <Rule>At most <Num>25%</Num> of the Pot per trade.</Rule>
          <Rule>Price inside the Pyth band.</Rule>
          <Rule>Under-delivery reverts the whole transaction.</Rule>
        </ul>
      </Section>

      <Section title="Garden levels">
        <p>
          Every POTFolio is a plant. Its level is a function of the value held in the Pot, read from on-chain supply and price, so it
          cannot be faked. Deposits water it, exits dry it out. Each level unlocks something: more reach for the creator, more trust
          for holders.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map((s) => (
            <div key={s.level} className="rounded-2xl border border-pot-border bg-pot-card p-4 text-center">
              <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-green">L{s.level}</div>
              <div className="mt-1 font-semibold text-white">{s.name}</div>
              <div className="font-mono text-xs tabular-nums text-pot-muted">{s.level === 1 ? 'first deposit' : `from ${s.label}`}</div>
              <div className="mt-2 text-sm text-pot-muted">{s.unlocks}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="POTFolio vs Vault">
        <div className="overflow-x-auto rounded-3xl border border-pot-border bg-pot-card p-5">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">
                <th className="py-2 pr-4 font-normal"></th>
                <th className="py-2 pr-4 font-normal">POTFolio</th>
                <th className="py-2 font-normal">Vault</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pot-border">
              <Row k="What it is" a="A basket as one liquid token" b="A group treasury with votes" />
              <Row k="Who is in" a="Holders of the token, anyone can buy in" b="Members, invited or public" />
              <Row k="Decisions" a="Fixed weights, program-bounded keepers" b="Proposals and votes, program executes" />
              <Row k="Leaving" a="Redeem the token for every asset in kind, or for USDC" b="Withdraw your share per vault rules" />
              <Row k="Where it is" a="The current product" b="The previous product, interface being reworked" />
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="More questions">
        <p>Short answers to the common ones, grouped by topic, live on the FAQ.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/portfolios" className="btn-primary">Explore POTFolios</Link>
          <Link href="/faq" className="btn-secondary">Open the FAQ</Link>
        </div>
      </Section>
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

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-5">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 text-[15px] leading-relaxed text-pot-muted">{children}</p>
    </div>
  )
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 rounded-2xl border border-pot-border bg-pot-card px-4 py-3 text-[15px] text-white">
      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pot-green" />
      <span>{children}</span>
    </li>
  )
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums text-white">{children}</span>
}

function Fee({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-pot-border bg-pot-card p-5">
      <div className="font-mono text-xs uppercase tracking-[0.14em] text-pot-muted">{label}</div>
      <div className="mt-1 font-mono text-3xl font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-1 text-sm text-pot-muted">{note}</div>
    </div>
  )
}

function Row({ k, a, b }: { k: string; a: string; b: string }) {
  return (
    <tr>
      <td className="py-3 pr-4 font-semibold text-white">{k}</td>
      <td className="py-3 pr-4 text-pot-muted">{a}</td>
      <td className="py-3 text-pot-muted">{b}</td>
    </tr>
  )
}
