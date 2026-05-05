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

const TRACKS: Track[] = [
  {
    sponsor: 'Jupiter',
    emoji: '🪐',
    what: 'Jupiter v6 CPI inside `pot_vault::execute_swap`. Vault PDA signs.',
    proof: 'See `programs/pot_vault/src/instructions/execute_swap.rs` — mode-aware (AdminDirect / Proposal / StrategyTrigger), JUPITER_V6_PROGRAM_ID constraint, vault-PDA signer.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/programs/pot_vault/src/instructions/execute_swap.rs',
    tier: 'live',
  },
  {
    sponsor: 'Solana Actions / Blinks',
    emoji: '⚡',
    what: 'Vote and deposit straight from a tweet — no app install.',
    proof: 'Endpoints at `/api/actions/[potPubkey]/{deposit,vote}`. Tweet a pot — Twitter renders an interactive Blink card.',
    proofHref: '/api/actions',
    tier: 'live',
  },
  {
    sponsor: 'MCP / Model Context Protocol',
    emoji: '🤖',
    what: 'Claude / GPT / any MCP-aware agent can manage a pot.',
    proof: '`@potbot/mcp@0.2.0` on npm — HTTP + SSE, x402 payments. 9 free tools + 3 paid.',
    proofHref: 'https://www.npmjs.com/package/@potbot/mcp',
    tier: 'live',
  },
  {
    sponsor: 'Helius',
    emoji: '⚡',
    what: 'RPC + webhooks + priority fees for the entire stack.',
    proof: 'Wired in `apps/api/src/services/helius.ts` and front-end via `NEXT_PUBLIC_HELIUS_RPC`.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/api/src/services/helius.ts',
    tier: 'live',
  },
  {
    sponsor: 'Squads v4',
    emoji: '🛡',
    what: 'Optional multisig path for the pot creator role.',
    proof: 'Detection in `apps/web/src/lib/squads.ts`. UI banner highlights when a pot is owned by a Squads vault.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/src/lib/squads.ts',
    tier: 'live',
  },
  {
    sponsor: 'Solana Mobile (Saga / Seeker)',
    emoji: '📱',
    what: 'PWA manifest ships today, dApp Store metadata next.',
    proof: '`apps/web/public/manifest.json` is mainnet-ready (theme color, icons, categories). Saga / Seeker dApp Store entry on the roadmap.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/public/manifest.json',
    tier: 'live',
  },
  {
    sponsor: 'Dune Analytics',
    emoji: '📊',
    what: 'Public on-chain dashboard fed from Anchor accounts.',
    proof: 'Dune SIM portfolio + activity wired in `VaultPortfolio` component. Public dashboard at dune.com/potbot ships when `DUNE_API_KEY` is set in Vercel.',
    tier: 'devnet',
  },
  {
    sponsor: 'Privy',
    emoji: '🪪',
    what: 'Email / social login → 60-second onboarding for non-crypto users.',
    proof: 'Implementation branch exists, but PR #32 was closed without merge. Phase 2 until env setup, review, and merge are complete.',
    proofHref: 'https://github.com/YD811/potbot-v2/pull/32',
    tier: 'phase-2',
  },
  {
    sponsor: 'Pyth Network',
    emoji: '🔮',
    what: 'In-program oracle guard — re-reads price inside execute_swap to reject keepers that fired on stale data.',
    proof: 'Code path is reserved (StrategyTrigger mode); Pyth SDK wiring is the next mainnet promotion.',
    tier: 'phase-2',
  },
  {
    sponsor: 'Metaplex Token Metadata',
    emoji: '🎨',
    what: 'Tamagotchi NFT mint at L4 (Bloom).',
    proof: '`mint_tamagotchi_nft.rs` written, gated behind level check. Ships at Phase 3.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/programs/pot_vault/src/instructions/mint_tamagotchi_nft.rs',
    tier: 'phase-3',
  },
  {
    sponsor: 'Light Protocol',
    emoji: '🪶',
    what: 'ZK-compressed audit log for swap events + NAV snapshots.',
    proof: 'Spec lives in `docs/architecture/architecture-onchain.md`. Phase 2 cut.',
    tier: 'phase-2',
  },
  {
    sponsor: 'Adevar Labs',
    emoji: '🔒',
    what: 'Pre-mainnet-GA security audit (target post-hackathon).',
    proof: 'Audit credits requested via Superteam NL. Out-of-scope for May 11 submission, in-scope for accelerator phase.',
    tier: 'vision',
  },
]

interface ArchLayer {
  layer: string
  color: string
  items: { name: string; tier: StatusTier }[]
}

