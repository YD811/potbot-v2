'use client'

import Link from 'next/link'

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-pot-dark text-white">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-6xl mb-6 animate-float">🪴</div>
        <h1 className="text-5xl sm:text-6xl font-bold mb-4">
          PotBot v2 Beta
        </h1>
        <p className="text-2xl text-pot-green mb-2 font-semibold">
          Group Trading Vaults on Solana
        </p>
        <p className="text-pot-muted text-lg max-w-2xl mb-8">
          Trade together, govern together. Be one of the first to test group vaults on Solana.
        </p>
      </div>

      {/* Join Beta Section */}
      <div className="max-w-4xl mx-auto px-4 mb-16">
        <div className="card p-8 mb-12 border border-pot-green/20 glow-green">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-pot-green mb-4">Join the Beta</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-pot-green font-bold text-xl">📡</span>
                  <div>
                    <p className="font-semibold text-white">Network: Devnet</p>
                    <p className="text-pot-muted text-sm">Safe testing environment with free SOL</p>
                  </div>
                </div>
                <p className="text-pot-muted text-base leading-relaxed">
                  Test group vaults, governance mechanics, and AI agent features risk-free on Devnet.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="w-full px-6 py-4 bg-pot-green text-black font-bold rounded-xl text-center hover:bg-pot-green/90 transition-all text-lg glow-green"
              >
                Launch App
              </Link>
              <a
                href="https://faucet.solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-3 bg-pot-accent/20 text-pot-accent border border-pot-accent/50 font-semibold rounded-xl text-center hover:bg-pot-accent/30 transition-all"
              >
                Get Devnet SOL
              </a>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Core Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6 text-center border border-pot-border hover:border-pot-green/30 transition-all">
              <div className="text-5xl mb-4">🏦</div>
              <h3 className="text-xl font-semibold text-white mb-2">Group Vaults</h3>
              <p className="text-pot-muted text-sm">
                Pool SOL with your group or community into shared trading vaults
              </p>
            </div>
            <div className="card p-6 text-center border border-pot-border hover:border-pot-accent/30 transition-all">
              <div className="text-5xl mb-4">🗳️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Governance</h3>
              <p className="text-pot-muted text-sm">
                Vote on trades with share-weighted governance and democratic decision-making
              </p>
            </div>
            <div className="card p-6 text-center border border-pot-border hover:border-pot-green/30 transition-all">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Agent</h3>
              <p className="text-pot-muted text-sm">
                Get AI-powered trade suggestions and vault management recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Beta Program Steps */}
        <div className="card p-8 border border-pot-accent/20">
          <h2 className="text-3xl font-bold mb-6">🚀 Beta Program Steps</h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pot-green text-black font-bold flex items-center justify-center">1</span>
              <div>
                <p className="font-semibold text-white">Connect Phantom Wallet (Devnet mode)</p>
                <p className="text-pot-muted text-sm">Install Phantom and switch to Devnet network</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pot-green text-black font-bold flex items-center justify-center">2</span>
              <div>
                <p className="font-semibold text-white">Get Free Devnet SOL</p>
                <p className="text-pot-muted text-sm">Visit <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-pot-green hover:underline">faucet.solana.com</a> to fund your test wallet</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pot-green text-black font-bold flex items-center justify-center">3</span>
              <div>
                <p className="font-semibold text-white">Create or Join a Vault</p>
                <p className="text-pot-muted text-sm">Start a new group vault or join an existing one with your crew</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pot-green text-black font-bold flex items-center justify-center">4</span>
              <div>
                <p className="font-semibold text-white">Make Proposals & Vote</p>
                <p className="text-pot-muted text-sm">Test governance by proposing trades and voting with other vault members</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pot-green text-black font-bold flex items-center justify-center">5</span>
              <div>
                <p className="font-semibold text-white">Report Bugs & Feedback</p>
                <p className="text-pot-muted text-sm">Share issues and feature requests on Telegram: <a href="https://t.me/YD811" target="_blank" rel="noopener noreferrer" className="text-pot-accent hover:underline">@YD811</a></p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-pot-border py-8 px-4 text-center text-pot-muted text-sm">
        <p>Test drive the future of group trading on Solana</p>
      </div>
    </div>
  )
}
