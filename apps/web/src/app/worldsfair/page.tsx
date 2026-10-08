import type { Metadata } from 'next'
import Link from 'next/link'
import { POT_INDEX_SETTINGS } from '@/lib/pot-index/registry'

export const metadata: Metadata = {
  title: 'PotBot × Crypto World\'s Fair — what we built',
  description:
    'PotBot Portfolios: creator baskets of Solana assets as one liquid index token. Built during Colosseum Crypto World\'s Fair, Sept 14 – Oct 12, 2026.',
}

const PROGRAM = POT_INDEX_SETTINGS.programId
const explorer = `https://explorer.solana.com/address/${PROGRAM}?cluster=devnet`

export default function WorldsFairPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-pot-accent">Colosseum · Crypto World&apos;s Fair · Solana track</p>
      <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">PotBot Portfolios — what we built in the window</h1>
      <p className="mt-4 text-lg text-white/80">
        Any basket of Solana assets, as one liquid index token. A creator picks assets and target weights;
        depositors mint the token at NAV and exit in kind. There is no withdraw instruction — assets only leave a
        Pot as a share.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link href="/portfolios" className="btn-primary text-center">Try it on devnet</Link>
        <a href="https://github.com/YD811/potbot-v2/tree/feat/pot-index/packages/pot-index" target="_blank" rel="noreferrer" className="btn-secondary text-center">Program source</a>
        <a href={explorer} target="_blank" rel="noreferrer" className="btn-secondary text-center">Program on Explorer</a>
      </div>

      <Section title="Why now">
        <p>
          On Sept 24, 2026 Ondo launched Intelligent Portfolios &ldquo;Powered by BlackRock&rdquo;: a whole model portfolio as one onchain
          token, rebalanced programmatically — but only BlackRock designs them and only eligible non-US investors can hold them.
          Hyperliquid vaults showed that people hand capital to transparent onchain strategies when anyone can run one. PotBot is the
          open version of both: anyone builds the portfolio, anyone holds the token, and the token works across DeFi.
        </p>
      </Section>

      <Section title="Built during the hackathon (Sept 14 – Oct 12)">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b>New Anchor 1.2 program <code>pot_index</code></b> (12 instructions) in its own workspace — not a fork of our earlier
            vault code. Devnet program id <code className="break-all text-pot-green">{PROGRAM}</code>.
          </li>
          <li>
            <b>Single-ledger share accounting:</b> the SPL index token supply is the only ownership record; mint on deposit at Pyth-priced
            NAV, burn on exit. Conservative pricing (price ± confidence), 300 s max price age, phantom-liquidity protection against
            first-depositor inflation, min-out slippage guards.
          </li>
          <li>
            <b>Bounded permissionless rebalancing:</b> a same-transaction <code>rebalance_open</code> / <code>rebalance_close</code> pair.
            <code>open</code> introspects the transaction and refuses unless a matching <code>close</code> follows; the program enforces
            overweight → underweight only, never past target, per-trade cap, Pyth slippage band, deadband and cooldown. A keeper that
            under-delivers reverts the whole transaction.
          </li>
          <li>
            <b>Exit in kind, never pausable:</b> burn the token, receive a pro-rata share of every asset; no oracle needed, works even if
            prices are stale or deposits are paused.
          </li>
          <li>
            <b>Referral economics on-chain:</b> 0.30% entry fee split 40/40/20 between referrer, creator and protocol at deposit time.
          </li>
          <li>
            <b>Tests:</b> LiteSVM end-to-end suite — create/finalize, deposit fee split, rebalance (missing close, trade too large,
            under-delivery revert, overshoot, not-overweight, cooldown), NAV-priced second deposit, in-kind exit with exit fee, pause,
            stale and wrong-feed oracle rejection, two-step admin.
          </li>
          <li>
            <b>Web:</b> create a Pot in 60 seconds, deposit with fresh Pyth updates posted in the same transaction, exit, referral link,
            devnet faucet. TypeScript client in <code>apps/web/src/lib/pot-index</code>.
          </li>
          <li>
            <b>Security pass</b> against the Solana Foundation checklist with findings fixed before devnet.
          </li>
        </ul>
      </Section>

      <Section title="Context (built before the hackathon, not judged)">
        <p>
          potbot.fun, the earlier group-vault program (<code>pot_vault</code>, devnet), SDK, keeper, MCP server, waitlist and
          <code>.potbot.sol</code> name sales. The hackathon build replaces the vault core with the Portfolios model; the rest becomes
          supporting layers.
        </p>
      </Section>

      <Section title="Business">
        <p>
          Entry fee 0.30% (split with creators and referrers), exit fee 0.50% kept in the Pot, then creator management and performance
          fees, premium creator pages and <code>.potbot.sol</code> names. Next: guarded mainnet with a flagship Pot, invited creators,
          Pot tokens as DeFi collateral, tokenized stocks and compliant (MPL-3643-compatible) Pots. Full roadmap on{' '}
          <Link href="/roadmap" className="text-pot-green underline">/roadmap</Link>.
        </p>
      </Section>

      <Section title="Team">
        <p>
          Yehor (YD) — founder. 10 years in crypto, BD at Binance and Trust Wallet, runs Y-DAO Amsterdam and helped set up Superteam
          Netherlands. Previous Colosseum hackathons: local track wins. AI-assisted engineering.{' '}
          <a className="text-pot-green underline" href="https://x.com/PotBot_sol" target="_blank" rel="noreferrer">@PotBot_sol</a> ·{' '}
          <a className="text-pot-green underline" href="https://x.com/CryptoYDao" target="_blank" rel="noreferrer">@CryptoYDao</a>
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-pot-muted">{children}</div>
    </section>
  )
}
