'use client'

import Link from 'next/link'

const TOOLS = [
  {
    name: 'list_vaults',
    desc: 'List all PotBot Strategy Vaults with performance metrics',
    returns: 'vaults[] with TVL, PnL, APY, members, win rate',
  },
  {
    name: 'get_vault_analytics',
    desc: 'Get NAV, PnL, APY, and positions for a vault',
    returns: 'nav_usd, nav_sol, pnl_pct, apy_pct, win_rate, sharpe, members, trades',
  },
  {
    name: 'get_token_prices',
    desc: 'Current prices via Jupiter Price API v2',
    returns: 'price_usd per token (with mint + source)',
  },
  {
    name: 'create_swap_proposal',
    desc: 'Draft a token-swap governance proposal in a vault',
    returns: 'draft proposal + dApp signing link',
  },
  {
    name: 'vote_on_proposal',
    desc: 'Vote YES or NO on a governance proposal',
    returns: 'vote payload + dApp signing link',
  },
  {
    name: 'join_strategy_vault',
    desc: 'Join a strategy vault (returns entry-fee details and dApp link)',
    returns: 'entry fee, strategy, current members, vault URL',
  },
  {
    name: 'get_yield_rates',
    desc: 'Current DeFi yield rates: Kamino, Marginfi, Drift, Jito',
    returns: 'protocol, APY range, TVL, asset, risk for each opportunity',
  },
  {
    name: 'get_leaderboard',
    desc: 'Top performing vaults ranked by a chosen metric',
    returns: 'ranked vaults[] with rank + all performance fields',
  },
  {
    name: 'get_agent_rules',
    desc: 'Inspect AI automation rules for a vault',
    returns: 'rules array with triggers, actions, cooldowns',
  },
]

const EXAMPLE_RULE = `{
  "id": "rule-1",
  "name": "Buy SOL dip",
  "enabled": true,
  "trigger": {
    "type": "price_below",
    "threshold": 120,
    "token": "So11111111111111111111111111111111111111112"
  },
  "action": {
    "type": "propose_swap",
    "amount": 500,
    "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "toToken": "So11111111111111111111111111111111111111112"
  },
  "cooldownMinutes": 240
}`

const CLAUDE_CONFIG = `{
  "mcpServers": {
    "potbot": {
      "command": "npx",
      "args": ["-y", "@potbot/mcp"],
      "env": {
        "POTBOT_API_URL": "https://app.potbot.fun",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}`

const CARD = 'bg-pot-card border border-pot-border rounded-2xl p-4 sm:p-5'

