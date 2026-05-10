const manifestoPoints = [
  'programmable ownership',
  'liquid coordination',
  'AI-native execution',
  'onchain governance',
]

const architecture = [
  'Community',
  'POT',
  'Vault',
  'Tokenized Shares',
  'Governance',
  'AI Layer',
]

const governanceModes = [
  {
    title: 'Creator Controlled',
    desc: 'A trusted founder or creator moves fast with transparent treasury operations.',
  },
  {
    title: 'Community Governed',
    desc: 'Members use tokenized shares to propose, vote, and coordinate onchain decisions.',
  },
  {
    title: 'AI Assisted',
    desc: 'Agents summarize activity, draft proposals, and help keep governance moving.',
  },
]

const botActions = [
  'generates proposals',
  'monitors vault activity',
  'helps coordinate governance',
  'executes through MCP, SDK and APIs',
]

const gardenStages = ['🌱', '🌿', '🍀', '🌾', '🌺', '🌳']

const useCases = [
  { icon: '🎥', title: 'Creator Fund', desc: 'Fans fund drops, content, and shared upside.' },
  { icon: '🤖', title: 'AI Vault', desc: 'Agents propose allocations for an onchain treasury.' },
  { icon: '🚀', title: 'Startup Syndicate', desc: 'Operators coordinate capital around early bets.' },
  { icon: '🎟️', title: 'Event Treasury', desc: 'Communities fund venues, prizes, and experiences.' },
  { icon: '👥', title: 'Friend Group ETF', desc: 'Friends share a transparent programmable vault.' },
  { icon: '🐸', title: 'Meme Treasury', desc: 'Memes get capital, governance, and lore.' },
  { icon: '📈', title: 'Investment Club', desc: 'Members vote on strategy with tokenized ownership.' },
]

const trustItems = [
  'Solana-native vault accounting',
  'Tokenized share ownership',
  'Readable proposal history',
  'Governance paths that can mature over time',
]

