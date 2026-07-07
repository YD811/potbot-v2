import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Docs — PotBot',
  description:
    'PotBot documentation: on-chain index vaults, the iPOT liquid index token, NAV math, yield routing, looping economics, and the security model.',
}

const GH = 'https://github.com/YD811/potbot-v2/blob/main/docs'

const DOC_LINKS: { title: string; desc: string; href: string }[] = [
  { title: 'Index vault architecture', desc: 'iPOT token, NAV math, yield routing, looping economics', href: `${GH}/architecture/index-vault.md` },
  { title: 'System overview', desc: 'What PotBot is and how the pieces connect', href: `${GH}/architecture/overview.md` },
  { title: 'Anchor program reference', desc: 'Accounts, instructions, PDAs', href: `${GH}/architecture/program.md` },
  { title: 'Governance', desc: 'Levels L0–L4, quorum, risk caps, timelocks', href: `${GH}/architecture/governance.md` },
  { title: 'Index keeper runbook', desc: 'NAV crank, redeem settler, key rotation, kill switch', href: `${GH}/operations/index-keeper.md` },
  { title: 'Mainnet runbook', desc: 'Launch gates, guards, open decisions', href: `${GH}/operations/index-mainnet-runbook.md` },
  { title: 'MCP integration', desc: 'Drive a POT from any AI agent via @potbot/mcp', href: `${GH}/integrations/mcp.md` },
  { title: 'Security model', desc: 'Non-custodial PDAs, sentinel, exposure caps', href: `${GH}/operations/security-audit.md` },
]

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="card overflow-x-auto p-4 text-sm leading-6 text-pot-green font-mono">{children}</pre>
  )
}

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-12">
      {/* Hero */}
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-white">PotBot Docs</h1>
        <p className="text-pot-muted max-w-2xl">
          PotBot is infrastructure for on-chain vaults — think S&amp;P 500, but on the
          blockchain. Drop in USDC, receive a liquid index token, stay liquid while your
          capital works.
        </p>
      </header>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">How a POT works</h2>
        <p className="text-pot-muted">
          A POT is a container for tokenized assets: a program-owned vault on Solana with
          no custodian, no operator keys, no shared seed phrase. You deposit USDC, the
          vault mints you <span className="text-pot-green font-mono">iPOT</span> — a
          liquid index token representing the vault&apos;s contents. The keeper deploys the
          basket into DeFi (Kamino, Meteora) under on-chain caps; an idle buffer stays
          liquid for instant exits.
        </p>
        <Code>{`deposit USDC ──▶ mint iPOT at NAV ◀── keeper NAV snapshot (60s, guarded)
                 USDC → idle buffer (5–10%)
                 └▶ deploy_to_strategy → index legs (Stable / Staked SOL / RWA)
redeem iPOT ──▶ instant from buffer, else queued → keeper unwinds & settles`}</Code>
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">How the index token is priced</h2>
        <p className="text-pot-muted">
          All accounting is in USDC. The keeper writes total NAV on-chain every minute;
          the program guards each write with a staleness bound and a deviation cap, so a
          compromised keeper can neither mint itself cheap shares nor drain via redeem.
          Deposits and redemptions move NAV and supply proportionally — only repricing of
          the basket moves price per share.
        </p>
        <Code>{`price/share = NAV / supply
mint:   shares = deposit × supply / NAV     (first deposit: 1 share = 1 USDC)
redeem: payout = shares  × NAV   / supply   (min-out floors checked on-chain)`}</Code>
      </section>

      {/* Looping */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Looping: when leverage is free</h2>
        <p className="text-pot-muted">
          iPOT is a plain SPL token — composable by construction. Use it as collateral,
          borrow stables, deposit them back into the POT: a looping economy that
          compounds exposure and yield. The loop is self-funding exactly while the basket
          out-earns the debt:
        </p>
        <Code>{`profitable  ⟺  basket yield ≥ borrow rate + fees
net APY ≈ y + L·(y − b)     y = basket yield · b = borrow rate · L = leverage`}</Code>
        <p className="text-pot-muted text-sm">
          The looping layer ships behind a flag and enables on mainnet only after
          borrow-rate telemetry proves the inequality holds.
        </p>
      </section>

      {/* Security */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Security model</h2>
        <ul className="space-y-2 text-pot-muted list-disc pl-5">
          <li>Funds live only in vault-PDA-owned accounts; the only outbound transfers go to the redeeming member&apos;s own wallet.</li>
          <li>The keeper is a crank identity: allowlisted, deviation-capped, cannot pay anyone. Gas wallet only.</li>
          <li>Global asset allowlist, TVL cap, per-deposit caps, idle-buffer floor, program-wide 5% slippage ceiling.</li>
          <li>Sentinel role can pause deposits and deploys — member exits are never blockable, even while paused or frozen.</li>
          <li>Flagship authority moves to a Squads multisig before public mainnet deposits.</li>
        </ul>
      </section>

      {/* Full docs */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Full documentation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOC_LINKS.map((d) => (
            <a key={d.href} href={d.href} target="_blank" rel="noopener noreferrer" className="card block hover:border-pot-green transition">
              <div className="font-medium text-white">{d.title}</div>
              <div className="mt-1 text-sm text-pot-muted">{d.desc}</div>
            </a>
          ))}
        </div>
        <p className="text-sm text-pot-muted">
          Everything lives in the repo:{' '}
          <a className="text-pot-green hover:underline" href="https://github.com/YD811/potbot-v2/tree/main/docs" target="_blank" rel="noopener noreferrer">
            github.com/YD811/potbot-v2/docs
          </a>
        </p>
      </section>

      <footer className="border-t border-pot-border pt-6 text-sm text-pot-muted">
        Building an agent? See{' '}
        <Link href="/for-agents" className="text-pot-green hover:underline">/for-agents</Link>{' '}
        and the <span className="font-mono">@potbot/mcp</span> server.
      </footer>
    </main>
  )
}
