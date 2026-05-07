const highlights = [
  { value: '60+', label: 'MCP actions for LLMs' },
  { value: '5', label: 'PotPet growth stages' },
  { value: 'May 11', label: 'Frontier deadline' },
  { value: 'Devnet', label: 'Anchor program live' },
]

const stack = [
  'Anchor 0.30',
  'Rust',
  'Next.js 14',
  'TanStack Query',
  'Zustand',
  'Jupiter API v6',
  'Cloudflare Pages + KV',
  'Telegram Bot API',
  'PrivacyCash ZK',
]

const features = [
  {
    icon: '💬',
    title: 'Telegram-native pots',
    desc: 'Groups create a shared vault, coordinate liquidity, and keep governance where the conversation already happens: Telegram.',
    tags: ['Group vaults', 'Shared liquidity', 'Chat-native UX'],
  },
  {
    icon: '🔁',
    title: 'Jupiter swap governance',
    desc: 'Members turn swap ideas into proposals, vote with transparent rules, and execute approved trades on-chain through the Anchor program.',
    tags: ['Jupiter v6', 'Swap proposals', 'On-chain execution'],
  },
  {
    icon: '🤖',
    title: 'MCP-native AI agent',
    desc: 'Any LLM can access 60+ on-chain PotBot actions through MCP, making PotBot the first Solana ecosystem interface built for AI-native group treasuries.',
    tags: ['MCP', 'LLM-ready', 'Agent actions'],
  },
  {
    icon: '🛡️',
    title: 'Optional Squads v4 multisig',
    desc: 'Teams can add Squads v4 as an extra withdrawal-control layer without compromising PotBot’s vote-driven product flow.',
    tags: ['Multisig', 'Withdrawal safety', 'Treasury ops'],
  },
  {
    icon: '🪴',
    title: 'PotPet / Money Tree',
    desc: 'An animated SVG companion grows from Seed to Tree as the group earns season score, turning treasury activity into a visible social loop.',
    tags: ['SVG animation', 'Season score', 'Seed → Tree'],
  },
  {
    icon: '🏆',
    title: 'Season prize layer',
    desc: 'Leaderboards, dashboards, tutorials, and seasonal competitions turn group treasury management into a product people return to.',
    tags: ['Prize pool', 'Leaderboard', 'Onboarding'],
  },
]

const roadmap = [
  { label: 'Anchor program deployed on devnet', status: 'Done' },
  { label: 'Phases 1–4 merged: UI backbone, season layer, token layer, polish + OG metadata', status: 'Done' },
  { label: 'Squads v4 multisig integration merged to main', status: 'Done' },
  { label: 'PR #32 Privy auth: email and social login awaiting Vercel env vars', status: 'In review' },
  { label: 'Mainnet cut planned around May 7–8, 2026', status: 'Next' },
  { label: 'ZK privacy layer STAMPPOT with PrivacyCash proofs', status: 'Building' },
]

