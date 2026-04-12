export default function Home() {
  return (
    <main className="min-h-screen grid-bg overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Animated blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-6 z-10">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🪴</span>
            <span className="gradient-text">PotBot</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://potbot-web.vercel.app"
              className="btn-primary py-2 px-5 text-sm"
            >
              Launch App →
            </a>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="fade-in-delay-1 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-300 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Built for Solana Frontier 2026 Hackathon
          </div>

          <h1 className="fade-in-delay-2 text-6xl md:text-8xl font-black mb-6 leading-tight">
            <span className="gradient-text">Group Trading</span>
            <br />
            <span className="text-white">Vaults on Solana</span>
          </h1>

          <p className="fade-in-delay-3 text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Pool funds, vote on trades, and watch your on-chain{' '}
            <span className="text-purple-400 font-semibold">Tamagotchi</span> evolve as your vault
            grows.
          </p>

          <div className="fade-in-delay-4 flex flex-wrap items-center justify-center gap-4">
            <a href="https://potbot-web.vercel.app" className="btn-primary text-lg px-8 py-4">
              🚀 Launch App
            </a>
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-lg px-8 py-4"
            >
              ⭐ View on GitHub
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500 text-xs">
          <span>scroll to explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-gray-500 to-transparent" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/10 bg-white/[0.02] py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '42+', label: 'POTs Created' },
            { value: '175+ SOL', label: 'Total Locked' },
            { value: '5 Levels', label: 'Governance' },
            { value: '6 Stages', label: 'Tamagotchi' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-black gradient-text">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Everything your group needs
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              A full DeFi stack for collective trading — no multisig spreadsheets, no trust required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🏦',
                title: 'Group Vaults',
                color: 'from-green-500/10 to-transparent',
                border: 'border-green-500/20',
                desc: 'Any group can create a shared on-chain vault. Deposit SOL or SPL tokens, track balances in real-time, and withdraw your proportional share anytime.',
                tags: ['On-chain custody', 'Share-weighted', 'Non-custodial'],
              },
              {
                icon: '🗳️',
                title: 'On-Chain Governance',
                color: 'from-purple-500/10 to-transparent',
                border: 'border-purple-500/20',
                desc: 'Five governance levels — from L0 Autocracy to L4 Consensus. Propose trades, vote with share weight, and auto-execute when quorum is reached.',
                tags: ['5 Gov Levels', 'Auto-execute', 'Proposal lifecycle'],
              },
              {
                icon: '🐣',
                title: 'Tamagotchi XP',
                color: 'from-blue-500/10 to-transparent',
                border: 'border-blue-500/20',
                desc: 'Your vault has a soul. Every deposit, trade, and vote earns XP. Watch your Tamagotchi grow through 6 stages — from Egg to Legend.',
                tags: ['6 Stages', 'Volume XP', 'Governance XP'],
              },
              {
                icon: '⚡',
                title: 'Jupiter Swaps',
                color: 'from-yellow-500/10 to-transparent',
                border: 'border-yellow-500/20',
                desc: 'Execute any SPL token swap via Jupiter aggregator with best-route pricing. Proposals carry exact swap params that execute atomically on approval.',
                tags: ['Best routes', 'Slippage control', 'Price feeds'],
              },
              {
                icon: '🤖',
                title: 'Telegram Bot',
                color: 'from-cyan-500/10 to-transparent',
                border: 'border-cyan-500/20',
                desc: 'Manage your POT from Telegram. Create pots, propose trades, vote, and get instant notifications — all without leaving your group chat.',
                tags: ['grammY bot', 'Inline keyboards', 'Real-time alerts'],
              },
              {
                icon: '🌐',
                title: 'DApp Interface',
                color: 'from-pink-500/10 to-transparent',
                border: 'border-pink-500/20',
                desc: 'Full-featured Next.js dashboard. Connect any Solana wallet, view all POTs, manage proposals, and track your Tamagotchi evolution live.',
                tags: ['Next.js 14', 'Wallet Adapter', 'React Query'],
              },
            ].map((f) => (
              <div
                key={f.title}
                className={`glass p-6 bg-gradient-to-br ${f.color} border ${f.border} transition-all duration-300 hover:-translate-y-1`}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 px-6 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 text-lg">
              From idea to trade in minutes — fully on-chain.
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                n: '01',
                title: 'Create a POT',
                desc: 'Any wallet can create a group vault. Set the name, governance level (L0–L4), trade fee, and minimum deposit. Your Tamagotchi hatches as an Egg.',
              },
              {
                n: '02',
                title: 'Members Join & Deposit',
                desc: 'Share the invite. Each member deposits SOL and receives proportional shares. The vault balance grows on-chain — fully transparent, non-custodial.',
              },
              {
                n: '03',
                title: 'Propose a Trade',
                desc: 'Any member proposes a swap (e.g. buy 10 SOL of BONK via Jupiter). The proposal goes live for members to vote on with their share weight.',
              },
              {
                n: '04',
                title: 'Vote & Auto-Execute',
                desc: 'Once quorum threshold is reached, the swap executes atomically via CPI to Jupiter. No one holds the keys — the program is the vault.',
              },
              {
                n: '05',
                title: 'Tamagotchi Evolves',
                desc: 'Every action earns XP: deposits, trades, votes. Watch your vault creature grow from Egg → Seedling → Sprout → Plant → Bloom → Legend.',
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className="flex gap-6 items-start glass p-6 hover:-translate-y-0.5 transition-transform duration-200"
              >
                <div className="step-num">{step.n}</div>
                <div>
                  <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tamagotchi evolution showcase */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Your Vault Has a <span className="gradient-text">Soul</span>
          </h2>
          <p className="text-gray-400 text-lg mb-16 max-w-xl mx-auto">
            6 evolution stages, unlocked by XP from deposits, governance, and trading activity.
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { emoji: '🥚', stage: 'Egg', xp: '0 XP' },
              { emoji: '🌱', stage: 'Seedling', xp: '100 XP' },
              { emoji: '🌿', stage: 'Sprout', xp: '500 XP' },
              { emoji: '🪴', stage: 'Plant', xp: '2k XP' },
              { emoji: '🌸', stage: 'Bloom', xp: '10k XP' },
              { emoji: '🌳', stage: 'Legend', xp: '50k XP' },
            ].map((t, i) => (
              <div
                key={t.stage}
                className={`glass p-4 text-center tamagotchi-glow transition-all duration-300 hover:scale-105 ${
                  i === 3 ? 'border-green-500/40 bg-green-500/5' : ''
                }`}
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <div className="text-3xl mb-2">{t.emoji}</div>
                <div className="text-sm font-bold text-white">{t.stage}</div>
                <div className="text-xs text-gray-500 mt-1">{t.xp}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto glass p-16 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,255,136,0.15) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10">
            <div className="text-5xl mb-6">🪴</div>
            <h2 className="text-4xl font-black mb-4">Ready to trade together?</h2>
            <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
              Create your first POT in under 2 minutes. No KYC, no custodians — just you and your
              group on Solana.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="https://potbot-web.vercel.app" className="btn-primary text-lg px-10 py-4">
                🚀 Launch App
              </a>
              <a
                href="https://t.me/potbot_sol"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-lg px-10 py-4"
              >
                💬 Telegram Bot
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🪴</span>
            <span className="gradient-text">PotBot</span>
            <span className="text-gray-600 ml-2 text-sm font-normal">
              Solana Frontier 2026
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://t.me/potbot_sol"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Telegram
            </a>
            <a
              href="https://twitter.com/potbot_sol"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://github.com/YD811/potbot-v2/blob/main/docs/ARCHITECTURE.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Docs
            </a>
          </div>
          <div className="text-xs text-gray-600">
            Built with love on Solana
          </div>
        </div>
      </footer>
    </main>
  )
}
