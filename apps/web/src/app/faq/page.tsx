'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'

interface FAQItem {
  q: string
  a: string
}

interface FAQCategory {
  id: string
  label: string
  icon: string
  items: FAQItem[]
}

const FAQ_DATA: FAQCategory[] = [
  {
    id: 'basics',
    label: 'Basics',
    icon: '',
    items: [
      {
        q: 'What is PotBot?',
        a: 'PotBot turns a basket of Solana assets into one token. A creator picks up to 5 assets and their weights, publishes the POTfolio in one transaction, and the program issues a token that mirrors the whole basket. Anyone can deposit USDC to receive that token, hold it in any wallet, and redeem it any time for every asset inside or for USDC.',
      },
      {
        q: 'What is a POTfolio?',
        a: 'A POTfolio is one basket with fixed target weights and its own token (for example Solana Blue Chips, $SBC: SOL 50 / BTC 30 / ETH 20). The assets sit in accounts owned by the program. The token supply is the only record of who owns what: there are no shares tables, no issuer, nothing off-chain.',
      },
      {
        q: 'Is a POTfolio a fund? Does someone manage my money?',
        a: 'No. Nobody manages your money. The basket and its weights are written on-chain when the POTfolio is created and do not change. The program mints and redeems the token; keepers only move the basket toward those weights, inside limits the program enforces.',
      },
      {
        q: 'What is the index token?',
        a: 'A normal SPL token with 6 decimals, a name, a symbol and a logo in your wallet. It starts at $1.00 and follows the value of the basket. You can hold it, send it to a friend, or trade it like any other token. Redeeming it is always possible, so its value stays tied to what is inside.',
      },
      {
        q: 'What is a Vault, and how is it different?',
        a: 'Vaults are PotBot v2: group treasuries where members deposit, propose trades and vote. They are in development while the interface is reworked. POTfolio (v3) is the live product: one basket, one token, no votes, fixed weights, exit any time.',
      },
      {
        q: 'What is the Bot?',
        a: 'The Bot is the PotBot Telegram side, where the project started: group chats following a POTfolio, digests of what moved and why. For this release the web app is the product; the digest is on the roadmap.',
      },
    ],
  },
  {
    id: 'money',
    label: 'Deposits and redemptions',
    icon: '',
    items: [
      {
        q: 'How does a deposit work?',
        a: 'You deposit USDC. In the same wallet approval the current Pyth prices are posted on-chain, the program values the basket (NAV), mints your tokens at that value, and then buys the basket leg by leg with your cash. One prompt, several transactions, everything visible in the activity feed and on Explorer.',
      },
      {
        q: 'How do I redeem?',
        a: 'Two ways. Get the assets: your tokens are redeemed for your share of every asset in kind; this needs no oracle, no keeper, no permission, and cannot be paused. Get USDC: the same, but the assets are sold in the same transaction and you receive USDC; the program checks you received at least a minimum computed from Pyth prices, or the whole transaction is reverted.',
      },
      {
        q: 'What are the fees?',
        a: 'Entry 0.30% on every deposit, split on-chain: 40% to the creator, 40% to the referrer, 20% to the protocol. Exit 0.50%, which stays inside the POTfolio for the holders who remain. Redeeming to USDC adds a 0.10% conversion fee. No management fee, no performance fee.',
      },
      {
        q: 'Why do I deposit USDC and not SOL or other tokens?',
        a: 'USDC keeps the price math simple: the basket is valued in USD with Pyth and the token is minted at that value. The 1 USDC minimum only stops dust deposits that would cost more in rent and fees than they are worth. Depositing other assets directly is in development.',
      },
      {
        q: 'Why does a stock POTfolio sometimes refuse deposits?',
        a: 'Tokenized stocks are priced by Pyth equity feeds, which stop publishing when US markets are closed. The program refuses to mint on a price older than 5 minutes, so deposits reopen when the market opens. Redeeming for assets always works.',
      },
      {
        q: 'What do I see on the POTfolio page?',
        a: 'NAV, index price and supply live from the chain; the index price history; the composition against target weights; every deposit, redemption and rebalance in the activity feed; and, with a wallet connected, your holding, cost basis and P&L computed from your own on-chain history.',
      },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    icon: '',
    items: [
      {
        q: 'Can the creator run away with my money?',
        a: 'No. The assets sit in program-owned accounts (PDAs) that have no private key, and the program has no withdraw instruction. The creator can only pause new deposits or cap the size of the POTfolio. Not the creator, not PotBot, not a keeper can take assets out.',
      },
      {
        q: 'Who are keepers and what can they do?',
        a: 'Keepers are bots that keep the basket at its target weights: ours, partners, or your own. The program bounds every trade: toward the target only, never past it, at most 25% of the POTfolio per trade, inside the Pyth price band, and opened and closed in the same transaction. If a keeper delivers less than the minimum, the whole transaction is reverted.',
      },
      {
        q: 'What if the price oracle is wrong or stale?',
        a: 'Deposits use Pyth pull prices posted in the same transaction, at most 5 minutes old, with a confidence band no wider than 2%, and the program prices conservatively (price minus confidence in favour of the POTfolio). If any of that fails, the deposit is refused. Redeeming for assets needs no price at all.',
      },
      {
        q: 'Has the program been audited?',
        a: 'Reviewed twice against the Solana Foundation program-security checklist (Oct 8 and Oct 10, 2026, the second by an independent reviewer): no criticals or highs, both mediums fixed before the devnet upgrade. A third-party audit, a multisig on the upgrade authority and a capped flagship are on the mainnet path. The report is in the repository under docs/potfolio/security.md.',
      },
      {
        q: 'What are the real risks?',
        a: 'The assets inside can lose value, and the token follows them. A POTfolio of memes is as risky as the memes. Smart-contract risk exists in any program; the devnet build is for testing. Keeper slippage up to 1% per rebalance is the cost of keeping the basket at target.',
      },
      {
        q: 'Is this live on mainnet?',
        a: 'Not yet. Everything on this site runs on Solana devnet with test tokens and real Pyth prices. The mainnet plan (capped flagship, multisig, Jupiter for swaps) is on /mainnet.',
      },
    ],
  },
  {
    id: 'creators',
    label: 'Creators and referrals',
    icon: '',
    items: [
      {
        q: 'How do I create a POTfolio?',
        a: 'Open Create, give it a name (the ticker suggests itself), pick up to 5 assets from the listed set, set the weights to 100%, and confirm one transaction. The POTfolio and its token exist immediately with a Pot... address. Creating costs about 0.03 SOL in account rent.',
      },
      {
        q: 'How do creators and referrers earn?',
        a: 'Every deposit pays 0.30%: 40% to the creator, 40% to whoever referred the depositor, 20% to the protocol. It is paid inside the deposit transaction; nothing to claim. Share your POTfolio link: the referral is remembered for 30 days. The calculator on /learn shows what that adds up to.',
      },
      {
        q: 'Can I change the weights later?',
        a: 'Not in this version: weights are fixed at creation, which is what makes the token predictable for holders. Managed POTfolios (creator adjusts inside a public mandate with a timelock) and Community POTfolios (holders vote with the token) are on the roadmap.',
      },
      {
        q: 'Which assets can go in?',
        a: 'Any asset the protocol has listed with a Pyth price feed. On devnet that is a set of majors, Solana natives and tokenized stocks. Mainnet adds the long tail by configuration.',
      },
      {
        q: 'What is Garden mode?',
        a: 'Every POTfolio is a plant. Its level is a function of the value held inside, read from on-chain supply and price, so it cannot be faked. Deposits water it, redemptions dry it out. Levels run from Seedling (first deposit) to Mature Tree (from $1M).',
      },
    ],
  },
]

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-pot-border rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-pot-card/50 transition"
          >
            <span className="text-sm font-medium text-white">{item.q}</span>
            <span
              className="shrink-0 text-pot-muted transition-transform duration-200"
              style={{ transform: open === i ? 'rotate(45deg)' : 'none' }}
            >
              +
            </span>
          </button>
          {open === i && (
            <div className="px-5 pb-5 bg-pot-card/30">
              <p className="text-sm text-gray-300 leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('basics')
  const category = FAQ_DATA.find((c) => c.id === activeCategory) ?? FAQ_DATA[0]

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Header */}
      <PageHeader
        eyebrow="FAQ"
        title="Questions, answered"
        lede={<>POTfolio in plain words. Longer explanations live on <Link href="/learn" className="text-pot-green underline">Learn</Link>, the mechanics in the <a href="https://github.com/YD811/potbot-v2/tree/main/docs/potfolio" target="_blank" rel="noreferrer" className="text-pot-green underline">docs</a>.</>}
      />

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FAQ_DATA.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeCategory === cat.id
                ? 'bg-pot-green text-pot-dark font-bold'
                : 'bg-pot-card border border-pot-border text-pot-muted hover:text-white'
            }`}
          >
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <FAQAccordion items={category.items} />

      {/* Footer links */}
      <div className="mt-10 p-6 rounded-2xl border border-pot-border bg-pot-card/50 text-center">
        <p className="text-sm text-pot-muted mb-3">Still have questions?</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="https://x.com/PotBot_sol" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2 px-5">
            Ask on X
          </a>
          <Link href="/learn" className="btn-secondary text-sm py-2 px-5">
            Read Learn
          </Link>
          <Link href="/portfolios" className="btn-primary text-sm py-2 px-5">
            Open the POTfolios
          </Link>
        </div>
      </div>

      {/* Disclaimers */}
      <div className="mt-8 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-pot-muted leading-relaxed space-y-1">
          <strong className="text-amber-400/80 block mb-2">Risk Disclosures</strong>
          PotBot is non-custodial software: assets sit in program-owned accounts with no withdraw instruction. Crypto assets are volatile; you may lose some or all of the value you deposit. Past performance does not predict future results. PotBot is not investment advice. This build runs on Solana devnet with test tokens. Use of PotBot may be restricted in certain jurisdictions; by using this app you confirm compliance with your local laws.
        </p>
      </div>
    </div>
  )
}