const ARCHITECTURE: ArchLayer[] = [
  {
    layer: 'On-chain · Anchor 0.30',
    color: 'green',
    items: [
      { name: 'pot_vault program (30+ ix)', tier: 'live' },
      { name: 'create_pot · deposit · withdraw', tier: 'live' },
      { name: 'create_proposal · vote · execute_swap', tier: 'live' },
      { name: 'Jupiter v6 CPI (vault-PDA signer)', tier: 'live' },
      { name: 'Pot admin (pause / allowed mints)', tier: 'live' },
      { name: 'Strategy slot accounts', tier: 'devnet' },
      { name: 'Pyth in-program oracle guard', tier: 'phase-2' },
      { name: 'Tamagotchi NFT mint (Metaplex)', tier: 'phase-3' },
    ],
  },
  {
    layer: 'Off-chain · Next.js 14 + apps/api',
    color: 'purple',
    items: [
      { name: 'Pot detail UX (sticky hero, sponsor rail)', tier: 'live' },
      { name: 'Solana Action endpoints', tier: 'live' },
      { name: 'Helius RPC + webhook ingest', tier: 'live' },
      { name: 'PotBot AI base layer (suggestions feed)', tier: 'devnet' },
      { name: 'User AI delegate (rules + presets)', tier: 'devnet' },
      { name: 'Privy embedded wallets', tier: 'phase-2' },
      { name: 'STAMPPOT privacy preview', tier: 'phase-3' },
    ],
  },
  {
    layer: 'Composability · Solana ecosystem',
    color: 'amber',
    items: [
      { name: 'Jupiter v6 swap (CPI)', tier: 'live' },
      { name: 'Squads v4 multisig (optional creator)', tier: 'live' },
      { name: '@potbot/mcp on npm', tier: 'live' },
      { name: 'Solana Blinks (Twitter/X)', tier: 'live' },
      { name: 'PWA manifest (Saga / Seeker)', tier: 'live' },
      { name: 'Dune SIM analytics', tier: 'devnet' },
      { name: 'Light Protocol ZK audit log', tier: 'phase-2' },
      { name: 'Saga / Seeker dApp Store entry', tier: 'vision' },
    ],
  },
]

const WEDGE = [
  { who: 'Squads', does: 'Multisig custody', noTrade: true },
  { who: 'Drift Vaults', does: 'Single-strategy structured products', noTrade: false, why: 'Curators only — no group governance per swap' },
  { who: 'Kamino / Gauntlet', does: 'Institutional curators', noTrade: false, why: 'No group primitive for friends pooling capital' },
  { who: 'PotBot', does: 'Group trading vault', noTrade: false, why: 'Deposit + vote + Jupiter CPI in one Anchor program', highlight: true },
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
            Squads moves money.<br />PotBot trades it.
          </h1>
          <p className="text-base sm:text-xl text-pot-muted max-w-2xl mx-auto">
            Group trading vaults on Solana. Five friends spin up a pot, deposit SOL, vote on a Jupiter swap, and execute it on-chain in under 60 seconds. All in a single Anchor program.
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
              value="@potbot/mcp@0.2.0"
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
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">The wedge</h2>
          <p className="text-pot-muted max-w-2xl mb-6">
            Group on-chain governance baked <strong className="text-white">into the swap instruction</strong>. Nobody else ships this primitive.
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
                        <span className="text-pot-muted text-xs">{w.why ?? '—'}</span>
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
              <p className="text-pot-muted text-sm mt-1">Every claim is labelled with its lifecycle status. Live items are verifiable on Explorer.</p>
            </div>
            <Link href="/roadmap" className="text-xs text-pot-accent hover:underline font-semibold">
              See the full roadmap →
            </Link>
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
              Five friends want to trade together. Today they share a seed phrase or build a Squads multisig with no trading UI. Both suck.
            </PitchStep>
            <PitchStep range="15–30s" headline="Solution">
              PotBot is a group trading vault. Deposit. Propose. Vote. Execute. All on-chain, in one Anchor program.
            </PitchStep>
            <PitchStep range="30–60s" headline="Live demo">
              Open `/vaults` → click a public pot → deposit 0.05 SOL via wallet → propose a swap → vote yes → watch it execute on Jupiter, Solana Explorer link visible.
            </PitchStep>
            <PitchStep range="60–80s" headline="Differentiation">
              Solana Blinks turn any proposal into a tweet anyone can vote on. MCP lets Claude/GPT manage a pot. The on-chain `execute_swap` instruction is mode-aware — Admin / Proposal / AI-trigger — and matches mode-source strictly.
            </PitchStep>
            <PitchStep range="80–90s" headline="Ask">
              The devnet product is live today, with mainnet planned after the final safety pass. We want Colosseum to help turn AI-governed strategy vaults into a production business.
            </PitchStep>
          </ol>
        </div>
      </section>

      {/* What's next */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-[1100px] mx-auto bg-gradient-to-br from-pot-accent/10 to-pot-green/5 border border-pot-accent/30 rounded-3xl p-6 sm:p-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">What ships next</h2>
          <p className="text-pot-muted max-w-xl mx-auto mb-5 text-sm sm:text-base">
            Privy embedded wallets, Pyth in-program oracle guard, Meteora &amp; Kamino yield CPIs, Light Protocol ZK audit log, Tamagotchi NFT mint, STAMPPOT privacy mode. Each phase is tagged on the public roadmap.
          </p>
          <Link
            href="/roadmap"
            className="inline-block px-5 py-3 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold transition text-sm sm:text-base"
          >
            🗺️ Open /roadmap
          </Link>
        </div>
      </section>

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