const links = [
  { label: 'Open App', href: 'https://potbot.fun' },
  { label: 'GitHub', href: 'https://github.com/YD811/potbot-v2' },
  { label: 'Telegram Bot', href: 'https://t.me/Trade_pot_bot' },
  { label: 'Twitter', href: 'https://twitter.com/PotBot_sol' },
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
            <span className="gradient-text">PotBot v2</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-gray-300">
            <a href="#protocol" className="hover:text-white transition-colors">Protocol</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#status" className="hover:text-white transition-colors">Status</a>
            <a href="https://potbot.fun" className="btn-primary py-2 px-5 text-sm">Launch App →</a>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl w-full mx-auto mt-8 md:mt-16 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <div className="fade-in-delay-1 inline-flex items-center gap-2 bg-white/6 border border-green-400/30 rounded-full px-4 py-2 text-sm text-green-100 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Featured Y-DAO Project · Solana Frontier 2026
            </div>

            <h1 className="fade-in-delay-2 text-5xl md:text-7xl font-black mb-6 leading-tight max-w-4xl">
              Group treasuries on Solana.
              <br />
              <span className="gradient-text">Managed by AI, governed by members.</span>
            </h1>

            <p className="fade-in-delay-3 text-lg md:text-2xl text-gray-300 mb-8 max-w-3xl">
              PotBot is the first Telegram-native protocol for collective treasury management on Solana. A group creates a shared vault, votes on swap proposals, and executes decisions on-chain through an Anchor program.
            </p>

            <blockquote className="fade-in-delay-3 glass p-5 mb-10 border-green-400/30 text-xl md:text-2xl font-semibold leading-snug">
              “The first protocol where Claude manages a group treasury on Solana via MCP. AI proposes. Members vote. Program executes. No trust — only code.”
            </blockquote>

            <div className="fade-in-delay-4 flex flex-wrap items-center gap-4">
              <a href="https://potbot.fun" className="btn-primary text-lg px-8 py-4">🌐 Open PotBot</a>
              <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="btn-secondary text-lg px-8 py-4">View GitHub</a>
            </div>
          </div>

          <article className="fade-in-delay-4 glass p-8 spotlight-card">
            <div className="text-xs uppercase tracking-[0.3em] text-green-300 mb-5">Project card</div>
            <h2 className="text-4xl font-black mb-3">PotBot v2</h2>
            <p className="text-gray-300 text-lg mb-6">AI-assisted group DeFi for Telegram communities: propose, vote, execute, and grow a shared Money Tree together.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {highlights.map((stat) => (
                <div key={stat.label} className="surface-card p-4">
                  <div className="text-2xl font-black gradient-text">{stat.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="surface-card surface-card-accent p-4 text-sm text-green-100 break-all">
              <div className="font-bold mb-1">Devnet Program ID</div>
              GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK
            </div>
          </article>
        </div>
      </section>

      <section id="protocol" className="border-y border-white/10 bg-white/[0.02] py-10 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5 text-center">
          {['AI proposes through MCP', 'Members vote in Telegram', 'Anchor program executes on-chain'].map((item) => (
            <div key={item} className="glass p-5 text-lg font-bold">{item}</div>
          ))}
        </div>
      </section>

      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-sm uppercase tracking-[0.3em] text-green-300 mb-4">What is implemented</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">A complete group-treasury product loop</h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              PotBot combines Telegram onboarding, on-chain Solana governance, AI-native operations, seasonal engagement, and tokenization into one protocol surface.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, index) => (
              <article key={f.title} className="glass feature-card p-6" style={{ animationDelay: `${index * 0.08}s` }}>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10">{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="status" className="py-28 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
          <div>
            <div className="text-sm uppercase tracking-[0.3em] text-green-300 mb-4">May 2026 status</div>
            <h2 className="text-4xl md:text-5xl font-black mb-5">Built for the Solana Frontier deadline</h2>
            <p className="text-gray-300 text-lg mb-8">
              The devnet program is live, the product backbone is merged, Squads v4 support is in main, and the mainnet cut is planned around May 7–8 before the May 11, 2026 hackathon deadline.
            </p>
            <div className="glass p-5">
              <div className="font-bold mb-3">Pot tokenization flywheel</div>
              <p className="text-sm text-gray-300">bags.fm integration tokenizes each pot and creates a $POT buyback flywheel around active group treasuries.</p>
            </div>
          </div>

          <div className="space-y-4">
            {roadmap.map((item) => (
              <article key={item.label} className="glass p-5 flex gap-4 items-start">
                <div className="rounded-full bg-green-400/15 border border-green-400/30 px-3 py-1 text-xs font-bold text-green-200 min-w-20 text-center">{item.status}</div>
                <p className="text-gray-200">{item.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          <article className="glass p-8">
            <h2 className="text-3xl font-black mb-5">Stack</h2>
            <div className="flex flex-wrap gap-3">
              {stack.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200">{item}</span>
              ))}
            </div>
          </article>

          <article className="glass p-8 spotlight-card">
            <h2 className="text-3xl font-black mb-5">Featured project links</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="btn-secondary justify-center px-5 py-3">{link.label}</a>
              ))}
            </div>
          </article>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🪴</span>
            <span className="gradient-text">PotBot v2</span>
            <span className="text-gray-500 ml-2 text-sm font-normal">Featured by Y-DAO</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="https://potbot.fun" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">App</a>
            <a href="https://github.com/YD811/potbot-v2" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://t.me/Trade_pot_bot" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Bot</a>
            <a href="https://twitter.com/PotBot_sol" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
