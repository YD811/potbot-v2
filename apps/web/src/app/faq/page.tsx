'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    icon: '🪴',
    items: [
      {
        q: 'What is PotBot?',
        a: 'PotBot lets a group of people pool funds into a shared on-chain treasury and decide together which trades to make. Each member\'s deposit is recorded as "shares" in the vault. Members propose token swaps and vote on them. If a proposal passes, the smart contract executes the swap via Jupiter. Members can withdraw their proportional share at any time.',
      },
      {
        q: 'What is a "Pot"?',
        a: 'A Pot is a smart contract on Solana that holds the group\'s funds and enforces the voting rules. Nobody — not even the pot creator — can move funds out except through the rules everyone agreed to.',
      },
      {
        q: 'What are Shares?',
        a: 'Shares represent your proportion of the pot. If you deposit 1 SOL into a pot that holds 9 SOL after your deposit, you own 11.1% of it. If the pot\'s total value goes up or down, your shares move with it. Shares are tracked on-chain.',
      },
      {
        q: 'What is a Proposal?',
        a: 'A Proposal is a request to perform an action on behalf of the pot — most commonly, "swap X of token A into token B". Members vote yes or no, weighted by their shares. If the vote meets the pot\'s quorum and approval thresholds, the swap executes automatically.',
      },
      {
        q: 'What is the AI Agent?',
        a: 'The AI Agent is an optional feature that monitors price and balance conditions and creates proposals automatically based on rules the pot members configure. The agent can only propose — it cannot vote or execute. All trades still require member voting.',
      },
      {
        q: 'What is ONE POT?',
        a: 'ONE POT is a publicly available example vault that anyone can join. It runs a transparent, conservative SOL/USDC rotation strategy and exists so new users can experience the platform with a small deposit before creating their own pot. ONE POT is not a recommendation — it\'s a demo with real funds.',
      },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    icon: '💰',
    items: [
      {
        q: 'How does PotBot make money?',
        a: 'PotBot charges a 0.5% fee on every swap executed through a pot. There are no subscription fees, no fees on deposits or withdrawals, and no fees if your pot doesn\'t trade.',
      },
      {
        q: 'Where do the fees go?',
        a: 'Of the 0.5% swap fee: 59% to the protocol treasury, 20% to the referrer of the depositing user, 20% to development and operations, and 1% to the Season Trading Competition Treasury.',
      },
      {
        q: 'How do members earn?',
        a: 'Members earn — or lose — based on the trading decisions the group makes. If voted-on swaps gain value, withdrawing members receive more than they deposited. If swaps lose value, withdrawing members receive less. Members may also earn through the referral program and Season prize distributions.',
      },
      {
        q: 'How do referrals work?',
        a: 'When you refer a new user who deposits at least 0.1 SOL, you earn 20% of all swap fees they generate, paid in real-time to your wallet, for as long as they use PotBot.',
      },
      {
        q: 'Are returns guaranteed?',
        a: 'No. PotBot is not a yield product. The vault is a coordination tool — outcomes depend entirely on the swap decisions members vote on, and on the volatile crypto markets those swaps occur in. You can lose part or all of your deposit.',
      },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    icon: '🔒',
    items: [
      {
        q: 'Who controls the funds in a pot?',
        a: 'The smart contract does. No human — including the PotBot team and the pot creator — has the ability to move funds in ways the contract doesn\'t permit. Any movement requires a passing vote according to the pot\'s rules.',
      },
      {
        q: 'Can the pot creator run away with my money?',
        a: 'No. The smart contract does not give the creator unilateral withdrawal rights. Creators set up the pot\'s parameters (quorum, voting window, etc.) at creation, but the funds inside the vault are protected by code, not trust.',
      },
      {
        q: 'What are the actual risks?',
        a: 'Three main categories. (1) Market risk — token prices move and your pot can lose value. (2) Smart contract risk — although our code is open-source and audited, no smart contract is provably bug-free. (3) Group decision risk — you\'re trusting the collective judgment of pot members. Choose pots whose strategy and members you understand.',
      },
      {
        q: 'Can I withdraw at any time?',
        a: 'Yes. Withdrawals are pro-rata against your shares and execute immediately on-chain. There is no lock-up period, no admin approval, no waiting list.',
      },
      {
        q: 'Is PotBot regulated?',
        a: 'PotBot is a non-custodial software tool. We do not hold customer funds. Users are responsible for compliance with their local laws. Use of PotBot is restricted in certain jurisdictions — see our Terms of Service.',
      },
    ],
  },
  {
    id: 'season',
    label: 'Season',
    icon: '🌱',
    items: [
      {
        q: 'What is a Season?',
        a: 'Seasons are quarterly community events that introduce themed activities, points, and a competition prize pool. Season 1 is "The Garden" — every pot gets a virtual plant that grows based on member activity.',
      },
      {
        q: 'What is the Tamagotchi (plant)?',
        a: "Each pot has a virtual plant that visualizes the pot's community health. The plant gains health from member actions like voting, depositing, and creating proposals — and loses health from inactivity. The plant is purely cosmetic and is not tied to financial performance.",
      },
      {
        q: 'What is the Trading Competition Treasury?',
        a: '1% of all protocol swap fees during the season accumulate in a transparent on-chain treasury. At season end, the top 3 pots on the leaderboard receive 50% / 30% / 20% of the treasury, distributed pro-rata to those pots\' members.',
      },
      {
        q: 'How is the leaderboard ranked?',
        a: 'Pots are ranked by Season Score, calculated as: season trading volume × member count × pet health score. This formula rewards activity, growth, and engagement — not raw trading P&L. The exact formula and inputs are visible on the leaderboard page.',
      },
      {
        q: 'What are points?',
        a: 'Points are rewards for taking actions on the platform — creating pots, voting, referring users, completing quests. Points unlock immediate quest rewards and may inform future protocol incentives. Points are recorded off-chain in our database and are not transferable.',
      },
      {
        q: 'What are quests?',
        a: 'Quests are time-limited tasks (often marketing-related — sharing about PotBot, bringing friends, exploring new features) that award bonus points. New quests rotate weekly.',
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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-pot-muted mb-3">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <span className="text-white">FAQ</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-pot-muted">
          Everything you need to know about PotBot — plain language, no hype.
        </p>
      </div>

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
            <span>{cat.icon}</span>
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
          <a
            href="https://t.me/Trade_pot_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm py-2 px-5"
          >
            💬 Telegram Bot
          </a>
          <a
            href="https://x.com/PotBot_sol"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm py-2 px-5"
          >
            𝕏 Twitter
          </a>
          <Link href="/create" className="btn-primary text-sm py-2 px-5">
            🪴 Try PotBot
          </Link>
        </div>
      </div>

      {/* Disclaimers */}
      <div className="mt-8 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-pot-muted leading-relaxed space-y-1">
          <strong className="text-amber-400/80 block mb-2">Risk Disclosures</strong>
          PotBot is non-custodial software. You retain full custody of your funds via the smart contract. Crypto assets are volatile — you may lose some or all of the funds you deposit. Past performance does not predict future results. PotBot is not investment advice. Members make their own decisions through on-chain voting. Use of PotBot may be restricted in certain jurisdictions; by using this app you confirm compliance with your local laws.
        </p>
      </div>
    </div>
  )
}
