import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Learn — What is a Pot? | PotBot',
  description:
    'New to PotBot? Learn how group trading vaults work on Solana: pooling funds, voting on trades, AI proposals, safety, and fees — in plain language.',
}

// ── Content ────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji: '🫙',
    title: '1. Pool',
    text: 'Friends (or strangers with a shared strategy) deposit SOL into a shared vault. Everyone gets shares matching what they put in.',
  },
  {
    emoji: '🗳️',
    title: '2. Vote',
    text: 'Anyone — including the AI agent — can propose a trade. Members vote with their shares. No vote, no trade.',
  },
  {
    emoji: '⚡',
    title: '3. Execute',
    text: 'When a proposal passes, the smart contract executes the swap itself. No human touches the money — ever.',
  },
]

const SAFETY_POINTS = [
  {
    emoji: '🔐',
    title: 'The vault is owned by code, not people',
    text: 'Funds sit in a program-owned vault (a PDA) on Solana. There is no private key for it — not on our servers, not with the pot creator, not anywhere. The PotBot team literally cannot touch your money.',
  },
  {
    emoji: '👀',
    title: 'Everything is public',
    text: 'The vault address, its balance, and every transaction it has ever made are visible to anyone on the Solana blockchain. You never have to take our word for anything.',
  },
  {
    emoji: '🗳️',
    title: 'No vote, no movement',
    text: "Every trade out of the vault requires a proposal that passes the pot's voting rules. The contract enforces this — it's not a policy, it's physics.",
  },
  {
    emoji: '🛡️',
    title: 'Sentinel & freeze protection',
    text: 'If something looks wrong — a suspicious proposal, a sharp drawdown — the pot can be frozen so trading stops while everyone takes a breath.',
  },
  {
    emoji: '🚪',
    title: 'You can always leave',
    text: 'Members can withdraw their share of the vault at any time — even while a pot is frozen. Withdrawals never need anyone\'s permission.',
  },
]

const GOVERNANCE_LEVELS = [
  {
    level: 'L0',
    name: 'Autocracy',
    who: 'The creator decides alone',
    fit: 'Solo pots, testing the waters',
  },
  {
    level: 'L1',
    name: 'Advisory',
    who: 'Creator decides, but members holding 25%+ can veto',
    fit: 'Friends who trust one trader',
  },
  {
    level: 'L2',
    name: 'Majority',
    who: 'More than 50% of voting shares must say yes',
    fit: 'Most groups — the default',
  },
  {
    level: 'L3',
    name: 'Supermajority',
    who: 'More than 66% must say yes',
    fit: 'Careful groups, bigger treasuries',
  },
  {
    level: 'L4',
    name: 'Consensus',
    who: 'Every member must say yes',
    fit: 'Small, tight-knit groups',
  },
]

const AGENT_CAN = [
  'Watch prices, balances, and your strategy 24/7',
  'Propose trades with a written reason you can read',
  'Execute pre-approved strategies — but only within the caps members voted on',
]

const AGENT_CANNOT = [
  'Move funds without a passed vote',
  'Change the pot\'s rules or voting settings',
  'Stop you from withdrawing or firing it',
]

const FAQ_ITEMS = [
  {
    q: 'What if the pot creator disappears?',
    a: 'Nothing bad happens to your money. The creator never holds the funds — the smart contract does. Your shares and your right to withdraw are enforced by code, so you can take your portion out whenever you like, with or without the creator around.',
  },
  {
    q: 'Can I lose more than I deposit?',
    a: 'No. The most you can lose is what you put in. Pots cannot borrow on your behalf or create debt for members. That said, crypto prices are volatile — the value of your share can go down, including to zero in the worst case.',
  },
  {
    q: 'What blockchain is this on?',
    a: 'Solana. It\'s fast (trades settle in about a second) and cheap (transaction fees are a fraction of a cent), which matters when a group votes and trades often.',
  },
  {
    q: 'Do I need a crypto wallet?',
    a: 'Not to start. You can sign in with just your email — we use Privy to create a secure embedded wallet for you behind the scenes. If you already have a Solana wallet like Phantom, that works too.',
  },
  {
    q: 'Can the PotBot team take my funds?',
    a: 'No. PotBot is non-custodial: the vault is owned by an on-chain program, and there is no admin key that can withdraw member funds. Even the team\'s own pots follow the same voting rules as everyone else\'s.',
  },
  {
    q: 'Has the code been audited?',
    a: 'The code is open source and has passed an AI security review. A formal third-party audit is planned before we scale. Until then, we suggest starting with amounts you\'re comfortable experimenting with.',
  },
]

// ── Page ───────────────────────────────────────────────────────────

