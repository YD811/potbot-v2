'use client'

import Link from 'next/link'

const MANIFESTO_POINTS = [
  'programmable ownership',
  'liquid coordination',
  'AI-native execution',
  'onchain governance',
]

const ARCHITECTURE_FLOW = [
  'Community',
  'POT',
  'Vault',
  'Tokenized Shares',
  'Governance',
  'AI Layer',
]

const GOVERNANCE_SPECTRUM = [
  {
    title: 'Creator Controlled',
    desc: 'A trusted creator can move quickly while every treasury action remains visible onchain.',
  },
  {
    title: 'Community Governed',
    desc: 'Members coordinate proposals, votes, and execution through tokenized ownership.',
  },
  {
    title: 'AI Assisted',
    desc: 'Agents summarize context, draft actions, and help the community keep momentum.',
  },
]

const BOT_ACTIONS = [
  'generates proposals',
  'monitors vault activity',
  'helps coordinate governance',
  'executes through MCP, SDK and APIs',
]

const GARDEN_STAGES = ['🌱', '🌿', '🍀', '🌾', '🌺', '🌳']

const USE_CASES = [
  { icon: '🎥', title: 'Creator Fund', desc: 'Fans fund drops, content, and shared upside.' },
  { icon: '🤖', title: 'AI Vault', desc: 'Agents propose allocations for an onchain treasury.' },
  { icon: '🚀', title: 'Startup Syndicate', desc: 'Operators coordinate capital around early bets.' },
  { icon: '🎟️', title: 'Event Treasury', desc: 'Communities fund venues, prizes, and experiences.' },
  { icon: '👥', title: 'Friend Group ETF', desc: 'Friends share a transparent programmable vault.' },
  { icon: '🐸', title: 'Meme Treasury', desc: 'Memes get capital, governance, and lore.' },
  { icon: '📈', title: 'Investment Club', desc: 'Members vote on strategy with tokenized ownership.' },
]

const TRUST_ITEMS = [
  'Solana-native vault accounting',
  'Tokenized share ownership',
  'Readable proposal history',
  'Governance paths that mature over time',
]

