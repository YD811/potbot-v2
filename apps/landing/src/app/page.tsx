const stats = [
  { value: '42+', label: 'Active groups' },
  { value: '175+ SOL', label: 'Collective capital' },
  { value: '< 2 min', label: 'Time to launch a vault' },
  { value: '24/7', label: 'On-chain transparency' },
]

const audienceTracks = [
  {
    title: 'New to crypto',
    badge: 'Beginner path',
    desc: 'Clear setup wizard, plain-language voting, and guided prompts so friends can start safely without DeFi jargon.',
    points: ['Simple deposit flow', 'Readable proposal summaries', 'Built-in voting reminders'],
  },
  {
    title: 'For active traders',
    badge: 'Pro controls',
    desc: 'Advanced governance modes, detailed swap parameters, and predictable execution rules for serious communities.',
    points: ['Configurable quorum & execution', 'Jupiter routing + slippage control', 'Auditable proposal lifecycle'],
  },
]

const features = [
  {
    icon: '🧺',
    title: 'Shared Vault, personal ownership',
    desc: 'Everyone contributes to one strategy vault, but each member keeps a proportional claim that can be withdrawn transparently.',
    tags: ['Non-custodial', 'Share-based accounting', 'On-chain balance'],
  },
  {
    icon: '✅',
    title: 'Voting that feels familiar',
    desc: 'Turn trade ideas into proposals that look like clear checklists. Members vote by stake, and approved decisions execute automatically.',
    tags: ['Clear decision flow', 'Auto execution', 'Quorum rules'],
  },
  {
    icon: '⚙️',
    title: 'Professional trade execution',
    desc: 'Use Jupiter aggregation for route discovery and define slippage guardrails before execution for predictable risk management.',
    tags: ['Best-route quotes', 'Slippage guardrails', 'Atomic execution'],
  },
  {
    icon: '💬',
    title: 'Operate from Telegram',
    desc: 'Teams can create vaults, review proposals, and vote directly in chat, while the web app remains the full command center.',
    tags: ['Chat-native UX', 'Instant alerts', 'Web + bot parity'],
  },
  {
    icon: '🪴',
    title: 'Progress system that keeps teams engaged',
    desc: 'Your vault companion evolves with activity, giving social groups a fun feedback loop without blocking serious workflows.',
    tags: ['XP milestones', '6 growth stages', 'Community retention'],
  },
  {
    icon: '🔎',
    title: 'Transparency and trust by design',
    desc: 'From deposits to execution, every key action is visible and verifiable so both newcomers and power users understand what happened.',
    tags: ['Event history', 'Accountability', 'Team confidence'],
  },
]

const steps = [
  {
    n: '01',
    title: 'Create a vault in plain language',
    desc: 'Name the group, choose a governance profile, and set basic safety defaults. Your team can start with simple settings and upgrade later.',
  },
  {
    n: '02',
    title: 'Invite members and fund the strategy',
    desc: 'Share an invite link in chat. Members deposit and instantly see ownership share and available balance in one place.',
  },
  {
    n: '03',
    title: 'Propose a trade with clear context',
    desc: 'Draft the swap, include reason + amount, and let the group review the plan with transparent execution parameters.',
  },
  {
    n: '04',
    title: 'Vote, execute, and track outcomes',
    desc: 'Once a proposal passes quorum, execution happens automatically. Everyone can review what was approved and how it performed.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen grid-bg overflow-hidden">
      <section className="relative min-h-screen flex flex-col px-6">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <nav className="relative z-20 max-w-6xl w-full mx-auto py-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🪴</span>
            <span className="gradient-text">PotBot</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Product</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#trust" className="hover:text-white transition-colors">Trust</a>
            <a href="https://potbot-web.vercel.app" className="btn-primary py-2 px-5 text-sm">
              Launch App →
            </a>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl w-full mx-auto mt-8 md:mt-16 text-center md:text-left">
          <div className="fade-in-delay-1 inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-200 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Welcoming for first-time users, powerful for trading communities
          </div>

          <h1 className="fade-in-delay-2 text-5xl md:text-7xl font-black mb-6 leading-tight max-w-4xl">
            Trade together.
            <br />
            <span className="gradient-text">Without chaos.</span>
          </h1>

          <p className="fade-in-delay-3 text-lg md:text-2xl text-gray-300 mb-10 max-w-3xl">
            PotBot helps groups pool capital, vote on decisions, and execute strategies transparently on Solana — with an interface that feels friendly, not intimidating.
          </p>

          <div className="fade-in-delay-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
            <a href="https://potbot-web.vercel.app" className="btn-primary text-lg px-8 py-4">
              🚀 Start your first vault
            </a>
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-lg px-8 py-4"
            >
              View architecture
            </a>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl w-full mx-auto mt-12 mb-16 grid md:grid-cols-2 gap-5">
          {audienceTracks.map((track) => (
            <article key={track.title} className="glass audience-card p-6">
              <div className="text-xs uppercase tracking-wide text-green-300 mb-3">{track.badge}</div>
              <h2 className="text-2xl font-bold mb-3">{track.title}</h2>
              <p className="text-gray-300 mb-4">{track.desc}</p>
              <ul className="space-y-2 text-sm text-gray-200">
                {track.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">●</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-black gradient-text">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Product experience redesigned for clarity</h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              We shifted the message from “crypto complexity” to “team decision quality”, while preserving deep controls for advanced operators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, index) => (
              <article
                key={f.title}
                className="glass feature-card p-6"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-28 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">How it works</h2>
            <p className="text-gray-300 text-lg">Simple onboarding for new members, deterministic workflow for professionals.</p>
          </div>

          <div className="space-y-6">
            {steps.map((step) => (
              <article key={step.n} className="flex gap-5 items-start glass p-6 step-card">
                <div className="step-num">{step.n}</div>
                <div>
                  <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch">
          <article className="glass p-8 spotlight-card">
            <h2 className="text-3xl font-black mb-4">UX trust upgrades</h2>
            <p className="text-gray-300 mb-6">
              The interface now emphasizes understandable decisions first: who proposed, what changes, what risk limits apply, and when execution triggers.
            </p>
            <ul className="space-y-3 text-sm text-gray-200">
              <li>• Use everyday language before technical terms.</li>
              <li>• Surface key safety settings in one line.</li>
              <li>• Keep Telegram and web actions consistent.</li>
              <li>• Maintain full auditability for every critical action.</li>
            </ul>
          </article>

          <article className="glass p-8">
            <h2 className="text-3xl font-black mb-4">For professional operators</h2>
            <p className="text-gray-300 mb-6">
              Advanced groups still get precise execution controls, governance flexibility, and transparent accountability across each proposal lifecycle.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {['Governance profiles', 'Execution threshold', 'Quorum visibility', 'Swap parameter clarity', 'Proposal status timeline', 'Role accountability'].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-200">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto glass p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 hero-shimmer opacity-30" />
          <div className="relative z-10">
            <div className="text-5xl mb-6">🪴</div>
            <h2 className="text-4xl font-black mb-4">Build a smarter group trading workflow</h2>
            <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
              Friendly onboarding for new members. Reliable governance and execution for experienced traders.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="https://potbot-web.vercel.app" className="btn-primary text-lg px-10 py-4">
                Open PotBot App
              </a>
              <a
                href="https://t.me/potbot_sol"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-lg px-10 py-4"
              >
                Join Telegram
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