export default function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-pot-muted mb-6">
        <Link href="/" className="hover:text-white transition">Home</Link>
        <span>/</span>
        <span className="text-white">Learn</span>
      </div>

      {/* ── 1. Hero: What is a Pot? ── */}
      <section className="mb-14">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
          What is a Pot? 🪴
        </h1>
        <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-2xl">
          A Pot is a shared trading account that no single person controls.
          A group puts money in together, everyone gets shares matching their deposit,
          and every trade is decided by a vote. The funds live in a vault on the
          Solana blockchain that only the group&apos;s rules can move — not the creator,
          not the PotBot team, not anyone. Trade together, without trusting anyone
          with the keys.
        </p>

        {/* 3-step visual */}
        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative card p-5">
              <div className="text-3xl mb-3">{step.emoji}</div>
              <h3 className="font-bold text-white mb-1.5">{step.title}</h3>
              <p className="text-sm text-pot-muted leading-relaxed">{step.text}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 text-pot-green font-bold">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Is my money safe? ── */}
      <section className="mb-14">
        <h2 className="text-2xl font-black text-white mb-2">Is my money safe? 🔒</h2>
        <p className="text-pot-muted mb-6 max-w-2xl">
          Honest answer: crypto always carries risk, but PotBot is built so the
          one thing you never have to risk is trusting a person with your funds.
        </p>

        <div className="space-y-3">
          {SAFETY_POINTS.map((point) => (
            <div key={point.title} className="card p-5 flex gap-4">
              <span className="text-2xl shrink-0">{point.emoji}</span>
              <div>
                <h3 className="font-semibold text-white mb-1">{point.title}</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{point.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-sm text-pot-muted leading-relaxed">
            <strong className="text-amber-400/80">Audit status, honestly:</strong>{' '}
            AI security review passed; a formal audit is planned before scale.
            The code is open source, so anyone can verify what it does.
          </p>
        </div>
      </section>

      {/* ── 3. How voting works ── */}
      <section className="mb-14">
        <h2 className="text-2xl font-black text-white mb-2">How voting works 🗳️</h2>
        <p className="text-pot-muted mb-6 max-w-2xl">
          Every pot picks a governance level when it&apos;s created — from one person
          calling the shots to full unanimity. Your voting power is simple:{' '}
          <strong className="text-white">1 share = 1 vote</strong>. Deposit more,
          your voice weighs more.
        </p>

        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-pot-border text-left text-pot-muted">
                <th className="px-5 py-3 font-medium">Level</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Who decides</th>
                <th className="px-5 py-3 font-medium">Good for</th>
              </tr>
            </thead>
            <tbody>
              {GOVERNANCE_LEVELS.map((g) => (
                <tr key={g.level} className="border-b border-pot-border/50 last:border-0">
                  <td className="px-5 py-3 font-mono font-bold text-pot-green">{g.level}</td>
                  <td className="px-5 py-3 font-semibold text-white">{g.name}</td>
                  <td className="px-5 py-3 text-gray-300">{g.who}</td>
                  <td className="px-5 py-3 text-pot-muted">{g.fit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-1">✋ Quorum</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              A minimum share of members has to actually vote before a result counts.
              No quorum, no trade — a quiet pot can&apos;t be steered by two people at 3am.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-1">⏳ Timelock</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Big changes wait a delay before they take effect, so you have time to
              see them coming and react — or withdraw — before anything happens.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. What can the AI agent do? ── */}
      <section className="mb-14">
        <h2 className="text-2xl font-black text-white mb-2">What can the AI agent do? 🤖</h2>
        <p className="text-pot-muted mb-6 max-w-2xl">
          Think of the agent as an analyst on the team, not the boss. It watches
          the market around the clock and suggests moves — the group always keeps
          the final say.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="card p-5 border-pot-green/30">
            <h3 className="font-bold text-pot-green mb-3">It can ✅</h3>
            <ul className="space-y-2.5">
              {AGENT_CAN.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-300 leading-relaxed">
                  <span className="text-pot-green shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5 border-red-500/20">
            <h3 className="font-bold text-red-400 mb-3">It can never ❌</h3>
            <ul className="space-y-2.5">
              {AGENT_CANNOT.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-300 leading-relaxed">
                  <span className="text-red-400 shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-sm text-pot-muted mt-4">
          And yes — the group can fire the agent at any time with a vote.
          It works for you, not the other way around.
        </p>
      </section>

      {/* ── 5. Fees ── */}
      <section className="mb-14">
        <h2 className="text-2xl font-black text-white mb-2">Fees 💸</h2>
        <p className="text-pot-muted mb-6 max-w-2xl">
          No surprises: you pay a tiny amount to create a pot, and that&apos;s it
          to get started.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-1">🪴 Creating a pot</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              About <strong className="text-white">0.01 SOL</strong> — mostly Solana
              network costs for setting up the on-chain vault. Joining a pot just
              costs a normal transaction fee (a fraction of a cent).
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-1">💎 Premium tiers (optional)</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Power features like advanced agent strategies live in optional paid
              tiers. The core — pooling, voting, trading, withdrawing — stays free.{' '}
              <Link href="/pricing" className="text-pot-green hover:underline underline-offset-2">
                See pricing →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ ── */}
      <section className="mb-14">
        <h2 className="text-2xl font-black text-white mb-6">Quick questions ❓</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group border border-pot-border rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-pot-card/50 transition">
                <span className="text-sm font-medium text-white">{item.q}</span>
                <span className="shrink-0 text-pot-muted transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 bg-pot-card/30">
                <p className="text-sm text-gray-300 leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
        <p className="text-sm text-pot-muted mt-4">
          Want more detail?{' '}
          <Link href="/faq" className="text-pot-green hover:underline underline-offset-2">
            Read the full FAQ →
          </Link>
        </p>
      </section>

      {/* ── 7. Footer CTA ── */}
      <section className="p-8 rounded-2xl border border-pot-border bg-pot-card/50 text-center">
        <h2 className="text-xl font-black text-white mb-2">Ready? 🚀</h2>
        <p className="text-sm text-pot-muted mb-5">
          The fastest way to learn is to peek inside a live pot.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/vaults" className="btn-primary text-sm py-2.5 px-6">
            Browse pots →
          </Link>
          <Link href="/create" className="btn-secondary text-sm py-2.5 px-6">
            Create your own →
          </Link>
        </div>
      </section>
    </div>
  )
}