export default function ForAgentsPage() {
  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 text-xs text-pot-muted">
        <Link href="/" className="hover:text-white transition">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-white font-semibold">For AI Agents</span>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8 pb-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-3xl sm:text-4xl">🤖</span>
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-md bg-pot-green/15 border border-pot-green/30 text-pot-green uppercase">
            MCP native
          </span>
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-md bg-pot-accent/15 border border-pot-accent/30 text-pot-accent uppercase">
            x402 ready
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-tight">
          PotBot for AI Agents
        </h1>
        <p className="text-sm sm:text-lg text-pot-muted max-w-2xl">
          PotBot exposes its entire vault infrastructure as an MCP server. Any AI agent — Claude, GPT, custom — can list vaults, analyze performance, create governance proposals, and configure automation + delegated voting rules.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://www.npmjs.com/package/@potbot/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm transition"
          >
            📦 @potbot/mcp on npm
          </a>
          <a
            href="https://github.com/YD811/potbot-v2/tree/main/apps/potbot-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold text-sm transition"
          >
            View source →
          </a>
          <Link
            href="/vaults"
            className="px-4 py-2 rounded-xl bg-pot-card border border-pot-border hover:border-pot-accent/40 text-white font-bold text-sm transition"
          >
            Explore Vaults
          </Link>
        </div>
      </section>

      {/* Release banner */}
      <section className="max-w-5xl mx-auto px-3 sm:px-6 pb-8">
        <div className={`${CARD} border-pot-green/30`}>
          <p className="text-xs font-mono mb-2 text-pot-green">Release update</p>
          <p className="text-sm text-white mb-3 break-words">
            <code className="text-pot-accent">@potbot/mcp@0.2.0</code> is live on npm with HTTP+SSE+x402 transport, including two binaries: <code className="text-pot-accent">potbot-mcp</code> (stdio) and <code className="text-pot-accent">potbot-mcp-http</code> (HTTP).
          </p>
          <ul className="text-xs space-y-1 text-pot-muted">
            <li>• Tag <code className="text-pot-green">mcp-v0.2.0</code> published via CI.</li>
            <li>• npm latest now points to <code className="text-pot-green">0.2.0</code>.</li>
            <li>• Package size: 11.5 kB → 81.2 kB (new <code className="text-pot-green">http.ts</code> module).</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a href="https://www.npmjs.com/package/@potbot/mcp" target="_blank" rel="noopener noreferrer" className="text-pot-green hover:underline">npm package ↗</a>
            <a href="https://github.com/YD811/potbot-v2/releases/tag/mcp-v0.2.0" target="_blank" rel="noopener noreferrer" className="text-pot-green hover:underline">release tag ↗</a>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pb-16 space-y-12">

        {/* Quick Start */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-5">Quick start</h2>
          <div className="space-y-3">
            <div className={CARD}>
              <p className="text-xs font-mono mb-2 text-pot-green">1. Install the MCP server</p>
              <pre className="text-xs sm:text-sm font-mono p-3 rounded-lg bg-pot-dark border border-pot-border text-white whitespace-pre-wrap break-words overflow-x-auto">
{`npm install -g @potbot/mcp`}
              </pre>
            </div>
            <div className={CARD}>
              <p className="text-xs font-mono mb-2 text-pot-green">2. Add to claude_desktop_config.json</p>
              <pre className="text-xs sm:text-sm font-mono p-3 rounded-lg bg-pot-dark border border-pot-border text-white whitespace-pre-wrap break-words overflow-x-auto">
{CLAUDE_CONFIG}
              </pre>
            </div>
            <div className={CARD}>
              <p className="text-xs font-mono mb-2 text-pot-green">3. Ask Claude to interact with vaults</p>
              <div className="space-y-2">
                {[
                  'List all PotBot vaults and show their 30-day returns',
                  'Find the best SOL yield opportunities under low risk',
                  'Set up a DCA rule: buy 500 USDC worth of SOL every 24 hours',
                  'Create a proposal to swap 10% of the vault to JitoSOL for yield',
                ].map((prompt) => (
                  <div
                    key={prompt}
                    className="text-sm px-3 py-2 rounded-lg bg-pot-dark text-pot-muted italic break-words"
                  >
                    &ldquo;{prompt}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Available tools</h2>
          <p className="text-sm text-pot-muted mb-5">9 tools covering the full vault lifecycle</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TOOLS.map((tool) => (
              <div key={tool.name} className={CARD}>
                <code className="text-sm font-mono text-pot-accent break-all block mb-1.5">{tool.name}</code>
                <p className="text-sm text-white mb-2">{tool.desc}</p>
                <p className="text-xs text-pot-muted">
                  <span className="text-pot-muted/70 font-semibold">Returns:</span> {tool.returns}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Agent Rules */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">AI Agent automation</h2>
          <p className="text-sm text-pot-muted mb-5">
            Configure rules that run every 60 seconds. When a trigger fires, the agent creates and can vote on governance actions based on user preferences. Members vote manually by default, but users can enable delegated AI voting for predefined decision policies.
          </p>
          <div className={CARD}>
            <p className="text-xs font-mono mb-3 text-pot-green">Example — buy SOL when price drops</p>
            <pre className="text-xs sm:text-sm font-mono p-3 rounded-lg bg-pot-dark border border-pot-border text-white whitespace-pre-wrap break-words overflow-x-auto">
{EXAMPLE_RULE}
            </pre>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { trigger: 'price_below', label: 'Price alert', desc: 'Trigger when SOL/BTC/token hits a threshold' },
              { trigger: 'time_interval', label: 'DCA timer', desc: 'Buy on a fixed schedule (hourly, daily, weekly)' },
              { trigger: 'pnl_above', label: 'Take profit', desc: 'Propose sell when vault PnL reaches target' },
            ].map((item) => (
              <div key={item.trigger} className={CARD}>
                <p className="text-sm font-bold text-white mb-1">{item.label}</p>
                <p className="text-xs text-pot-muted mb-2">{item.desc}</p>
                <code className="text-xs text-pot-accent">{item.trigger}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Governance Safety */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Governance safety</h2>
          <p className="text-sm text-pot-muted mb-5">
            AI agents can act as delegates for governance voting when the user opts in. Users choose manual or delegated mode in bot settings, and all decisions remain transparent on-chain.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: '🤖', title: 'Agent proposes', desc: 'AI detects opportunity and creates on-chain proposal' },
              { icon: '🗳️', title: 'Vote mode', desc: 'Manual member voting or delegated AI voting based on user preference' },
              { icon: '⚡', title: 'Jupiter executes', desc: 'Passed proposals execute via Jupiter swap CPI' },
            ].map((step) => (
              <div key={step.title} className={`${CARD} text-center`}>
                <div className="text-3xl mb-3">{step.icon}</div>
                <p className="font-bold text-white mb-1">{step.title}</p>
                <p className="text-sm text-pot-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center py-4 sm:py-8">
          <p className="text-base sm:text-lg text-white mb-5">
            Ready to build AI-powered DeFi strategies?
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-pot-green hover:bg-pot-green/90 text-pot-dark font-bold text-sm transition"
            >
              GitHub repository
            </a>
            <Link
              href="/create"
              className="px-5 py-3 rounded-xl bg-pot-accent hover:bg-pot-accent/90 text-white font-bold text-sm transition"
            >
              Create a vault
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
