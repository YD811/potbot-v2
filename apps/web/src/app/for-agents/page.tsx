'use client'

import Link from 'next/link'

const TOOLS = [
  {
    name: 'list_vaults',
    desc: 'List all PotBot Strategy Vaults with performance metrics',
    example: '{ "sort": "pnl", "limit": 10, "strategy": "Trend" }',
    returns: 'vaults[] with TVL, PnL, APY, members, win rate',
  },
  {
    name: 'get_vault_analytics',
    desc: 'Get NAV, PnL, APY, and positions for a vault',
    example: '{ "vault_pubkey": "PotXALPHA..." }',
    returns: 'nav_usd, nav_sol, pnl_pct, apy_pct, win_rate, sharpe, members, trades',
  },
  {
    name: 'get_token_prices',
    desc: 'Current prices via Jupiter Price API v2',
    example: '{ "tokens": ["SOL", "USDC", "BONK"] }',
    returns: 'price_usd per token (with mint + source)',
  },
  {
    name: 'create_swap_proposal',
    desc: 'Draft a token-swap governance proposal in a vault',
    example: '{ "vault_pubkey": "PotXALPHA...", "from_token": "SOL", "to_token": "USDC", "amount_pct": 30, "reason": "Take profit" }',
    returns: 'draft proposal + dApp signing link',
  },
  {
    name: 'vote_on_proposal',
    desc: 'Vote YES or NO on a governance proposal',
    example: '{ "vault_pubkey": "PotXALPHA...", "proposal_id": 3, "approve": true }',
    returns: 'vote payload + dApp signing link',
  },
  {
    name: 'join_strategy_vault',
    desc: 'Join a strategy vault (returns entry-fee details and dApp link)',
    example: '{ "vault_pubkey": "PotXALPHA...", "user_wallet": "XYZ...", "referrer_wallet": "ABC..." }',
    returns: 'entry fee, strategy, current members, vault URL',
  },
  {
    name: 'get_yield_rates',
    desc: 'Current DeFi yield rates: Kamino, Marginfi, Drift, Jito',
    example: '{ "risk_level": "low" }',
    returns: 'protocol, APY range, TVL, asset, risk for each opportunity',
  },
  {
    name: 'get_leaderboard',
    desc: 'Top performing vaults ranked by a chosen metric',
    example: '{ "metric": "apy", "limit": 5 }',
    returns: 'ranked vaults[] with rank + all performance fields',
  },
  {
    name: 'get_agent_rules',
    desc: 'Inspect AI automation rules for a vault',
    example: '{ "vault_pubkey": "PotXALPHA..." }',
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

export default function ForAgentsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0D1117' }}>
      {/* Hero */}
      <div className="border-b" style={{ borderColor: '#1A2332' }}>
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🤖</span>
            <span
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: '#14F19522', color: '#14F195', border: '1px solid #14F19544' }}
            >
              MCP NATIVE
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            PotBot for AI Agents
          </h1>
          <p className="text-xl mb-8" style={{ color: '#9CA3AF' }}>
            PotBot exposes its entire vault infrastructure as an MCP server.
            Any AI agent — Claude, GPT, custom — can list vaults, analyze performance,
            create governance proposals, and configure automation rules.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/YD811/potbot-v2/tree/main/apps/potbot-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              View MCP Server Source →
            </a>
            <Link href="/vaults" className="btn-secondary">
              Explore Vaults
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

        {/* Quick Start */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Quick Start</h2>
          <div className="space-y-4">
            <div className="card">
              <p className="text-sm font-mono mb-2" style={{ color: '#14F195' }}>1. Install the MCP server</p>
              <pre className="text-sm overflow-x-auto" style={{ color: '#E5E7EB' }}>
                {'npm install -g @potbot/mcp'}
              </pre>
            </div>
            <div className="card">
              <p className="text-sm font-mono mb-2" style={{ color: '#14F195' }}>2. Add to claude_desktop_config.json</p>
              <pre className="text-sm overflow-x-auto" style={{ color: '#E5E7EB' }}>{CLAUDE_CONFIG}</pre>
            </div>
            <div className="card">
              <p className="text-sm font-mono mb-2" style={{ color: '#14F195' }}>3. Ask Claude to interact with vaults</p>
              <div className="space-y-2">
                {[
                  'List all PotBot vaults and show their 30-day returns',
                  'Find the best SOL yield opportunities under low risk',
                  'Set up a DCA rule: buy 500 USDC worth of SOL every 24 hours',
                  'Create a proposal to swap 10% of the vault to JitoSOL for yield',
                ].map(prompt => (
                  <div
                    key={prompt}
                    className="text-sm px-3 py-2 rounded"
                    style={{ background: '#111827', color: '#9CA3AF', fontStyle: 'italic' }}
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
          <h2 className="text-2xl font-bold text-white mb-2">Available Tools</h2>
          <p className="mb-6" style={{ color: '#6B7280' }}>
            9 tools covering the full vault lifecycle
          </p>
          <div className="space-y-3">
            {TOOLS.map(tool => (
              <div key={tool.name} className="card">
                <div className="flex items-start gap-4">
                  <code
                    className="text-sm font-mono shrink-0"
                    style={{ color: '#9945FF' }}
                  >
                    {tool.name}
                  </code>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white mb-1">{tool.desc}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      Returns: {tool.returns}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Agent Rules */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-2">AI Agent Automation</h2>
          <p className="mb-6" style={{ color: '#6B7280' }}>
            Configure rules that run every 60 seconds. When a trigger fires, the agent
            automatically creates an on-chain governance proposal — humans still vote before execution.
          </p>
          <div className="card">
            <p className="text-sm font-mono mb-3" style={{ color: '#14F195' }}>Example: Buy SOL when price drops</p>
            <pre className="text-sm overflow-x-auto" style={{ color: '#E5E7EB' }}>{EXAMPLE_RULE}</pre>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { trigger: 'price_below', label: 'Price Alert', desc: 'Trigger when SOL/BTC/token hits a threshold' },
              { trigger: 'time_interval', label: 'DCA Timer', desc: 'Buy on a fixed schedule (hourly, daily, weekly)' },
              { trigger: 'pnl_above', label: 'Take Profit', desc: 'Propose sell when vault PnL reaches target' },
            ].map(item => (
              <div key={item.trigger} className="card" style={{ borderColor: '#9945FF44' }}>
                <p className="text-sm font-bold text-white mb-1">{item.label}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{item.desc}</p>
                <code className="text-xs mt-2 block" style={{ color: '#9945FF' }}>{item.trigger}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Governance Safety */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-2">Governance Safety</h2>
          <p className="mb-6" style={{ color: '#6B7280' }}>
            AI agents propose — humans decide. Every agent action creates an on-chain governance
            proposal that requires quorum + majority vote before any funds move.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '🤖', title: 'Agent proposes', desc: 'AI detects opportunity and creates on-chain proposal' },
              { icon: '🗳️', title: 'Members vote', desc: 'Vault members vote YES/NO within the governance window' },
              { icon: '⚡', title: 'Jupiter executes', desc: 'Passed proposals execute via Jupiter swap CPI' },
            ].map(step => (
              <div key={step.title} className="card text-center">
                <div className="text-3xl mb-3">{step.icon}</div>
                <p className="font-bold text-white mb-1">{step.title}</p>
                <p className="text-sm" style={{ color: '#6B7280' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center py-8">
          <p className="text-lg text-white mb-6">
            Ready to build AI-powered DeFi strategies?
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="https://github.com/YD811/potbot-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              GitHub Repository
            </a>
            <Link href="/create" className="btn-secondary">
              Create a Vault
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
