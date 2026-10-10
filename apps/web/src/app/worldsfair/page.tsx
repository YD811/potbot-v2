import type { Metadata } from 'next'
import Link from 'next/link'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'
import { HowAPotWorks } from '@/components/pot-index/HowAPotWorks'
import { LivePots } from '@/components/pot-index/LivePots'

export const metadata: Metadata = {
  title: 'PotBot POTfolio × Crypto World\'s Fair',
  description:
    'PotBot POTfolio: a basket of Solana assets (crypto, Solana natives, tokenized stocks, memes) as one liquid index token. Built for Colosseum Crypto World\'s Fair, Sept 14 – Oct 12, 2026.',
}

const PROGRAM = POT_INDEX_SETTINGS.programId
const explorer = `https://explorer.solana.com/address/${PROGRAM}?cluster=devnet`

export default function WorldsFairPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-pot-accent">Colosseum · Crypto World&apos;s Fair · Solana</p>
      <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">
        PotBot <span className="text-pot-green">POTfolio</span>
      </h1>
      <p className="mt-3 text-xl text-white/85">
        A basket of Solana assets as one liquid index token. Crypto majors, Solana natives, tokenized stocks, memes: pick the
        assets, set the weights, and the Pot issues a token you can hold, send, trade and plug into DeFi.
      </p>
      <p className="mt-3 text-pot-muted">
        A launchpad for portfolios. Live on devnet with five POTfolios, real Pyth prices, and every deposit, rebalance and exit
        visible on-chain.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link href="/portfolios" className="btn-primary text-center">Open the live POTfolios</Link>
        <a href="https://github.com/YD811/potbot-v2/tree/feat/pot-index/packages/pot-index" target="_blank" rel="noreferrer" className="btn-secondary text-center">Program source</a>
        <a href={explorer} target="_blank" rel="noreferrer" className="btn-secondary text-center">Program on Explorer</a>
      </div>

      <Section title="Three hackathons, one idea">
        <ol className="space-y-3">
          <li>
            <b className="text-white">Hackathon 1: group trading.</b> Our first Colosseum entry came from a real request: friends in a
            Telegram group wanted to trade together from one wallet. We built PotBot v1: a shared pot, votes on trades, one treasury for
            the group.
          </li>
          <li>
            <b className="text-white">Hackathon 2: the vault.</b> At Frontier we found the shape that works better: a non-custodial
            vault with strategies, where capital sits in program-owned accounts and the group governs it.
          </li>
          <li>
            <b className="text-white">Hackathon 3: the token.</b> This time we wrapped the vault into a single liquid token. A POTfolio
            is a basket you can hold in your wallet, send to a friend, sell on a DEX or post as collateral, and burn any time to take your
            share of every asset back. That makes PotBot a launchpad for portfolios, and it is what we keep building after the Fair.
          </li>
        </ol>
      </Section>

      <Section title="What a POTfolio is, in plain words">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b>One token = a slice of the whole basket.</b> Deposit USDC, the Pot mints tokens at the current value of the basket
            (NAV). The basket grows or falls with its assets, the token follows.
          </li>
          <li>
            <b>No exit liquidity games.</b> Leaving means burning your tokens and receiving your pro-rata share of every asset, in
            kind. Nothing is sold into the market, nobody is left holding the bag, and 0.5% of what leaves stays in the Pot for the
            holders who remain.
          </li>
          <li>
            <b>Nobody can withdraw.</b> Assets sit in accounts owned by the program (PDAs): no private key, no withdraw
            instruction. Not the creator, not PotBot.
          </li>
          <li>
            <b>Keepers buy the basket, the program sets the limits.</b> Keepers are independent bots (ours, partners, or your own). A keeper may only move the basket toward its target weights,
            never past them, never more than 25% of the Pot per trade, and only at a price inside the Pyth band. If the keeper delivers
            less than promised, the whole transaction is reverted.
          </li>
          <li>
            <b>Creators earn.</b> 0.30% on every deposit is split on-chain: 40% creator, 40% referrer, 20% protocol. Share your link,
            build your basket&apos;s community.
          </li>
        </ul>
      </Section>

      <Section title="Live on devnet now">
        <LivePots />
        <p className="mt-4 text-xs">
          Test tokens, real prices. Stock POTfolios mint only while US markets are open: the program refuses stale prices, exits work
          always. Free Pyth tier limits devnet assets to majors; the paid tier adds the long tail (JUP, BONK, NVDA…) by config.
        </p>
      </Section>

      <Section title="How it works">
        <HowAPotWorks compact />
      </Section>

      <Section title="Why now">
        <p>
          On Sept 24, 2026 Ondo launched Intelligent Portfolios &ldquo;Powered by BlackRock&rdquo;: a whole model portfolio as one onchain
          token, rebalanced programmatically, designed by BlackRock and open to eligible investors only. The same month Metaplex shipped
          MPL-3643 for permissioned RWAs and named Meteora its liquidity partner; xStocks put Tesla and the Nasdaq-100 on Solana as plain
          SPL tokens. The industry is moving every asset class onto one chain. PotBot is the open layer on top: creators build the
          portfolio, communities hold the token, and the token works across DeFi.
        </p>
      </Section>

      <Section title="Built during the Fair (Sept 14 to Oct 12)">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b>New Anchor 1.2 program <code>pot_index</code></b>, 14 instructions, written from scratch in its own workspace. Devnet
            program id <code className="break-all text-pot-green">{PROGRAM}</code>, live since Oct 8.
          </li>
          <li>
            <b>Single-ledger accounting:</b> the SPL index token supply is the only record of ownership. Mint on deposit at Pyth-priced
            NAV (prices posted in the same transaction, max 5 min old, priced conservatively at price ± confidence), burn on exit.
            Metaplex token metadata attached by the program, so the token has a name and logo in every wallet.
          </li>
          <li>
            <b>Atomic bounded rebalancing:</b> <code>rebalance_open</code> reads the transaction (Instructions sysvar) and refuses unless a
            matching <code>rebalance_close</code> follows; under-delivery reverts everything. Deadband, cooldown, per-trade cap, slippage band.
          </li>
          <li>
            <b>Exit in kind, never pausable; referral economics on-chain;</b> creator can only pause deposits or cap size.
          </li>
          <li>
            <b>Five live POTfolios</b> across crypto majors, Solana natives, tokenized stocks and memes; keeper running; faucet for test
            USDC; one wallet signature per deposit.
          </li>
          <li>
            <b>Tests &amp; review:</b> LiteSVM end-to-end suite (fee split, bounded rebalance incl. missing-close / overshoot /
            under-delivery reverts, in-kind exit, pause, stale and wrong-feed oracle, two-step admin) and a security pass against the
            Solana Foundation checklist.
          </li>
        </ul>
      </Section>

      <Section title="Honest limits and what comes next">
        <ul className="list-disc space-y-2 pl-5">
          <li>Up to 5 assets per Pot today, 10 next (deposit transactions split across price updates).</li>
          <li>Deposits land as USDC and are bought into the basket by keepers within minutes; instant allocation in the deposit transaction for small amounts is next.</li>
          <li>Fixed weights now. Next: Managed POTfolios (creator adjusts within a public mandate and a timelock) and Community POTfolios (holders vote with the token).</li>
          <li>Secondary market: a $POT/USDC pool on Meteora so tokens trade on Jupiter, Photon and in wallets; minting and burning at NAV keep the pool honest.</li>
          <li>Long-tail assets via paid Pyth or Switchboard; permissioned stocks via MPL-3643; &ldquo;Launch with a floor&rdquo;, bonding-curve launches backed by a Pot.</li>
          <li>Guarded mainnet after the Fair: flagship Pot with a cap, upgrade authority on a Squads multisig, Jupiter keeper.</li>
        </ul>
        <p>
          Full roadmap on <Link href="/roadmap" className="text-pot-green underline">/roadmap</Link>.
        </p>
      </Section>

      <Section title="Team">
        <p>
          Yehor (YD), founder. 10 years in crypto, BD at Binance and Trust Wallet, runs Y-DAO Amsterdam and helped set up Superteam
          Netherlands. Previous Colosseum hackathons: local track wins. Builds with AI engineering (Claude Code), reviews with Colosseum
          Copilot and Solana Foundation skills.{' '}
          <a className="text-pot-green underline" href="https://x.com/PotBot_sol" target="_blank" rel="noreferrer">@PotBot_sol</a> ·{' '}
          <a className="text-pot-green underline" href="https://x.com/CryptoYDao" target="_blank" rel="noreferrer">@CryptoYDao</a>
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-2xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-pot-muted">{children}</div>
    </section>
  )
}