/* ------------------------------------------------------------------ */
/*  Product mockup with 3-D tilt + gentle auto-rotation                */
/* ------------------------------------------------------------------ */
function LiveVaultMockup() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-white mb-3">
          See your vault <span className="text-pot-green">at a glance</span>
        </h2>
        <p className="text-white/75 max-w-xl mx-auto text-base">
          Every pot is a Solana program account. TVL, quorum, active proposals —
          all live onchain, all visible to every member.
        </p>
      </div>

      <div className="potbot-mock-wrap">
        {/* glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(20,241,149,0.14) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
        <div className="potbot-mock">
          <div className="potbot-mock-chrome">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <div className="url">potbot.fun/pot/AmsterdamDAO</div>
          </div>
          <div className="potbot-mock-body">
            <div className="potbot-mock-vault">
              <div className="vault-head">
                <div className="vault-name">
                  <div className="plant">🌿</div>
                  <div>
                    <div className="title">Amsterdam DAO Pot</div>
                    <div className="sub">Sprout · 7 members</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tvl">48.3 SOL</div>
                  <div className="sub">~ $6,920</div>
                </div>
              </div>

              <div className="stats">
                <div className="stat">
                  <div className="lbl">NAV</div>
                  <div className="val">1.072</div>
                </div>
                <div className="stat">
                  <div className="lbl">Quorum</div>
                  <div className="val">5/7</div>
                </div>
                <div className="stat">
                  <div className="lbl">30d</div>
                  <div className="val up">+7.2%</div>
                </div>
              </div>

              <div className="proposal">
                <div className="proposal-head">
                  <div className="proposal-title">Swap 5 SOL → JUP (agent)</div>
                  <span className="badge">Voting · 4h left</span>
                </div>
                <div className="bar"><div className="fill" /></div>
                <div className="vote-row">
                  <span>Yes 5 · No 1</span>
                  <span>72% · pass at 70%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .potbot-mock-wrap {
          position: relative;
          max-width: 720px;
          margin: 0 auto;
          perspective: 1400px;
        }
        .potbot-mock {
          position: relative;
          z-index: 1;
          border-radius: 20px;
          overflow: hidden;
          background: var(--c-card);
          border: 1px solid var(--c-border-2);
          box-shadow:
            0 40px 80px var(--c-surface-shadow),
            0 0 0 1px rgba(20,241,149,0.08) inset;
          transform-style: preserve-3d;
          transform-origin: 50% 50%;
          animation: potbot-tilt 9s ease-in-out infinite;
          transition: transform 0.6s cubic-bezier(0.2,0.8,0.2,1);
        }
        .potbot-mock:hover {
          animation-play-state: paused;
          transform: perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1.015);
        }
        @keyframes potbot-tilt {
          0%   { transform: perspective(1400px) rotateX(4deg)  rotateY(-10deg); }
          50%  { transform: perspective(1400px) rotateX(-3deg) rotateY(8deg); }
          100% { transform: perspective(1400px) rotateX(4deg)  rotateY(-10deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .potbot-mock { animation: none; transform: none; }
        }

        .potbot-mock-chrome {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px;
          background: var(--c-card-2);
          border-bottom: 1px solid var(--c-border);
        }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot.r { background: #FF5F56; }
        .dot.y { background: #FFBD2E; }
        .dot.g { background: #27C93F; }
        .url {
          flex: 1; text-align: center;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          color: var(--c-muted);
        }

        .potbot-mock-body { padding: 24px; }

        .potbot-mock-vault {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 14px;
          padding: 22px;
        }
        .vault-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .vault-name { display: flex; align-items: center; gap: 10px; }
        .plant {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(20,241,149,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
        }
        .title { font-weight: 700; font-size: 15px; color: var(--c-text); text-align: left; }
        .sub { font-size: 11px; color: var(--c-muted); text-align: left; }
        .tvl {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 700; font-size: 18px;
          color: var(--c-brand-green);
        }

        .stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 10px; margin-bottom: 18px;
        }
        .stat {
          background: var(--c-card-2);
          border-radius: 10px;
          padding: 10px 12px;
          text-align: left;
        }
        .lbl {
          font-size: 10px; color: var(--c-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .val {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 700; font-size: 14px; color: var(--c-text);
          margin-top: 2px;
        }
        .val.up { color: var(--c-brand-green); }

        .proposal {
          background: var(--c-card-2);
          border: 1px solid var(--c-border);
          border-radius: 12px;
          padding: 14px;
        }
        .proposal-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .proposal-title { font-size: 13px; font-weight: 600; color: var(--c-text); text-align: left; }
        .badge {
          font-size: 10px; padding: 3px 8px; border-radius: 6px;
          background: rgba(20,241,149,0.1); color: var(--c-brand-green);
          font-weight: 700;
        }
        .bar {
          height: 8px; background: var(--c-bg);
          border-radius: 999px; overflow: hidden;
          margin-bottom: 8px;
        }
        .fill {
          height: 100%; width: 0;
          background: linear-gradient(135deg, var(--c-brand-green) 0%, var(--c-brand-accent) 100%);
          border-radius: 999px;
          animation: fill 2.2s cubic-bezier(0.2,0.8,0.2,1) forwards;
        }
        @keyframes fill { to { width: 72%; } }
        .vote-row {
          display: flex; justify-content: space-between;
          font-size: 11px; color: var(--c-muted);
        }
      `}</style>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Claude chat mockup — "Ask Claude to manage your vault"             */
/* ------------------------------------------------------------------ */
function AskClaudeChat() {
  return (
    <div className="claude-chat">
      <div className="claude-head">
        <div className="claude-brand">
          <div className="claude-logo">✻</div>
          <div>
            <div className="claude-name">Claude</div>
            <div className="claude-sub">connected to potbot-mcp · devnet</div>
          </div>
        </div>
        <span className="claude-pill">Live</span>
      </div>

      <div className="claude-body">
        <div className="bubble bubble-user">
          Hey Claude, if SOL drops below <strong>$130</strong>, propose buying 10% more
          using the Amsterdam DAO vault balance.
        </div>

        <div className="bubble bubble-claude">
          <div className="claude-think">Checking SOL price via Pyth…</div>
          <div className="claude-tool">
            <span className="tool-label">Tool call</span>
            <code>
              create_swap_proposal({'{'}<br />
              &nbsp;&nbsp;pot: <span className="s">"AmsterdamDAO"</span>,<br />
              &nbsp;&nbsp;trigger: <span className="s">"SOL &lt; 130 USD"</span>,<br />
              &nbsp;&nbsp;inputMint: USDC, outputMint: SOL,<br />
              &nbsp;&nbsp;amount: vault.<span className="fn">pct</span>(<span className="s">"10%"</span>),<br />
              {'}'})
            </code>
          </div>
          <div className="claude-result">
            ✓ Proposal <strong>#42</strong> drafted. Members notified.
            Voting closes in 4h.
          </div>
        </div>
      </div>

      <style jsx>{`
        .claude-chat {
          max-width: 640px;
          margin: 0 auto;
          background: var(--c-card);
          border: 1px solid var(--c-border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 30px 60px var(--c-surface-shadow);
        }
        .claude-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px;
          background: linear-gradient(180deg, var(--c-card-2) 0%, var(--c-card) 100%);
          border-bottom: 1px solid var(--c-border);
        }
        .claude-brand { display: flex; align-items: center; gap: 12px; }
        .claude-logo {
          width: 32px; height: 32px; border-radius: 8px;
          background: #D97757; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700;
        }
        .claude-name { font-weight: 700; color: var(--c-text); font-size: 14px; }
        .claude-sub {
          font-size: 11px; color: var(--c-muted);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .claude-pill {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          padding: 3px 10px; border-radius: 999px;
          background: rgba(20,241,149,0.12); color: var(--c-brand-green);
          text-transform: uppercase;
        }
        .claude-body {
          padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .bubble {
          padding: 14px 16px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.5;
          max-width: 92%;
        }
        .bubble-user {
          align-self: flex-end;
          background: rgba(153,69,255,0.12);
          border: 1px solid rgba(153,69,255,0.25);
          color: var(--c-text);
        }
        .bubble-claude {
          align-self: flex-start;
          background: var(--c-card-2);
          border: 1px solid var(--c-border);
          color: var(--c-text-soft);
        }
        .claude-think {
          font-size: 12px; color: var(--c-muted);
          font-style: italic; margin-bottom: 10px;
        }
        .claude-tool {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }
        .tool-label {
          display: inline-block; font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--c-brand-accent); margin-bottom: 6px;
        }
        .claude-tool code {
          display: block;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11.5px; line-height: 1.6;
          color: var(--c-text-soft);
          white-space: pre-wrap;
        }
        .claude-tool .s { color: var(--c-brand-green); }
        .claude-tool .fn { color: #58A6FF; }
        .claude-result {
          font-size: 13px; color: var(--c-brand-green);
          padding-top: 4px;
        }
      `}</style>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-white overflow-hidden">
      {/* ── Hero: one idea above the fold ── */}
      <section className="relative min-h-[92vh] flex flex-col px-4 sm:px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-pot-green/10 blur-3xl" />
          <div className="absolute right-[-10rem] top-24 h-[28rem] w-[28rem] rounded-full bg-pot-accent/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <nav className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 py-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-black" aria-label="PotBot home">
            <span className="text-2xl">🪴</span>
            <span className="bg-gradient-to-r from-pot-green via-white to-pot-accent bg-clip-text text-transparent">PotBot</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-white/70 sm:gap-6">
            <a href="#architecture" className="transition hover:text-white">Protocol</a>
            <a href="#garden" className="transition hover:text-white">Garden</a>
            <a href="#use-cases" className="hidden transition hover:text-white sm:inline">Use cases</a>
            <Link href="/create" className="btn-primary !rounded-full !px-5 !py-2 text-sm">
              Launch a POT
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div className="text-center lg:text-left">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pot-green" />
              AI-native infrastructure for Solana communities
            </div>

            <h1 className="mx-auto mb-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:mx-0">
              Tokenize Any Internet Community
            </h1>

            <p className="mx-auto mb-10 max-w-[58ch] text-lg leading-relaxed text-white/75 sm:text-2xl lg:mx-0">
              Programmable onchain treasuries with AI coordination on Solana.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link href="/create" className="btn-primary glow-green w-full justify-center !rounded-full px-8 py-4 text-lg sm:w-auto">
                Launch a POT
              </Link>
              <Link href="/signup" className="btn-secondary w-full justify-center !rounded-full px-8 py-4 text-lg sm:w-auto">
                Join Waitlist
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end" aria-hidden="true">
            <div className="relative grid aspect-square w-[min(78vw,430px)] place-items-center">
              <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(20,241,149,0.30),transparent_58%),radial-gradient(circle,rgba(153,69,255,0.24),transparent_70%)] blur-xl animate-pulse-slow" />
              <div className="absolute h-[44%] w-[90%] rotate-[-18deg] rounded-full border border-white/15" />
              <div className="absolute h-[32%] w-[68%] rotate-[18deg] rounded-full border border-pot-accent/25" />
              <div className="relative z-10 animate-float text-[10rem] leading-none drop-shadow-[0_30px_35px_rgba(0,0,0,0.45)] sm:text-[14rem] md:text-[17rem]">
                🪴
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Manifesto ── */}
      <section className="border-y border-white/10 bg-black/10 px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-pot-green">Manifesto</p>
            <h2 className="max-w-[12ch] text-4xl font-black leading-tight tracking-[-0.04em] md:text-6xl">
              The internet already coordinates capital.
            </h2>
          </div>
          <div className="space-y-10">
            <div className="space-y-2 text-2xl font-bold leading-tight text-white md:text-4xl">
              <p>Friends invest together.</p>
              <p>Communities speculate together.</p>
              <p>Creators build economies together.</p>
            </div>
            <p className="max-w-[42ch] text-xl leading-relaxed text-white/75 md:text-2xl">
              But the infrastructure is still primitive.
            </p>
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl md:p-8">
              <p className="mb-6 text-lg text-white/70">PotBot gives every community:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {MANIFESTO_POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white/90">
                    <span className="text-pot-green">✦</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Simple architecture diagram ── */}
      <section id="architecture" className="px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-pot-green">Protocol in five seconds</p>
            <h2 className="mb-5 text-4xl font-black tracking-[-0.04em] md:text-6xl">
              From community energy to programmable capital.
            </h2>
            <p className="max-w-[64ch] text-lg leading-relaxed text-white/75 md:text-xl">
              POT means Programmable On-chain Treasury. BOT means Blockchain Orchestration Tool. Together, they turn social coordination into a transparent Solana-native vault.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl md:p-8">
            <div className="flex min-w-max items-stretch gap-3">
              {ARCHITECTURE_FLOW.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex min-h-[104px] w-[160px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <span className="text-xs text-white/35">0{index + 1}</span>
                    <strong className="text-lg leading-tight text-white">{item}</strong>
                  </div>
                  {index < ARCHITECTURE_FLOW.length - 1 ? (
                    <span className="text-2xl text-pot-green drop-shadow-[0_0_18px_rgba(0,255,136,0.5)]">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Keep this block and its animation intact. */}
      <LiveVaultMockup />

      {/* ── Governance ── */}
      <section className="bg-white/[0.015] px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-pot-green">Governance</p>
            <h2 className="mb-5 text-4xl font-black tracking-[-0.04em] md:text-5xl">
              Governance should match the community.
            </h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-white/75">
              Start simple. Mature when the treasury, membership, and decision quality need more decentralization.
            </p>
          </div>
          <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl md:grid-cols-3 md:p-6">
            {GOVERNANCE_SPECTRUM.map((mode, index) => (
              <article key={mode.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-full border border-pot-green/35 bg-gradient-to-br from-pot-green/20 to-pot-accent/20 font-black text-pot-green">
                  {index + 1}
                </div>
                <h3 className="mb-2 text-lg font-black text-white">{mode.title}</h3>
                <p className="text-sm leading-relaxed text-white/70">{mode.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOT / AI layer ── */}
      <section className="px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto grid max-w-6xl items-stretch gap-8 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl md:p-10">
            <div className="absolute inset-x-[-20%] top-[-55%] h-[70%] rotate-[8deg] bg-gradient-to-r from-transparent via-pot-green/10 to-transparent" />
            <div className="relative">
              <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-pot-accent">AI coordination</p>
              <h2 className="mb-5 text-4xl font-black tracking-[-0.04em] md:text-5xl">BOT = AI orchestration layer</h2>
              <p className="mb-8 max-w-[60ch] text-lg leading-relaxed text-white/75">
                The bot translates vault activity into readable next actions. It helps communities move from noisy chat to structured governance.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {BOT_ACTIONS.map((action) => (
                  <div key={action} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-white/85">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl md:p-10">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-pot-green">Readable trust</p>
            <h2 className="mb-5 text-4xl font-black tracking-[-0.04em] md:text-5xl">Protocol-grade without the cognitive overload.</h2>
            <p className="mb-8 max-w-[58ch] text-lg leading-relaxed text-white/75">
              PotBot keeps advanced rails available, but the main page explains the outcome first: ownership, coordination, and execution.
            </p>
            <ul className="space-y-3 text-white/85">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 text-pot-green">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* ── Garden Mode ── */}
      <section id="garden" className="border-y border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(20,241,149,0.10),transparent_45%)] px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-pot-green">Garden Mode</p>
          <h2 className="mb-5 text-4xl font-black tracking-[-0.04em] md:text-6xl">Duolingo streaks for finance.</h2>
          <p className="mx-auto mb-12 max-w-[68ch] text-lg leading-relaxed text-white/75 md:text-xl">
            Activity grows the POT. Participation unlocks evolution. Communities get identity, social flex, and a living signal of momentum.
          </p>

          <div className="mb-10 overflow-x-auto rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl md:p-8">
            <div className="flex min-w-max items-center justify-center gap-3 md:gap-5">
              {GARDEN_STAGES.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3 md:gap-5">
                  <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_10%,rgba(20,241,149,0.16),rgba(255,255,255,0.045))] text-4xl md:h-24 md:w-24 md:text-5xl">
                    {stage}
                  </span>
                  {index < GARDEN_STAGES.length - 1 ? <i className="h-px w-8 bg-gradient-to-r from-pot-green/30 to-pot-accent/60 md:w-16" /> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 text-left md:grid-cols-3">
            {['Contribute capital or ideas.', 'Vote, execute, and return.', 'Watch the community identity evolve.'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-lg text-white/85 backdrop-blur-xl">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section id="use-cases" className="px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-pot-green">Use cases</p>
              <h2 className="text-4xl font-black tracking-[-0.04em] md:text-6xl">What can a POT become?</h2>
            </div>
            <p className="max-w-[44ch] text-lg leading-relaxed text-white/75">
              One primitive. Many internet-native community economies.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((useCase) => (
              <article key={useCase.title} className="min-h-[190px] rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-pot-green/40 hover:shadow-[0_24px_80px_rgba(0,255,136,0.10)]">
                <div className="mb-5 text-4xl">{useCase.icon}</div>
                <h3 className="mb-2 text-lg font-black text-white">{useCase.title}</h3>
                <p className="text-sm leading-relaxed text-white/70">{useCase.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 py-20 sm:px-6 md:py-32">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center backdrop-blur-xl md:p-14">
          <div className="pointer-events-none absolute inset-x-[-30%] top-[-20%] h-56 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative">
            <div className="mb-6 text-5xl">🪴</div>
            <h2 className="mb-5 text-4xl font-black tracking-[-0.04em] md:text-6xl">Tokenize your community.</h2>
            <p className="mx-auto mb-10 max-w-[58ch] text-lg leading-relaxed text-white/75 md:text-xl">
              Reserve a POT for the creator, group chat, DAO, club, or agent network you already coordinate with.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/create" className="btn-primary glow-green w-full justify-center !rounded-full px-10 py-4 text-lg sm:w-auto">
                Launch Your POT
              </Link>
              <Link href="/signup" className="btn-secondary w-full justify-center !rounded-full px-10 py-4 text-lg sm:w-auto">
                Reserve Your POT
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