export default function Home() {
  return (
    <main className="min-h-screen grid-bg overflow-hidden">
      <section className="relative min-h-screen flex flex-col px-6">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <nav className="relative z-20 max-w-6xl w-full mx-auto py-6 flex flex-wrap gap-4 items-center justify-between">
          <a href="#top" className="flex items-center gap-2 font-bold text-xl" aria-label="PotBot home">
            <span className="text-2xl">🪴</span>
            <span className="gradient-text">PotBot</span>
          </a>
          <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-300">
            <a href="#architecture" className="hover:text-white transition-colors">Protocol</a>
            <a href="#garden" className="hover:text-white transition-colors">Garden</a>
            <a href="#use-cases" className="hidden sm:inline hover:text-white transition-colors">Use cases</a>
            <a href="https://potbot-web.vercel.app" className="btn-primary py-2 px-5 text-sm">
              Launch a POT
            </a>
          </div>
        </nav>

        <div id="top" className="relative z-10 max-w-6xl w-full mx-auto flex-1 grid lg:grid-cols-[1.02fr_0.98fr] gap-12 items-center py-14 md:py-20">
          <div className="text-center lg:text-left">
            <div className="fade-in-delay-1 inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-200 mb-8">
              <span className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse" />
              AI-native infrastructure for Solana communities
            </div>

            <h1 className="fade-in-delay-2 text-5xl md:text-7xl font-black mb-6 leading-[0.95] tracking-[-0.05em] max-w-4xl mx-auto lg:mx-0">
              Tokenize Any Internet Community
            </h1>

            <p className="fade-in-delay-3 text-lg md:text-2xl text-gray-300 mb-10 max-w-[58ch] mx-auto lg:mx-0 leading-relaxed">
              Programmable onchain treasuries with AI coordination on Solana.
            </p>

            <div className="fade-in-delay-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a href="https://potbot-web.vercel.app" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto justify-center">
                Launch a POT
              </a>
              <a
                href="https://t.me/potbot_sol"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto justify-center"
              >
                Join Waitlist
              </a>
            </div>
          </div>

          <div className="fade-in-delay-4 relative flex justify-center lg:justify-end">
            <div className="levitating-pot" aria-hidden="true">
              <div className="pot-glow" />
              <div className="pot-emoji">🪴</div>
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding px-6 border-y border-white/10 bg-black/10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20 items-start">
          <div>
            <p className="section-kicker">Manifesto</p>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-0.04em] leading-tight max-w-[12ch]">
              The internet already coordinates capital.
            </h2>
          </div>
          <div className="space-y-10">
            <div className="manifesto-copy text-2xl md:text-4xl font-bold leading-tight text-gray-100">
              <p>Friends invest together.</p>
              <p>Communities speculate together.</p>
              <p>Creators build economies together.</p>
            </div>
            <p className="text-xl md:text-2xl text-gray-300 max-w-[42ch] leading-relaxed">
              But the infrastructure is still primitive.
            </p>
            <div className="glass p-6 md:p-8">
              <p className="text-lg text-gray-300 mb-6">PotBot gives every community:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {manifestoPoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 text-gray-100">
                    <span className="text-[#14F195]">✦</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="section-padding px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-12">
            <p className="section-kicker">Protocol in five seconds</p>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-0.04em] mb-5">From community energy to programmable capital.</h2>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-[64ch]">
              POT means Programmable On-chain Treasury. BOT means Blockchain Orchestration Tool. Together, they turn social coordination into a transparent Solana-native vault.
            </p>
          </div>

          <div className="architecture-flow glass p-5 md:p-8">
            {architecture.map((item, index) => (
              <div key={item} className="flow-group">
                <div className="flow-node">
                  <span className="text-xs text-gray-500">0{index + 1}</span>
                  <strong>{item}</strong>
                </div>
                {index < architecture.length - 1 ? <div className="flow-arrow">→</div> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding px-6 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          <div>
            <p className="section-kicker">Governance</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.04em] mb-5">Governance should match the community.</h2>
            <p className="text-lg text-gray-300 leading-relaxed max-w-[58ch]">
              Start simple. Mature when the treasury, membership, and decision quality need more decentralization.
            </p>
          </div>
          <div className="governance-spectrum glass p-5 md:p-6">
            {governanceModes.map((mode, index) => (
              <article key={mode.title} className="spectrum-card">
                <div className="spectrum-dot">{index + 1}</div>
                <h3>{mode.title}</h3>
                <p>{mode.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch">
          <article className="glass p-8 md:p-10 spotlight-card">
            <p className="section-kicker">AI coordination</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.04em] mb-5">BOT = AI orchestration layer</h2>
            <p className="text-lg text-gray-300 leading-relaxed max-w-[60ch] mb-8">
              The bot translates vault activity into readable next actions. It helps communities move from noisy chat to structured governance.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {botActions.map((action) => (
                <div key={action} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-gray-200">
                  {action}
                </div>
              ))}
            </div>
          </article>

          <article className="glass p-8 md:p-10">
            <p className="section-kicker">Readable trust</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.04em] mb-5">Protocol-grade without the cognitive overload.</h2>
            <p className="text-lg text-gray-300 leading-relaxed max-w-[58ch] mb-8">
              PotBot keeps advanced rails available, but the main page explains the outcome first: ownership, coordination, and execution.
            </p>
            <ul className="space-y-3 text-gray-200">
              {trustItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#14F195] mt-1">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="garden" className="section-padding px-6 border-y border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(20,241,149,0.10),transparent_45%)]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="section-kicker justify-center">Garden Mode</p>
          <h2 className="text-4xl md:text-6xl font-black tracking-[-0.04em] mb-5">Duolingo streaks for finance.</h2>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-[68ch] mx-auto mb-12">
            Activity grows the POT. Participation unlocks evolution. Communities get identity, social flex, and a living signal of momentum.
          </p>
          <div className="garden-evolution glass p-5 md:p-8 mb-10">
            {gardenStages.map((stage, index) => (
              <div key={stage} className="garden-step">
                <span>{stage}</span>
                {index < gardenStages.length - 1 ? <i /> : null}
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-left">
            {['Contribute capital or ideas.', 'Vote, execute, and return.', 'Watch the community identity evolve.'].map((item) => (
              <div key={item} className="glass p-5 text-lg text-gray-200">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="section-padding px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="section-kicker">Use cases</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-[-0.04em]">What can a POT become?</h2>
            </div>
            <p className="text-lg text-gray-300 leading-relaxed max-w-[44ch]">
              One primitive. Many internet-native community economies.
            </p>
          </div>

          <div className="use-case-grid">
            {useCases.map((useCase) => (
              <article key={useCase.title} className="use-case-card glass">
                <div className="text-4xl mb-5">{useCase.icon}</div>
                <h3>{useCase.title}</h3>
                <p>{useCase.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto glass p-8 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 hero-shimmer opacity-30" />
          <div className="relative z-10">
            <div className="text-5xl mb-6">🪴</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-0.04em] mb-5">Tokenize your community.</h2>
            <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-10 max-w-[58ch] mx-auto">
              Reserve a POT for the creator, group chat, DAO, club, or agent network you already coordinate with.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://potbot-web.vercel.app" className="btn-primary text-lg px-10 py-4 w-full sm:w-auto justify-center">
                Launch Your POT
              </a>
              <a
                href="https://t.me/potbot_sol"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-lg px-10 py-4 w-full sm:w-auto justify-center"
              >
                Reserve Your POT
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🪴</span>
            <span className="gradient-text">PotBot</span>
            <span className="text-gray-500 ml-2 text-sm font-normal">Solana Frontier 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://t.me/potbot_sol" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Telegram</a>
            <a href="https://twitter.com/potbot_sol" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Twitter</a>
            <a href="https://github.com/YD811/potbot-v2/blob/main/docs/architecture/architecture.md" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Docs</a>
          </div>
          <div className="text-xs text-gray-500">Built with love on Solana</div>
        </div>
      </footer>
    </main>
  )
}
