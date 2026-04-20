import Link from 'next/link'
import SignupForm from '@/components/SignupForm'

export const metadata = {
  title: 'Early Access — PotBot',
  description:
    'Sign up for PotBot mainnet early access. Founding members get lower fees, NFT badge, and priority on Strategy Vaults.',
}

const PERKS = [
  { icon: '🪴', title: 'Lower swap fees', desc: 'Founding members unlock the lowest tier fees for life.' },
  { icon: '🐾', title: 'Tamagotchi NFT badge', desc: 'Claim the exclusive founding-member NFT once mainnet ships.' },
  { icon: '⚡', title: 'Priority Strategy Vaults', desc: 'First access to creator-led Strategy Vaults before the public drop.' },
]

export default function SignupPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <section className="relative pt-16 pb-8 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-pot-green/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[200px] bg-pot-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <Link
            href="/"
            className="text-xs text-pot-muted hover:text-white transition inline-flex items-center gap-1 mb-6"
          >
            ← Back to home
          </Link>

          <div className="inline-flex items-center gap-2 bg-pot-card border border-pot-border rounded-full px-4 py-1.5 text-xs text-pot-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-pot-accent animate-pulse inline-block" />
            Mainnet launching soon
          </div>

          <div className="text-6xl mb-4 animate-float">🪴</div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-3">
            Get early access to <span className="text-pot-green">PotBot</span>
          </h1>

          <p className="text-lg text-pot-muted max-w-lg mx-auto">
            Tell us how to reach you. We'll email updates as mainnet approaches, and founding members
            unlock exclusive perks.
          </p>
        </div>
      </section>

      {/* Two-column layout: perks + form */}
      <section className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Perks */}
        <aside className="lg:col-span-2 space-y-4 lg:pt-6">
          <div className="text-xs font-bold tracking-wider text-pot-green uppercase mb-3">
            What founding members get
          </div>
          {PERKS.map((p) => (
            <div
              key={p.title}
              className="card p-5 hover:border-pot-green/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{p.icon}</div>
                <div>
                  <h3 className="font-bold text-white mb-1">{p.title}</h3>
                  <p className="text-sm text-pot-muted leading-relaxed">{p.desc}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="text-xs text-pot-muted/70 pt-2">
            Prefer Twitter? Follow{' '}
            <a
              href="https://x.com/PotBot_sol"
              target="_blank"
              rel="noreferrer"
              className="text-pot-accent hover:underline"
            >
              @PotBot_sol
            </a>{' '}
            for launch news.
          </div>
        </aside>

        {/* Form */}
        <div className="lg:col-span-3">
          <div className="card p-6 sm:p-8">
            <SignupForm />
          </div>
        </div>
      </section>
    </div>
  )
}
