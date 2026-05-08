import Link from 'next/link'
import type { Metadata } from 'next'
import { StatusBadge, type StatusTier } from '@/components/StatusBadge'

export const metadata: Metadata = {
  title: 'PotBot · Solana Frontier 2026 — judge page',
  description:
    'PotBot is a group trading vault on Solana. Deposit, propose, vote, execute — all on-chain. Real Jupiter v6 CPI, MCP server, Solana Blinks. This page is the judge-facing summary for Solana Frontier 2026.',
}

const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'
const FLAGSHIP_POT = process.env.NEXT_PUBLIC_ONE_POT_PUBKEY ?? ''
const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://potbot.fun'
const EXPLORER_SUFFIX = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`

interface Track {
  sponsor: string
  emoji: string
  what: string
  proof: string
  proofHref?: string
  tier: StatusTier
}

// Live tracks only — phase-2 / phase-3 / vision items live on /roadmap so the
// judge page stays a snapshot of what actually works today.
const TRACKS: Track[] = [
  {
    sponsor: 'Jupiter v6',
    emoji: '🪐',
    what: 'Vault PDA signs every swap via Jupiter v6 CPI inside `pot_vault::execute_swap`.',
    proof: 'Mode-aware (AdminDirect · Proposal · StrategyTrigger), JUPITER_V6_PROGRAM_ID constraint, invoke_signed with vault bump.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/packages/program/programs/pot_vault/src/instructions/execute_swap.rs',
    tier: 'live',
  },
  {
    sponsor: 'Solana Actions / Blinks',
    emoji: '⚡',
    what: 'Deposit and vote straight from a tweet. No app install.',
    proof: 'Endpoints at `/api/actions/[potPubkey]/{deposit,vote}` and `/actions.json`.',
    proofHref: '/api/actions',
    tier: 'live',
  },
  {
    sponsor: 'MCP — Model Context Protocol',
    emoji: '🤖',
    what: 'Any MCP client (Claude, Cursor, Cline) can list, propose and vote on pots.',
    proof: '`npx @potbot/mcp` runs the stdio server. HTTP/SSE transport with x402 micropayments also ships.',
    proofHref: 'https://www.npmjs.com/package/@potbot/mcp',
    tier: 'live',
  },
  {
    sponsor: 'Helius',
    emoji: '🌩',
    what: 'RPC + webhook indexer. Every swap_execution lands in Supabase via Helius signature events.',
    proof: 'HMAC-verified handler at `app/api/webhooks/helius/route.ts`; RPC URL flows through `NEXT_PUBLIC_HELIUS_RPC`.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/src/app/api/webhooks/helius/route.ts',
    tier: 'live',
  },
  {
    sponsor: 'Squads v4',
    emoji: '🛡',
    what: 'Pot authority can be a Squads multisig. Governance settings flow through Squads when set.',
    proof: 'Detection in `apps/web/src/lib/squads.ts`. UI banner surfaces multisig pots; settings updates queue as Squads transactions.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/src/lib/squads.ts',
    tier: 'live',
  },
  {
    sponsor: 'Multi-asset portfolio',
    emoji: '📊',
    what: 'Vault holdings grouped into Stable · SOL ecosystem · DeFi/LP · Liquid staking · High risk. Up to 10 assets per pot.',
    proof: 'Component at `apps/web/src/components/VaultPortfolioDisplay.tsx`. Renders an allocation bar + per-category list on every pot page.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/src/components/VaultPortfolioDisplay.tsx',
    tier: 'live',
  },
  {
    sponsor: 'AI agent — base layer',
    emoji: '🧠',
    what: 'Decision-support feed: rebalance, liquid-staking conversions, LP entries. One click → on-chain proposal.',
    proof: '`PotBotAISuggestions` runs deterministic heuristics over vault state + live prices; cron at `app/api/cron/agent-poll` posts proposals on-chain when AGENT_KEYPAIR is set.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/src/components/PotBotAISuggestions.tsx',
    tier: 'live',
  },
  {
    sponsor: 'Solana Mobile (Saga / Seeker)',
    emoji: '📱',
    what: 'PWA manifest is mainnet-ready (theme, icons, categories). Installable to Saga / Seeker home screen today.',
    proof: '`apps/web/public/manifest.json`. dApp Store submission lives on /roadmap.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/public/manifest.json',
    tier: 'live',
  },
]

interface ArchLayer {
  layer: string
  color: string
  items: { name: string; tier: StatusTier }[]
}

// Architecture grid — only what ships today. Not-yet items live on /roadmap.
const ARCHITECTURE: ArchLayer[] = [
  {
    layer: 'On-chain · Anchor 0.30',
    color: 'green',
    items: [
      { name: 'pot_vault program — 30+ instructions', tier: 'live' },
      { name: 'create_pot · deposit · withdraw', tier: 'live' },
      { name: 'create_proposal · vote · execute_proposal', tier: 'live' },
      { name: 'execute_swap → Jupiter v6 CPI (vault-PDA signer)', tier: 'live' },
      { name: 'Pot admin: pause · allowed mints · spending policy', tier: 'live' },
      { name: 'Strategy slot accounts (StopLoss · TP · Trailing)', tier: 'live' },
      { name: 'Delegate / vote_as_delegate flow', tier: 'live' },
    ],
  },
  {
    layer: 'Off-chain · Next.js 14 + Vercel Functions',
    color: 'purple',
    items: [
      { name: 'Pot detail UX (sticky hero, tabs)', tier: 'live' },
      { name: 'Solana Action endpoints', tier: 'live' },
      { name: 'Helius RPC + webhook indexer', tier: 'live' },
      { name: 'Multi-asset portfolio panel', tier: 'live' },
      { name: 'PotBot AI base layer (suggestion feed)', tier: 'live' },
      { name: 'User AI delegate (rules + presets)', tier: 'live' },
      { name: 'agent-poll cron — on-chain proposal posting', tier: 'live' },
    ],
  },
  {
    layer: 'Composability · Solana ecosystem',
    color: 'amber',
    items: [
      { name: 'Jupiter v6 swap (CPI)', tier: 'live' },
      { name: 'Squads v4 multisig (optional)', tier: 'live' },
      { name: '@potbot/mcp on npm', tier: 'live' },
      { name: 'Solana Blinks (Twitter / X)', tier: 'live' },
      { name: 'PWA manifest (Saga / Seeker installable)', tier: 'live' },
      { name: 'Dune SIM analytics', tier: 'live' },
    ],
  },
]

const WEDGE = [
  { who: 'Squads', does: 'Multisig custody. No trading UI.', why: 'Treasury, not strategy' },
  { who: 'Drift Vaults', does: 'Curator-run structured products.', why: 'No group governance per swap' },
  { who: 'Kamino / Gauntlet', does: 'Institutional curators.', why: 'No primitive for friends pooling capital' },
  { who: 'PotBot', does: 'Group trading vault.', why: 'Deposit + vote + Jupiter CPI in one Anchor program', highlight: true },
]

export default function HackathonPage() {
  const programExplorerUrl = `https://explorer.solana.com/address/${PROGRAM_ID}${EXPLORER_SUFFIX}`
  const flagshipUrl = FLAGSHIP_POT ? `${APP_URL}/pots/${FLAGSHIP_POT}` : null
  const flagshipBlinkUrl = FLAGSHIP_POT ? `${APP_URL}/api/actions/${FLAGSHIP_POT}/deposit` : null

  return (
    <main className="min-h-screen bg-pot-dark text-white">
      {/* Top banner */}
      <div className="bg-gradient-to-b from-pot-accent/10 to-transparent border-b border-pot-border">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="text-pot-accent font-bold text-base flex items-center gap-2">
            🫕 <span>PotBot</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-pot-muted">Solana Frontier 2026 · Apr 6 – May 11</span>
            <span className="hidden sm:inline text-pot-muted">·</span>
            <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="text-pot-muted hover:text-white transition">
              GitHub
            </a>
            <a href="https://x.com/PotBot_sol" target="_blank" rel="noreferrer" className="text-pot-muted hover:text-white transition">
              X
            </a>
            <Link href="/roadmap" className="text-pot-muted hover:text-white transition">
              Roadmap
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pot-accent/30 bg-pot-accent/10 text-pot-accent text-[11px] font-bold uppercase tracking-wider mb-6">
            🏁 Submission for Colosseum / Solana Frontier 2026
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight bg-gradient-to-br from-white to-pot-accent bg-clip-text text-transparent">
            Your group&apos;s hedge fund<br />— live on Solana.
          </h1>
          <p className="text-base sm:text-xl text-pot-muted max-w-2xl mx-auto">
            Your group&apos;s hedge fund — live on Solana. Create a shared vault, deposit, let
            the AI agent propose trades, vote as a group, and execute on-chain via Jupiter.
            Governed on-chain. Executed by AI. Open to anyone.
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {flagshipUrl ? (
              <a
                href={flagshipUrl}
                className="px-5 sm:px-6 py-3 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold transition text-sm sm:text-base"
              >
                🪴 Open flagship pot
              </a>
            ) : (
              <Link
                href="/vaults"
                className="px-5 sm:px-6 py-3 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold transition text-sm sm:text-base"
              >
                🪴 Browse public pots
              </Link>
            )}
            <Link
              href="/create"
              className="px-5 sm:px-6 py-3 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold transition text-sm sm:text-base"
            >
              + Create your pot
            </Link>
            <a
              href="https://www.npmjs.com/package/@potbot/mcp"
              target="_blank"
              rel="noreferrer"
              className="px-5 sm:px-6 py-3 rounded-xl bg-pot-card border border-pot-border hover:border-pot-accent/40 text-white font-bold transition text-sm sm:text-base"
            >
              🤖 Install MCP
            </a>
          </div>
        </div>
      </section>

      {/* Live now block */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-[1100px] mx-auto bg-pot-card border border-pot-green/30 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {CLUSTER === 'mainnet-beta' ? '🟢 Live now — judge can verify' : '🟡 Devnet live — judge can verify'}
            </h2>
            <StatusBadge tier={CLUSTER === 'mainnet-beta' ? 'live' : 'devnet'} compact />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LiveCard
              title="Anchor program"
              value={PROGRAM_ID}
              href={programExplorerUrl}
              hrefLabel="View on Solana Explorer"
              mono
            />
            {FLAGSHIP_POT ? (
              <LiveCard
                title="Flagship pot"
                value={FLAGSHIP_POT}
                href={flagshipUrl ?? undefined}
                hrefLabel="Open in app"
                mono
              />
            ) : (
              <LiveCard
                title="Flagship pot"
                value="(devnet flagship not configured)"
                hrefLabel="See devnet pots →"
                href="/vaults"
              />
            )}
            <LiveCard
              title="MCP server"
              value="npx @potbot/mcp"
              href="https://www.npmjs.com/package/@potbot/mcp"
              hrefLabel="View on npm"
            />
            <LiveCard
              title="Solana Blink (deposit)"
              value={flagshipBlinkUrl ?? `${APP_URL}/api/actions/<potPubkey>/deposit`}
              href={flagshipBlinkUrl ?? undefined}
              hrefLabel={flagshipBlinkUrl ? 'Open Action endpoint' : 'See live Blink after deploy'}
              mono
            />
            <LiveCard
              title="Source code"
              value="github.com/YD811/potbot-v2"
              href="https://github.com/YD811/potbot-v2"
              hrefLabel="Browse the repo"
            />
            <LiveCard
              title="Public roadmap"
              value="Every feature, every phase"
              href="/roadmap"
              hrefLabel="Open /roadmap"
            />
          </div>
        </div>
      </section>

      {/* The wedge */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Where PotBot sits</h2>
          <p className="text-pot-muted max-w-2xl mb-6">
            Group on-chain governance baked{' '}
            <strong className="text-white">into the swap instruction</strong>. Nobody else
            ships this primitive on Solana today.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-pot-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pot-card text-left">
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-pot-muted">Project</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-pot-muted">What it does</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-pot-muted">Group-trade primitive?</th>
                </tr>
              </thead>
              <tbody>
                {WEDGE.map((w) => (
                  <tr
                    key={w.who}
                    className={`border-t border-pot-border ${w.highlight ? 'bg-pot-accent/5' : ''}`}
                  >
                    <td className={`px-4 py-3 font-bold ${w.highlight ? 'text-pot-accent' : 'text-white'}`}>{w.who}</td>
                    <td className="px-4 py-3 text-pot-muted">{w.does}</td>
                    <td className="px-4 py-3">
                      {w.highlight ? (
                        <span className="inline-flex items-center gap-1.5 text-pot-green font-semibold">
                          ✅ Yes — pot_vault::execute_swap
                        </span>
                      ) : (
                        <span className="text-pot-muted text-xs">{w.why}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sponsor tracks */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-end justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Sponsor tracks &amp; integrations</h2>
              <p className="text-pot-muted text-sm mt-1">
                Eight integrations live today on devnet — every claim has a source link.
                Phase-2 / phase-3 items are on{' '}
                <Link href="/roadmap" className="text-pot-accent hover:underline">/roadmap</Link>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TRACKS.map((t) => (
              <div
                key={t.sponsor}
                className="bg-pot-card border border-pot-border hover:border-pot-accent/30 rounded-2xl p-4 sm:p-5 transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl shrink-0">{t.emoji}</span>
                    <h3 className="font-bold text-white truncate">{t.sponsor}</h3>
                  </div>
                  <StatusBadge tier={t.tier} compact />
                </div>
                <p className="mt-2 text-sm text-white/90">{t.what}</p>
                <p className="mt-2 text-xs text-pot-muted leading-relaxed">{t.proof}</p>
                {t.proofHref && (
                  <a
                    href={t.proofHref}
                    target={t.proofHref.startsWith('http') ? '_blank' : undefined}
                    rel={t.proofHref.startsWith('http') ? 'noreferrer' : undefined}
                    className="mt-3 inline-block text-xs text-pot-accent hover:underline font-semibold"
                  >
                    Source / proof ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Architecture</h2>
          <p className="text-pot-muted text-sm mb-6 max-w-2xl">
            Three layers — on-chain, off-chain, composability. Each item carries its lifecycle chip so nothing on this page is over-promised.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ARCHITECTURE.map((layer) => (
              <div key={layer.layer} className="bg-pot-card border border-pot-border rounded-2xl p-5">
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                  layer.color === 'green' ? 'text-pot-green' :
                  layer.color === 'purple' ? 'text-pot-accent' : 'text-amber-300'
                }`}>
                  {layer.layer}
                </h3>
                <ul className="space-y-2">
                  {layer.items.map((it) => (
                    <li key={it.name} className="flex items-center gap-2 text-sm text-white">
                      <StatusBadge tier={it.tier} compact label={it.tier === 'live' ? '🟢' : it.tier === 'devnet' ? '🟡' : it.tier === 'phase-2' ? '🔵' : it.tier === 'phase-3' ? '🟣' : '⚪'} />
                      <span className="leading-snug">{it.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 90-second pitch */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-[1100px] mx-auto bg-pot-card border border-pot-border rounded-3xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5">90-second pitch</h2>
          <ol className="space-y-4 text-sm sm:text-base">
            <PitchStep range="0–15s" headline="Problem">
              A group of friends wants to trade together as one fund. Today they share a
              seed phrase or build a Squads multisig with no trading UI. Both suck.
            </PitchStep>
            <PitchStep range="15–30s" headline="Solution">
              PotBot is a group trading vault. Deposit, propose, vote, execute — all
              on-chain, all in one Anchor program. AI agent drafts the proposals; the
              group still has to vote.
            </PitchStep>
            <PitchStep range="30–60s" headline="Live demo">
              Open <code>/vaults</code> → click the flagship pot → deposit 0.05 SOL →
              the AI tab surfaces a rebalance / liquid-staking / LP suggestion → submit
              as proposal → vote yes → watch <code>execute_swap</code> hit Jupiter v6
              with the vault PDA as signer.
            </PitchStep>
            <PitchStep range="60–80s" headline="Differentiation">
              Three things only PotBot ships together: (1) on-chain group governance
              baked into the swap ix, (2) MCP-native server so any AI agent can run a
              vault, (3) Solana Blinks so a proposal becomes a vote-able tweet.
            </PitchStep>
            <PitchStep range="80–90s" headline="Ask">
              Devnet product is live today. Mainnet ships after the security pass.
              We&apos;re asking Colosseum to back the team building the vault
              infrastructure for AI-native asset management on Solana.
            </PitchStep>
          </ol>
        </div>
      </section>

      {/* "What ships next" was removed — every phase-2/phase-3/vision item
          now lives on /roadmap, which is linked in the footer. The judge
          page is intentionally a snapshot of "live today", not an
          aspirational list. */}

      {/* Footer */}
      <footer className="border-t border-pot-border px-4 sm:px-6 py-8">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-pot-muted">
          <div>
            Built by{' '}
            <a href="https://x.com/CryptoYDao" target="_blank" rel="noreferrer" className="text-pot-accent hover:underline">
              @CryptoYDao
            </a>
            {' · '}Y-DAO Amsterdam{' · '}Superteam NL
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub</a>
            <span>·</span>
            <a href="https://x.com/PotBot_sol" target="_blank" rel="noreferrer" className="hover:text-white transition">X</a>
            <span>·</span>
            <Link href="/roadmap" className="hover:text-white transition">Roadmap</Link>
            <span>·</span>
            <Link href="/" className="hover:text-white transition">Home</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function LiveCard({
  title,
  value,
  href,
  hrefLabel,
  mono,
}: {
  title: string
  value: string
  href?: string
  hrefLabel?: string
  mono?: boolean
}) {
  const valueClass = `text-xs sm:text-sm break-all ${mono ? 'font-mono text-pot-green' : 'text-white'}`
  return (
    <div className="bg-pot-dark/40 border border-pot-border rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-pot-muted font-bold mb-1.5">{title}</div>
      <div className={valueClass}>{value}</div>
      {href && hrefLabel && (
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noreferrer' : undefined}
          className="mt-2 inline-block text-[11px] text-pot-accent hover:underline font-semibold"
        >
          {hrefLabel} ↗
        </a>
      )}
    </div>
  )
}

function PitchStep({
  range,
  headline,
  children,
}: {
  range: string
  headline: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3 sm:gap-4">
      <div className="shrink-0 w-16 sm:w-20 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-pot-accent pt-1">
        {range}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-white">{headline}</div>
        <div className="text-pot-muted text-sm mt-0.5">{children}</div>
      </div>
    </li>
  )
}
