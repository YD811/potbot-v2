import type { Metadata } from 'next'
import Link from 'next/link'
import { HowAPotWorks } from '@/components/pot-index/HowAPotWorks'
import { STAGES } from '@/lib/pot-index/garden'

export const metadata: Metadata = {
  title: 'Learn: what is a POTfolio? | PotBot',
  description:
    'POTfolios, Vaults and the Bot, explained in plain words: how the index token is minted and burned, who can and cannot touch the assets, fees, keepers and Garden mode.',
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is a POTfolio a fund?',
    a: 'No. Nobody manages your money. The basket and its weights are fixed when the POTfolio is created and written on-chain. The program mints and burns the token; keepers only move the basket toward those weights inside limits the program enforces.',
  },
  {
    q: 'Who holds the assets?',
    a: 'Program-owned accounts (PDAs). They have no private key and the program has no withdraw instruction. Not the creator, not PotBot, not a keeper can take assets out. The only way out is burning the token for your share.',
  },
  {
    q: 'What do I get when I exit?',
    a: 'Your pro-rata share of every asset in the basket, in kind. If the Pot holds SOL, BTC and ETH, you receive SOL, BTC and ETH. Exit to USDC in one step is in development. 0.50% of what leaves stays in the Pot for the holders who remain.',
  },
  {
    q: 'Can the creator change the basket?',
    a: 'Not in the current version. The creator can pause new deposits or set a maximum size, nothing else. Managed POTfolios (creator adjusts inside a public mandate with a timelock) and Community POTfolios (holders vote with the token) come after the Fair.',
  },
  {
    q: 'Why USDC in, and why a minimum of 1 USDC?',
    a: 'USDC keeps the price math simple: the Pot values the basket in USD with Pyth and mints tokens at that value. The 1 USDC floor only stops dust deposits that would cost more in rent and fees than they are worth. Depositing other assets directly is in development.',
  },
  {
    q: 'Where do prices come from?',
    a: 'Pyth. Prices are posted in the same transaction as the deposit, must be fresh (max 5 minutes old) and are priced conservatively at price plus or minus confidence. Stale prices are refused, which is why stock POTfolios only take deposits while US markets are open. Exits need no oracle and always work.',
  },
  {
    q: 'What is a keeper?',
    a: 'A bot that turns USDC in the Pot into the target assets, and keeps the basket near its weights. Anyone can run one. The program checks every keeper trade: only toward target, never past it, max 25% of the Pot per trade, price inside the Pyth band. If the keeper delivers less than promised, the whole transaction is reverted.',
  },
  {
    q: 'How do referrals pay?',
    a: 'Share your link to a POTfolio. Every deposit through it pays you 0.12% of the amount, instantly, in the same transaction, to your USDC account. No claim step. Without a referrer that share goes to the creator.',
  },
  {
    q: 'What is a Vault then?',
    a: 'The previous PotBot product (v2): a group treasury where members deposit, propose trades and vote, and the program executes what the vote approved. Vaults have members and governance; POTfolios have holders and a token. Both live on PotBot, both are non-custodial.',
  },
  {
    q: 'What is the Bot?',
    a: 'The agent side of PotBot. Today it exposes every Pot through MCP so AI agents can read and act on them. Next: a digest for holders, what grew, what fell and why, delivered to your group.',
  },
]

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-pot-accent">Learn</p>
      <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">What is a POTfolio?</h1>
      <p className="mt-4 text-lg text-white/85">
        A basket of Solana assets issued as one liquid token. Create a portfolio, hold the token. Deposit USDC to mint it at the
        current value of the basket, burn it any time to take your share of every asset back. No one can withdraw.
      </p>

      <Section title="The four moves">
        <HowAPotWorks compact />
      </Section>

      <Section title="Where the money sits">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b className="text-white">One Pot = one program-owned wallet.</b> The Pot is a PDA: an address derived from the program, with
            no private key. It owns one token account per asset in the basket plus one for USDC that has not been bought into assets yet.
          </li>
          <li>
            <b className="text-white">One token = a slice of everything inside.</b> The index token supply is the only record of ownership.
            Your share of the Pot is your tokens divided by total supply. Send the token and you send the share.
          </li>
          <li>
            <b className="text-white">No withdraw instruction.</b> The program can mint, burn, and let keepers swap inside limits. It
            cannot send assets to anyone. Not the creator, not PotBot, not an admin.
          </li>
          <li>
            <b className="text-white">Token metadata.</b> Each POTfolio token has a name, symbol and logo set by the program (Metaplex),
            so it shows up properly in wallets and explorers.
          </li>
        </ul>
      </Section>

      <Section title="Fees, all on-chain">
        <div className="grid gap-3 sm:grid-cols-3">
          <Fee label="Entry" value="0.30%" note="40% creator · 40% referrer · 20% protocol, paid in the deposit transaction" />
          <Fee label="Exit" value="0.50%" note="stays in the Pot for the holders who remain" />
          <Fee label="Holding" value="0%" note="no management fee, no performance fee" />
        </div>
        <p>
          Example: a $10,000 deposit pays $30 at entry ($12 to the creator, $12 to the referrer, $6 to the protocol) and mints $9,970 of
          tokens. Exiting $10,000 later leaves $50 in the Pot and returns $9,950 in assets.
        </p>
      </Section>

      <Section title="Garden mode">
        <p>
          Every POTfolio is a plant. Its level is a function of the value held in the Pot, read from on-chain supply and price, so it
          cannot be faked. Deposits water it, exits dry it out.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STAGES.map((s) => (
            <div key={s.level} className="rounded-xl border border-pot-border p-3 text-center">
              <div className="text-xs font-bold text-pot-green">L{s.level}</div>
              <div className="text-sm font-semibold text-white">{s.name}</div>
              <div className="text-xs text-white/70">{s.level === 1 ? 'first deposit' : `from ${s.label}`}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="POTfolio vs Vault">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/70">
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4">POTfolio (v3)</th>
                <th className="py-2">Vault (v2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pot-border">
              <Row k="What it is" a="A basket as one liquid token" b="A group treasury with votes" />
              <Row k="Who is in" a="Holders of the token, anyone can buy in" b="Members, invited or public" />
              <Row k="Decisions" a="Fixed weights, program-bounded keepers" b="Proposals and votes, program executes" />
              <Row k="Leaving" a="Burn the token, get your share in kind" b="Withdraw your share per vault rules" />
              <Row k="Status" a="Live on devnet" b="Devnet, UI being reworked" />
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Quick questions">
        <div className="space-y-5">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Ready?">
        <div className="flex flex-wrap gap-3">
          <Link href="/portfolios" className="btn-primary">See live POTfolios</Link>
          <Link href="/portfolios/new" className="btn-secondary">Create a POTfolio</Link>
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

function Fee({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-pot-border bg-pot-card p-4">
      <div className="text-xs uppercase tracking-wider text-white/70">{label}</div>
      <div className="text-2xl font-black text-pot-green">{value}</div>
      <div className="mt-1 text-xs text-white/70">{note}</div>
    </div>
  )
}

function Row({ k, a, b }: { k: string; a: string; b: string }) {
  return (
    <tr>
      <td className="py-2 pr-4 font-semibold text-white">{k}</td>
      <td className="py-2 pr-4">{a}</td>
      <td className="py-2">{b}</td>
    </tr>
  )
}
