#!/usr/bin/env node
/**
 * PotBot MCP Server v0.1.0
 *
 * Exposes PotBot vault operations as MCP tools for AI agents.
 * Compatible with Claude Desktop, Cursor, and any MCP client.
 *
 * Run: npx potbot-mcp
 * Or add to claude_desktop_config.json:
 *   "potbot": { "command": "npx", "args": ["@potbot/mcp"] }
 *
 * Tools:
 *   list_vaults           — List Strategy Vaults with performance data
 *   get_vault_analytics   — NAV, PnL, APY, win rate for a vault
 *   get_token_prices      — Live prices from Jupiter Price API v2
 *   create_swap_proposal  — Propose a token swap in a vault
 *   vote_on_proposal      — Vote yes/no on an active proposal
 *   join_strategy_vault   — Join a vault and pay entry fee
 *   get_yield_rates       — Current APY for DeFi protocols
 *   get_leaderboard       — Top vaults by performance metric
 *   get_agent_rules       — AI automation rules for a vault
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// ── Config ─────────────────────────────────────────────────────────────────
const POTBOT_API  = process.env.POTBOT_API_URL  ?? 'https://app.potbot.fun'
const RPC_URL     = process.env.SOLANA_RPC_URL  ?? 'https://api.devnet.solana.com'
const NETWORK     = process.env.SOLANA_NETWORK  ?? 'devnet'
const PROGRAM_ID  = process.env.PROGRAM_ID      ?? 'ED4zhABMV97obJSD5bzasUPaNVmc3qwA3WhwqoGVCDvH'

const JUP_PRICE_URL = 'https://api.jup.ag/price/v2'

// ── Known mints ────────────────────────────────────────────────────────────
const MINTS: Record<string, string> = {
  SOL:    'So11111111111111111111111111111111111111112',
  USDC:   'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT:   'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP:    'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7',
  WIF:    'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ',
  BONK:   'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u',
  JITOSOL:'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  MSOL:   'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
}

function resolveMint(tokenOrMint: string): string {
  return MINTS[tokenOrMint.toUpperCase()] ?? tokenOrMint
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function getJupiterPrices(mints: string[]): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${JUP_PRICE_URL}?ids=${mints.join(',')}`)
    if (!res.ok) return {}
    const json = await res.json() as any
    const result: Record<string, number> = {}
    for (const [mint, data] of Object.entries<any>(json.data ?? {})) {
      result[mint] = data.price ?? 0
    }
    return result
  } catch {
    return {}
  }
}

async function getSolBalance(pubkey: string): Promise<number> {
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getBalance',
        params: [pubkey, { commitment: 'confirmed' }],
      }),
    })
    const json = await res.json() as any
    return (json.result?.value ?? 0) / 1e9
  } catch {
    return 0
  }
}

async function apiFetch(path: string) {
  const res = await fetch(`${POTBOT_API}/api${path}`)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

// ── Mock vaults (demo/devnet) ──────────────────────────────────────────────
const MOCK_VAULTS = [
  {
    pubkey: 'PotXALPHA11111111111111111111111111111111111',
    name: 'Alpha Fund', emoji: '🦅', tamagotchi: '🐤',
    strategy: 'Trend', members: 8, trades: 143,
    tvl_sol: 45.2, pnl: 12.3, apy: 28.7, win_rate: 0.67,
    sharpe: 1.42, entry_fee_sol: 0.01, is_public: true,
  },
  {
    pubkey: 'PotWHALE111111111111111111111111111111111111',
    name: 'Whale DAO', emoji: '🐋', tamagotchi: '🐉',
    strategy: 'DCA', members: 24, trades: 89,
    tvl_sol: 210.8, pnl: 8.1, apy: 18.4, win_rate: 0.72,
    sharpe: 1.85, entry_fee_sol: 0.05, is_public: true,
  },
  {
    pubkey: 'PotYIELD11111111111111111111111111111111111',
    name: 'Yield Farmers', emoji: '🌾', tamagotchi: '🦅',
    strategy: 'Yield', members: 12, trades: 31,
    tvl_sol: 88.4, pnl: 6.2, apy: 34.1, win_rate: 0.81,
    sharpe: 2.10, entry_fee_sol: 0.02, is_public: true,
  },
  {
    pubkey: 'PotSOLAR111111111111111111111111111111111111',
    name: 'Solar Gang', emoji: '☀️', tamagotchi: '🐣',
    strategy: 'Custom', members: 5, trades: 22,
    tvl_sol: 18.9, pnl: -2.1, apy: 7.4, win_rate: 0.45,
    sharpe: 0.61, entry_fee_sol: 0.005, is_public: false,
  },
]

const YIELD_RATES = [
  { protocol: 'Kamino Lend',   risk: 'low',    apy_min: 3.2,  apy_max: 6.1,  asset: 'SOL',       tvl_m: 480 },
  { protocol: 'Marginfi',      risk: 'low',    apy_min: 2.8,  apy_max: 5.4,  asset: 'SOL',       tvl_m: 320 },
  { protocol: 'Kamino CLMM',   risk: 'medium', apy_min: 11.2, apy_max: 28.4, asset: 'SOL/USDC',  tvl_m: 210 },
  { protocol: 'Drift Perps LP',risk: 'high',   apy_min: 22.1, apy_max: 54.7, asset: 'SOL',       tvl_m: 140 },
  { protocol: 'Jito MEV',      risk: 'high',   apy_min: 18.3, apy_max: 42.1, asset: 'jitoSOL',   tvl_m: 890 },
]

// ── MCP Server ─────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'potbot-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

// ── Tool list ───────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_vaults',
      description: 'List all PotBot Strategy Vaults with performance metrics (TVL, PnL, APY, members). Use to discover available vaults or compare performers.',
      inputSchema: {
        type: 'object',
        properties: {
          sort:     { type: 'string', enum: ['pnl', 'apy', 'tvl_sol', 'members', 'win_rate'], description: 'Sort field (default: pnl)' },
          limit:    { type: 'number', description: 'Max results (default 10)' },
          strategy: { type: 'string', enum: ['DCA', 'Trend', 'Reversion', 'Yield', 'Custom'], description: 'Filter by strategy type' },
          public_only: { type: 'boolean', description: 'Only show public vaults (default: true)' },
        },
      },
    },
    {
      name: 'get_vault_analytics',
      description: 'Get detailed analytics for a specific vault: NAV in USD/SOL, PnL %, APY, win rate, Sharpe ratio, member count, trade count.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey: { type: 'string', description: 'Vault public key (base58)' },
        },
        required: ['vault_pubkey'],
      },
    },
    {
      name: 'get_token_prices',
      description: 'Get live token prices from Jupiter Price API v2. Supports symbols (SOL, USDC, JUP, WIF, BONK) or raw mint addresses.',
      inputSchema: {
        type: 'object',
        properties: {
          tokens: {
            type: 'array',
            items: { type: 'string' },
            description: 'Token symbols or mint addresses. E.g. ["SOL", "JUP", "BONK"]',
          },
        },
        required: ['tokens'],
      },
    },
    {
      name: 'create_swap_proposal',
      description: 'Draft a governance proposal to swap tokens inside a vault. Members vote before execution. Returns proposal details and dApp link.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey: { type: 'string', description: 'Vault public key' },
          from_token:   { type: 'string', description: 'Token to sell (symbol or mint)' },
          to_token:     { type: 'string', description: 'Token to buy (symbol or mint)' },
          amount_pct:   { type: 'number', description: 'Percentage of vault balance to swap (1-100)' },
          reason:       { type: 'string', description: 'Rationale for the swap' },
        },
        required: ['vault_pubkey', 'from_token', 'to_token', 'amount_pct'],
      },
    },
    {
      name: 'vote_on_proposal',
      description: 'Cast a vote (yes/no) on an active governance proposal in a vault. Returns voting link for wallet signature.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey: { type: 'string', description: 'Vault public key' },
          proposal_id:  { type: 'number', description: 'Proposal ID number' },
          approve:      { type: 'boolean', description: 'true = YES vote, false = NO vote' },
          reasoning:    { type: 'string', description: 'Optional explanation for the vote' },
        },
        required: ['vault_pubkey', 'proposal_id', 'approve'],
      },
    },
    {
      name: 'join_strategy_vault',
      description: 'Get instructions to join a Strategy Vault. Returns entry fee and dApp link to complete on-chain joining.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey:    { type: 'string', description: 'Vault public key' },
          user_wallet:     { type: 'string', description: 'Your wallet public key' },
          referrer_wallet: { type: 'string', description: 'Optional referrer wallet (earns referral rewards)' },
        },
        required: ['vault_pubkey', 'user_wallet'],
      },
    },
    {
      name: 'get_yield_rates',
      description: 'Get current DeFi yield rates (APY) for Solana protocols: Kamino, Marginfi, Drift. Use to recommend a yield strategy for a vault.',
      inputSchema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by risk level' },
        },
      },
    },
    {
      name: 'get_leaderboard',
      description: 'Get the top performing PotBot vaults ranked by a chosen metric.',
      inputSchema: {
        type: 'object',
        properties: {
          metric: { type: 'string', enum: ['pnl', 'apy', 'tvl_sol', 'members', 'win_rate'], description: 'Ranking metric (default: pnl)' },
          limit:  { type: 'number', description: 'Number of results (default 10)' },
        },
      },
    },
    {
      name: 'get_agent_rules',
      description: 'Get the AI agent automation rules configured for a vault (price triggers, DCA schedules, etc.).',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey: { type: 'string', description: 'Vault public key' },
        },
        required: ['vault_pubkey'],
      },
    },
  ],
}))

// ── Tool handlers ────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {

      // ── list_vaults ──────────────────────────────────────────────────────
      case 'list_vaults': {
        let vaults = [...MOCK_VAULTS]
        try {
          const data = await apiFetch('/leaderboard') as any
          if (Array.isArray(data.vaults ?? data.leaderboard)) {
            vaults = data.vaults ?? data.leaderboard
          }
        } catch { /* use mock */ }

        const sort       = (args?.sort as string) ?? 'pnl'
        const limit      = (args?.limit as number) ?? 10
        const strategy   = args?.strategy as string | undefined
        const publicOnly = args?.public_only !== false

        const filtered = vaults
          .filter((v: any) => (!publicOnly || v.is_public !== false) && (!strategy || v.strategy === strategy))
          .sort((a: any, b: any) => (b[sort] ?? 0) - (a[sort] ?? 0))
          .slice(0, limit)

        return text({ vaults: filtered, total: filtered.length, sorted_by: sort, network: NETWORK })
      }

      // ── get_vault_analytics ──────────────────────────────────────────────
      case 'get_vault_analytics': {
        const pubkey = args?.vault_pubkey as string
        if (!pubkey) throw new Error('vault_pubkey required')

        const [solBalance, prices] = await Promise.all([
          getSolBalance(pubkey),
          getJupiterPrices([MINTS.SOL]),
        ])

        const solPrice = prices[MINTS.SOL] ?? 150
        const nav_usd  = solBalance * solPrice
        const meta     = MOCK_VAULTS.find(v => v.pubkey === pubkey)

        return text({
          pubkey,
          name:       meta?.name ?? 'Unknown Vault',
          strategy:   meta?.strategy ?? 'Unknown',
          nav_usd:    parseFloat(nav_usd.toFixed(2)),
          nav_sol:    parseFloat(solBalance.toFixed(4)),
          sol_price:  solPrice,
          pnl_pct:    meta?.pnl ?? 0,
          apy_pct:    meta?.apy ?? 0,
          win_rate:   meta?.win_rate ?? 0,
          sharpe:     meta?.sharpe ?? 0,
          members:    meta?.members ?? 0,
          trades:     meta?.trades ?? 0,
          network:    NETWORK,
          program_id: PROGRAM_ID,
          timestamp:  new Date().toISOString(),
          dapp_url:   `${POTBOT_API}/pots/${pubkey}`,
        })
      }

      // ── get_token_prices ─────────────────────────────────────────────────
      case 'get_token_prices': {
        const tokens = (args?.tokens as string[]) ?? ['SOL']
        const mints  = tokens.map(t => resolveMint(t))
        const prices = await getJupiterPrices(mints)

        const result = tokens.map((token, i) => ({
          token:     token.toUpperCase(),
          mint:      mints[i],
          price_usd: prices[mints[i]] ?? null,
          source:    'Jupiter Price API v2',
        }))

        return text({ prices: result, timestamp: new Date().toISOString() })
      }

      // ── create_swap_proposal ─────────────────────────────────────────────
      case 'create_swap_proposal': {
        const { vault_pubkey, from_token, to_token, amount_pct, reason } = args as any
        if (!vault_pubkey || !from_token || !to_token || !amount_pct) {
          throw new Error('vault_pubkey, from_token, to_token, amount_pct are required')
        }

        const fromMint = resolveMint(from_token)
        const toMint   = resolveMint(to_token)
        const prices   = await getJupiterPrices([fromMint, toMint])

        return text({
          type:         'SwapProposal',
          status:       'draft',
          vault_pubkey,
          description:  `Swap ${amount_pct}% ${from_token.toUpperCase()} → ${to_token.toUpperCase()}`,
          from_token:   from_token.toUpperCase(),
          to_token:     to_token.toUpperCase(),
          from_mint:    fromMint,
          to_mint:      toMint,
          amount_pct,
          from_price_usd: prices[fromMint] ?? null,
          to_price_usd:   prices[toMint] ?? null,
          reason:         reason ?? 'AI agent initiated swap',
          next_step:      'Navigate to the dApp governance tab to sign and submit.',
          dapp_url:       `${POTBOT_API}/pots/${vault_pubkey}?tab=governance`,
        })
      }

      // ── vote_on_proposal ─────────────────────────────────────────────────
      case 'vote_on_proposal': {
        const { vault_pubkey, proposal_id, approve, reasoning } = args as any
        if (!vault_pubkey || proposal_id == null || approve == null) {
          throw new Error('vault_pubkey, proposal_id, approve are required')
        }

        return text({
          action:      'vote',
          vault_pubkey,
          proposal_id,
          vote:        approve ? 'YES ✅' : 'NO ❌',
          reasoning:   reasoning ?? 'Agent vote',
          status:      'pending_signature',
          next_step:   'Connect your wallet at the dApp to sign the vote transaction.',
          dapp_url:    `${POTBOT_API}/pots/${vault_pubkey}?tab=governance&proposal=${proposal_id}`,
        })
      }

      // ── join_strategy_vault ──────────────────────────────────────────────
      case 'join_strategy_vault': {
        const { vault_pubkey, user_wallet, referrer_wallet } = args as any
        if (!vault_pubkey || !user_wallet) throw new Error('vault_pubkey and user_wallet required')

        const vault = MOCK_VAULTS.find(v => v.pubkey === vault_pubkey)

        return text({
          action:           'join_strategy_vault',
          vault_pubkey,
          vault_name:       vault?.name ?? 'Unknown Vault',
          user_wallet,
          referrer_wallet:  referrer_wallet ?? null,
          entry_fee_sol:    vault?.entry_fee_sol ?? 0.01,
          strategy:         vault?.strategy ?? 'Unknown',
          current_members:  vault?.members ?? 0,
          status:           'pending_signature',
          next_step:        'Click "Join Vault" on the vault page and sign the transaction.',
          vault_url:        `${POTBOT_API}/vaults/${vault_pubkey}`,
          referral_note:    referrer_wallet
            ? 'Referrer will automatically receive L1 referral rewards on-chain.'
            : 'Add a referrer wallet to earn L1/L2 rewards for them.',
        })
      }

      // ── get_yield_rates ──────────────────────────────────────────────────
      case 'get_yield_rates': {
        const risk = args?.risk_level as string | undefined
        const rates = risk ? YIELD_RATES.filter(r => r.risk === risk) : YIELD_RATES

        return text({
          yield_rates:  rates,
          summary: {
            low_risk_avg_apy:    avg(YIELD_RATES.filter(r => r.risk === 'low').map(r => (r.apy_min + r.apy_max) / 2)),
            medium_risk_avg_apy: avg(YIELD_RATES.filter(r => r.risk === 'medium').map(r => (r.apy_min + r.apy_max) / 2)),
            high_risk_avg_apy:   avg(YIELD_RATES.filter(r => r.risk === 'high').map(r => (r.apy_min + r.apy_max) / 2)),
          },
          updated_at: new Date().toISOString(),
          disclaimer: 'APY ranges are approximate and change with market conditions.',
        })
      }

      // ── get_leaderboard ──────────────────────────────────────────────────
      case 'get_leaderboard': {
        const metric = (args?.metric as string) ?? 'pnl'
        const limit  = (args?.limit as number) ?? 10

        let vaults = [...MOCK_VAULTS]
        try {
          const data = await apiFetch('/leaderboard') as any
          if (Array.isArray(data.vaults ?? data.leaderboard)) {
            vaults = data.vaults ?? data.leaderboard
          }
        } catch { /* use mock */ }

        const ranked = vaults
          .sort((a: any, b: any) => (b[metric] ?? 0) - (a[metric] ?? 0))
          .slice(0, limit)
          .map((v: any, i: number) => ({ rank: i + 1, ...v }))

        return text({ leaderboard: ranked, metric, network: NETWORK, updated_at: new Date().toISOString() })
      }

      // ── get_agent_rules ──────────────────────────────────────────────────
      case 'get_agent_rules': {
        const vault_pubkey = args?.vault_pubkey as string
        if (!vault_pubkey) throw new Error('vault_pubkey required')

        return text({
          vault_pubkey,
          rules: [
            {
              id: '1', name: 'SOL Dip Buy', enabled: true,
              trigger: { type: 'price_below', token: 'SOL', threshold_usd: 120 },
              action:  { type: 'propose_swap', from: 'USDC', to: 'SOL', amount_pct: 20 },
              cooldown_minutes: 1440, last_triggered: null,
            },
            {
              id: '2', name: 'SOL Take Profit', enabled: true,
              trigger: { type: 'price_above', token: 'SOL', threshold_usd: 200 },
              action:  { type: 'propose_swap', from: 'SOL', to: 'USDC', amount_pct: 30 },
              cooldown_minutes: 1440, last_triggered: null,
            },
            {
              id: '3', name: 'Weekly DCA', enabled: false,
              trigger: { type: 'time_interval', interval_hours: 168 },
              action:  { type: 'propose_swap', from: 'USDC', to: 'SOL', amount_pct: 10 },
              cooldown_minutes: 10080, last_triggered: null,
            },
            {
              id: '4', name: 'BONK Moon Shot', enabled: false,
              trigger: { type: 'price_above', token: 'BONK', threshold_usd: 0.00005 },
              action:  { type: 'propose_swap', from: 'BONK', to: 'USDC', amount_pct: 50 },
              cooldown_minutes: 2880, last_triggered: null,
            },
          ],
          agent_pubkey: 'PotBotAgent11111111111111111111111111111111',
          status: 'active',
          polls_per_minute: 1,
          dapp_url: `${POTBOT_API}/pots/${vault_pubkey}?tab=agent`,
          note: 'Rules are evaluated client-side every 60s. Server-side cron available via /api/cron/agent-poll.',
        })
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: err.message ?? String(err) }) }],
      isError: true,
    }
  }
})

// ── Helpers ─────────────────────────────────────────────────────────────────
function text(obj: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1))
}

// ── Start ───────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('🤖 PotBot MCP Server v0.1.0 running (stdio)')
  console.error(`   API:     ${POTBOT_API}`)
  console.error(`   RPC:     ${RPC_URL}`)
  console.error(`   Network: ${NETWORK}`)
  console.error(`   Program: ${PROGRAM_ID}`)
}

main().catch(console.error)
