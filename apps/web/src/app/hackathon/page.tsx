import Link from 'next/link'
import type { Metadata } from 'next'
import { StatusBadge, type StatusTier } from '@/components/StatusBadge'

export const metadata: Metadata = {
  title: 'PotBot · AI-native infrastructure for tokenized internet capital',
  description:
    'PotBot is the AI-native infrastructure for tokenized internet capital on Solana. Programmable onchain treasuries with AI coordination, MCP, Blinks and Jupiter v6.',
}

const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'
const FLAGSHIP_POT = process.env.NEXT_PUBLIC_ONE_POT_PUBKEY ?? ''
const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://potbot.fun'
const EXPLORER_SUFFIX = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`

interface UseCase {
  emoji: string
  title: string
  desc: string
  accent: 'green' | 'purple'
}

const USE_CASES: UseCase[] = [
  { emoji: '🎨', title: 'Creator Fund', desc: 'Fans co-own the next drop and split the upside.', accent: 'green' },
  { emoji: '🧠', title: 'AI Vault', desc: 'An agent runs a strategy, the community sets the rules.', accent: 'purple' },
  { emoji: '🚀', title: 'Startup Syndicate', desc: 'Angel checks pooled, deployed, and tracked onchain.', accent: 'green' },
  { emoji: '🎟', title: 'Event Treasury', desc: 'Conference floats, hackathon prizes, festival cash, all transparent.', accent: 'purple' },
  { emoji: '👥', title: 'Friend Group ETF', desc: 'A shared basket your group actually agrees on.', accent: 'green' },
  { emoji: '🎲', title: 'Meme Treasury', desc: 'Communities betting together, governed together.', accent: 'purple' },
  { emoji: '💼', title: 'Investment Club', desc: 'Quarterly proposals, monthly votes, zero spreadsheets.', accent: 'green' },
]

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
    sponsor: 'Jupiter v6',
    emoji: '🪐',
    what: 'The vault PDA signs every swap via Jupiter v6 CPI inside `pot_vault::execute_swap`.',
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
    what: 'Any MCP client (Claude, Cursor, Cline) can list, propose and vote on POTs.',
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
    what: 'POT authority can be a Squads multisig. Governance settings flow through Squads when set.',
    proof: 'Detection in `apps/web/src/lib/squads.ts`. UI banner surfaces multisig POTs; settings updates queue as Squads transactions.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/src/lib/squads.ts',
    tier: 'live',
  },
  {
    sponsor: 'Multi-asset portfolio',
    emoji: '📊',
    what: 'Treasury holdings grouped into Stable · SOL ecosystem · DeFi/LP · Liquid staking · High risk. Up to 10 assets per POT.',
    proof: 'Component at `apps/web/src/components/VaultPortfolioDisplay.tsx`. Renders an allocation bar + per-category list on every POT page.',
    proofHref: 'https://github.com/YD811/potbot-v2/blob/main/apps/web/src/components/VaultPortfolioDisplay.tsx',
    tier: 'live',
  },
  {
    sponsor: 'BOT — AI orchestration',
    emoji: '🧠',
    what: 'Proposal generation, automated execution, governance coordination. One click → onchain proposal.',
    proof: '`PotBotAISuggestions` runs deterministic heuristics over treasury state + live prices; cron at `app/api/cron/agent-poll` posts proposals on-chain when AGENT_KEYPAIR is set.',
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

const ARCHITECTURE: ArchLayer[] = [
  {
    layer: 'On-chain · Anchor 0.30',
    color: 'green',
    items: [
      { name: 'pot_vault program — 30+ instructions', tier: 'live' },
      { name: 'create_pot · deposit · withdraw', tier: 'live' },
      { name: 'create_proposal · vote · execute_proposal', tier: 'live' },
      { name: 'execute_swap → Jupiter v6 CPI (vault-PDA signer)', tier: 'live' },
      { name: 'POT admin: pause · allowed mints · spending policy', tier: 'live' },
      { name: 'Strategy slot accounts (StopLoss · TP · Trailing)', tier: 'live' },
      { name: 'Delegate / vote_as_delegate flow', tier: 'live' },
    ],
  },
  {
    layer: 'Off-chain · Next.js 14 + Vercel Functions',
    color: 'purple',
    items: [
      { name: 'POT detail UX (sticky hero, tabs)', tier: 'live' },
      { name: 'Solana Action endpoints', tier: 'live' },
      { name: 'Helius RPC + webhook indexer', tier: 'live' },
      { name: 'Multi-asset portfolio panel', tier: 'live' },
      { name: 'BOT base layer (suggestion feed)', tier: 'live' },
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
  { who: 'Squads', does: 'Multisig custody. No coordination layer.', why: 'Treasury, not strategy' },
  { who: 'Drift Vaults', does: 'Curator-run structured products.', why: 'No community governance per swap' },
  { who: 'Kamino / Gauntlet', does: 'Institutional curators.', why: 'No primitive for communities pooling capital' },
  {
    who: 'PotBot',
    does: 'Programmable treasury + AI orchestration.',
    why: 'Deposit + vote + Jupiter CPI + AI in one Anchor program',
    highlight: true,
  },
]

export default function HackathonPage() {
  const programExplorerUrl = `https://explorer.solana.com/address/${PROGRAM_ID}${EXPLORER_SUFFIX}`
  const flagshipUrl = FLAGSHIP_POT ? `${APP_URL}/pots/${FLAGSHIP_POT}` : null
  const flagshipBlinkUrl = FLAGSHIP_POT ? `${APP_URL}/api/actions/${FLAGSHIP_POT}/deposit` : null

  return (
    <main className="min-h-screen bg-pot-dark text-white overflow-hidden">
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

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center overflow-hidden">
        {/* Cinematic glow backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(20,241,149,0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(153,69,255,0.10), transparent 60%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px -z-10"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(20,241,149,0.4), rgba(153,69,255,0.4), transparent)' }}
        />

        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pot-accent/30 bg-pot-accent/10 text-pot-accent text-[11px] font-bold uppercase tracking-wider mb-8">
            🏁 Submission for Colosseum / Solana Frontier 2026
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 leading-[1.05] tracking-tight">
            <span className="bg-gradient-to-br from-white via-white to-pot-green/80 bg-clip-text text-transparent">
              Tokenize Any
            </span>
            <br />
            <span className="bg-gradient-to-br from-pot-green via-pot-green to-pot-accent bg-clip-text text-transparent">
              Internet Community
            </span>
          </h1>

          <p className="text-lg sm:text-2xl text-pot-muted max-w-2xl mx-auto leading-relaxed">
            Programmable onchain treasuries with{' '}
            <span className="text-white font-semibold">AI coordination</span> on Solana.
          </p>

          <div className="mt-10 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <Link
              href="/create"
              className="px-6 sm:px-7 py-3.5 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold transition text-sm sm:text-base shadow-[0_0_40px_rgba(20,241,149,0.25)]"
            >
              + Launch a POT
            </Link>
            {flagshipUrl ? (
              <a
                href={flagshipUrl}
                className="px-6 sm:px-7 py-3.5 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold transition text-sm sm:text-base shadow-[0_0_40px_rgba(153,69,255,0.25)]"
              >
                🪴 Open flagship POT
              </a>
            ) : (
              <Link
                href="/vaults"
                className="px-6 sm:px-7 py-3.5 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold transition text-sm sm:text-base shadow-[0_0_40px_rgba(153,69,255,0.25)]"
              >
                🪴 Browse public POTs
              </Link>
            )}
            <a
              href="https://www.npmjs.com/package/@potbot/mcp"
              target="_blank"
              rel="noreferrer"
              className="px-6 sm:px-7 py-3.5 rounded-xl bg-pot-card/80 backdrop-blur border border-pot-border hover:border-pot-accent/40 text-white font-bold transition text-sm sm:text-base"
            >
              🤖 Install MCP
            </a>
          </div>
        </div>
      </section>

      {/* ── MANIFESTO ──────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 sm:py-28 border-y border-pot-border overflow-hidden">
        {/* Animated network backdrop */}
        <div aria-hidden className="absolute inset-0 -z-10 opacity-40">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(20,241,149,0.6)" />
                <stop offset="100%" stopColor="rgba(20,241,149,0)" />
              </radialGradient>
              <radialGradient id="node-glow-purple" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(153,69,255,0.5)" />
                <stop offset="100%" stopColor="rgba(153,69,255,0)" />
              </radialGradient>
            </defs>
            <line x1="15%" y1="20%" x2="50%" y2="50%" stroke="rgba(20,241,149,0.18)" strokeWidth="1" />
            <line x1="85%" y1="25%" x2="50%" y2="50%" stroke="rgba(153,69,255,0.18)" strokeWidth="1" />
            <line x1="20%" y1="80%" x2="50%" y2="50%" stroke="rgba(20,241,149,0.18)" strokeWidth="1" />
            <line x1="80%" y1="78%" x2="50%" y2="50%" stroke="rgba(153,69,255,0.18)" strokeWidth="1" />
            <line x1="50%" y1="10%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1="50%" y1="90%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx="15%" cy="20%" r="60" fill="url(#node-glow)" />
            <circle cx="85%" cy="25%" r="60" fill="url(#node-glow-purple)" />
            <circle cx="20%" cy="80%" r="60" fill="url(#node-glow)" />
            <circle cx="80%" cy="78%" r="60" fill="url(#node-glow-purple)" />
            <circle cx="50%" cy="50%" r="100" fill="url(#node-glow)" opacity="0.7" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-green mb-6">
            Manifesto
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-[1.15] mb-10">
            The internet already
            <br className="hidden sm:block" />{' '}
            <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
              coordinates capital.
            </span>
          </h2>

          <div className="space-y-3 text-lg sm:text-xl text-pot-muted max-w-2xl mx-auto leading-relaxed">
            <p>Friends invest together.</p>
            <p>Communities speculate together.</p>
            <p>Creators build economies together.</p>
          </div>

          <div className="my-10 inline-block px-5 py-2 rounded-full bg-pot-card/60 backdrop-blur border border-pot-border text-sm text-white">
            But the infrastructure is still primitive.
          </div>

          <p className="text-xl sm:text-2xl text-white font-semibold mb-8">
            POTBOT gives every internet community:
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { label: 'Programmable ownership', accent: 'green' },
              { label: 'Liquid coordination', accent: 'purple' },
              { label: 'AI-native execution', accent: 'green' },
              { label: 'Onchain governance', accent: 'purple' },
            ].map((p) => (
              <div
                key={p.label}
                className="bg-pot-card/60 backdrop-blur border rounded-2xl p-4 text-sm font-semibold text-white"
                style={{
                  borderColor: p.accent === 'green' ? 'rgba(20,241,149,0.25)' : 'rgba(153,69,255,0.25)',
                  boxShadow: `0 0 30px ${p.accent === 'green' ? 'rgba(20,241,149,0.08)' : 'rgba(153,69,255,0.08)'}`,
                }}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ──────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-accent mb-4">
              Use cases
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              What can a <span className="text-pot-green">POT</span> become?
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="group relative bg-pot-card/60 backdrop-blur border border-pot-border rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{
                  boxShadow: '0 0 0 transparent',
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow:
                      u.accent === 'green'
                        ? '0 0 40px rgba(20,241,149,0.18), inset 0 0 0 1px rgba(20,241,149,0.4)'
                        : '0 0 40px rgba(153,69,255,0.18), inset 0 0 0 1px rgba(153,69,255,0.4)',
                  }}
                />
                <div className="text-3xl mb-3">{u.emoji}</div>
                <div
                  className="text-base font-bold mb-1.5"
                  style={{ color: u.accent === 'green' ? '#14F195' : '#9945FF' }}
                >
                  {u.title}
                </div>
                <p className="text-xs text-pot-muted leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOT — AI ORCHESTRATION LAYER ───────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 border-y border-pot-border overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(153,69,255,0.10), transparent 60%)',
          }}
        />
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-accent mb-4">
              The agent layer
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
              <span className="text-pot-accent">BOT</span> = AI orchestration layer
            </h2>
            <p className="text-pot-muted max-w-2xl mx-auto text-base sm:text-lg">
              Built for the coming agent economy. Every POT exposes a programmatic surface
              that an AI can read, propose against, and execute through.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { e: '✍️', t: 'Proposal generation', d: 'Agent reads treasury state and live prices, then drafts the next move.' },
              { e: '⚙️', t: 'Automated execution', d: 'Once quorum is reached, the BOT submits the swap with the vault PDA as signer.' },
              { e: '🗳', t: 'Governance coordination', d: 'Delegated votes, rule presets, weighted thresholds — handled by the agent.' },
              { e: '🔌', t: 'MCP integrations', d: 'Claude, Cursor, Cline can list, propose and vote on POTs over `npx @potbot/mcp`.' },
              { e: '🛠', t: 'SDK + API', d: 'TypeScript SDK and JSON RPC surface for any agent framework or backend.' },
            ].map((c) => (
              <div
                key={c.t}
                className="bg-pot-card/60 backdrop-blur border border-pot-accent/20 rounded-2xl p-5 hover:border-pot-accent/50 transition"
                style={{ boxShadow: '0 0 30px rgba(153,69,255,0.06)' }}
              >
                <div className="text-2xl mb-3">{c.e}</div>
                <div className="text-sm font-bold text-white mb-1.5">{c.t}</div>
                <p className="text-xs text-pot-muted leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GARDEN MODE ────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(20,241,149,0.10), transparent 60%)',
          }}
        />
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-green mb-4">
              Garden mode
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
              Duolingo streaks{' '}
              <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
                for finance.
              </span>
            </h2>
            <p className="text-pot-muted text-base sm:text-lg leading-relaxed mb-6">
              Every POT grows a living plant tied to the community&apos;s rhythm.
              Deposits, votes, proposals and new members all push it forward.
              Skip a week and it wilts. The garden is the part you actually
              feel — the streak you don&apos;t want to lose.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { e: '🌱', t: 'Evolution', d: 'Six visible stages from seed to bloom.' },
                { e: '📈', t: 'Progression', d: 'XP from real onchain activity, not clicks.' },
                { e: '✨', t: 'Rarity', d: 'Top performers unlock cosmetic skins and traits.' },
                { e: '❤️', t: 'Attachment', d: 'A pet you co-own with people you trust.' },
              ].map((g) => (
                <div
                  key={g.t}
                  className="bg-pot-card/60 backdrop-blur border border-pot-green/20 rounded-xl p-4"
                >
                  <div className="text-xl mb-1">{g.e}</div>
                  <div className="text-sm font-bold text-white">{g.t}</div>
                  <p className="text-xs text-pot-muted mt-0.5">{g.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plant evolution visual */}
          <div className="relative">
            <div
              className="rounded-3xl border border-pot-green/30 bg-pot-card/50 backdrop-blur p-8 sm:p-10"
              style={{ boxShadow: '0 0 80px rgba(20,241,149,0.15)' }}
            >
              <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
                {['🌱', '🌿', '🪴', '🌳', '🌸', '🌺'].map((p, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-transform hover:scale-110"
                      style={{
                        background: `rgba(20,241,149,${0.04 + i * 0.02})`,
                        border: `1px solid rgba(20,241,149,${0.15 + i * 0.05})`,
                        boxShadow: i >= 4 ? '0 0 30px rgba(20,241,149,0.3)' : 'none',
                      }}
                    >
                      {p}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-pot-muted">
                      Stage {i + 1}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center text-xs text-pot-muted">
                The garden compounds with the community.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SNS IDENTITY ───────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 border-y border-pot-border overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 30% 50%, rgba(20,241,149,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 70% 50%, rgba(153,69,255,0.10), transparent 60%)',
          }}
        />
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-green mb-4">
            Onchain identity
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-6">
            Every POT becomes an{' '}
            <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
              onchain identity.
            </span>
          </h2>
          <p className="text-pot-muted text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            SNS-native naming. Communities don&apos;t share pubkeys, they share
            a name. Memorable, portable, and yours.
          </p>

          <div className="inline-flex flex-col gap-3">
            {['amsterdam-alpha.potbot.sol', 'frontier-syndicate.potbot.sol', 'memes-only.potbot.sol'].map(
              (name, i) => (
                <div
                  key={name}
                  className="px-6 py-4 rounded-2xl bg-pot-card/60 backdrop-blur border font-mono text-base sm:text-lg text-white"
                  style={{
                    borderColor: i % 2 === 0 ? 'rgba(20,241,149,0.3)' : 'rgba(153,69,255,0.3)',
                    boxShadow: `0 0 30px ${i % 2 === 0 ? 'rgba(20,241,149,0.1)' : 'rgba(153,69,255,0.1)'}`,
                  }}
                >
                  <span className="text-pot-muted">{name.split('.potbot.sol')[0]}</span>
                  <span style={{ color: i % 2 === 0 ? '#14F195' : '#9945FF' }}>.potbot.sol</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── LIVE NOW BLOCK (judge proof — kept) ────────────────────────── */}
      <section className="px-4 sm:px-6 py-16">
        <div className="max-w-[1100px] mx-auto bg-pot-card/60 backdrop-blur border border-pot-green/30 rounded-3xl p-6 sm:p-8">
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
                title="Flagship POT"
                value={FLAGSHIP_POT}
                href={flagshipUrl ?? undefined}
                hrefLabel="Open in app"
                mono
              />
            ) : (
              <LiveCard
                title="Flagship POT"
                value="(devnet flagship not configured)"
                hrefLabel="See devnet POTs →"
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

      {/* ── WEDGE ──────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Where PotBot sits</h2>
          <p className="text-pot-muted max-w-2xl mb-6">
            Onchain coordination baked{' '}
            <strong className="text-white">into the swap instruction</strong>, with an AI
            orchestration layer on top. Nobody else ships this stack on Solana today.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-pot-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pot-card text-left">
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-pot-muted">Project</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-pot-muted">What it does</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-pot-muted">Coordination + AI primitive?</th>
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
                          ✅ Yes — pot_vault::execute_swap + BOT
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

      {/* ── SPONSOR TRACKS ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-16">
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

      {/* ── ARCHITECTURE ───────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Architecture</h2>
          <p className="text-pot-muted text-sm mb-6 max-w-2xl">
            Three layers — onchain, off-chain, composability. Every item carries its lifecycle chip so nothing on this page is over-promised.
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

      {/* ── FOUNDER CREDIBILITY ────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 border-y border-pot-border overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(153,69,255,0.08), transparent 60%)',
          }}
        />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-accent mb-4">
              Built by
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              A decade of crypto,{' '}
              <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
                soloed into Solana.
              </span>
            </h2>
          </div>

          <div className="bg-pot-card/60 backdrop-blur border border-pot-border rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pot-green to-pot-accent flex items-center justify-center text-2xl font-black text-pot-dark"
                style={{ boxShadow: '0 0 40px rgba(20,241,149,0.3)' }}
              >
                YD
              </div>
              <div>
                <div className="text-lg font-bold text-white">@CryptoYDao</div>
                <div className="text-xs text-pot-muted">Y-DAO Amsterdam · Superteam NL</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { e: '🪙', t: '10 years in crypto', d: 'Through every cycle since 2015.' },
                { e: '🏦', t: 'Ex Binance', d: 'Business development.' },
                { e: '🛡', t: 'Ex Trust Wallet', d: 'Self-custody at scale.' },
                { e: '☀️', t: 'Solana since 2021', d: 'Ecosystem contributor through every wave.' },
                { e: '🎤', t: 'Breakpoint since 2023', d: 'Every year, in person.' },
                { e: '🤖', t: 'AI-native MVP', d: 'The entire product, soloed with agents.' },
              ].map((c) => (
                <div key={c.t} className="flex items-start gap-3 p-3 rounded-xl bg-pot-dark/40 border border-pot-border">
                  <div className="text-xl shrink-0">{c.e}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">{c.t}</div>
                    <div className="text-xs text-pot-muted">{c.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 90-SECOND PITCH ────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-16">
        <div className="max-w-[1100px] mx-auto bg-pot-card/60 backdrop-blur border border-pot-border rounded-3xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5">90-second pitch</h2>
          <ol className="space-y-4 text-sm sm:text-base">
            <PitchStep range="0–15s" headline="Problem">
              Internet communities want to coordinate capital — creator funds, syndicates,
              meme treasuries. Today they share seed phrases or wire a Squads multisig with
              no coordination layer. Both are dead ends.
            </PitchStep>
            <PitchStep range="15–30s" headline="Solution">
              POTBOT is the AI-native infrastructure for tokenized internet capital.
              Programmable treasury, onchain governance, AI orchestration — all in one
              Anchor program. The community votes; the BOT proposes and executes.
            </PitchStep>
            <PitchStep range="30–60s" headline="Live demo">
              Open <code>/vaults</code> → click the flagship POT → deposit 0.05 SOL → the
              BOT tab surfaces a rebalance / liquid-staking / LP suggestion → submit as
              proposal → vote yes → watch <code>execute_swap</code> hit Jupiter v6 with
              the vault PDA as signer.
            </PitchStep>
            <PitchStep range="60–80s" headline="Differentiation">
              Three things only POTBOT ships together: (1) onchain group governance baked
              into the swap ix, (2) MCP-native server so any AI agent can run a treasury,
              (3) Solana Blinks so a proposal becomes a vote-able tweet.
            </PitchStep>
            <PitchStep range="80–90s" headline="Ask">
              Devnet product is live today. Mainnet ships after the security pass. We&apos;re
              asking Colosseum to back the team building the foundation layer for
              internet-native economies on Solana.
            </PitchStep>
          </ol>
        </div>
      </section>

      {/* ── FOOTER CTA ─────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-24 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(20,241,149,0.12), transparent 60%), radial-gradient(ellipse 70% 60% at 50% 50%, rgba(153,69,255,0.10), transparent 60%)',
          }}
        />
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-6xl font-black text-white leading-[1.1] mb-6">
            Ready to{' '}
            <span className="bg-gradient-to-r from-pot-green to-pot-accent bg-clip-text text-transparent">
              tokenize your community?
            </span>
          </h2>
          <p className="text-pot-muted text-base sm:text-lg max-w-xl mx-auto mb-10">
            Spin up a programmable treasury in minutes. Invite your people.
            Let the BOT do the heavy lifting.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/create"
              className="px-7 py-4 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold transition text-base shadow-[0_0_50px_rgba(20,241,149,0.3)]"
            >
              + Launch a POT
            </Link>
            <Link
              href="/beta"
              className="px-7 py-4 rounded-xl bg-pot-card/80 backdrop-blur border border-pot-accent/40 text-white hover:border-pot-accent font-bold transition text-base"
            >
              Join Waitlist
            </Link>
          </div>
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
