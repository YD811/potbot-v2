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
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { PublicKey } from '@solana/web3.js'
import {
  POT_VAULT_PROGRAM_ID,
  buildRegisterDelegateIx,
  buildRevokeDelegateIx,
  buildVoteAsDelegateIx,
  loadAgentKeypair,
  sendIxs,
  unsignedTxBase64,
  readMemberDelegate,
  getConnection,
  delegatePda,
  rpcUrl,
} from './anchor.js'

// ── Config ─────────────────────────────────────────────────────────────────
const POTBOT_API  = process.env.POTBOT_API_URL  ?? 'https://api.potbot.fun'
const RPC_URL     = process.env.SOLANA_RPC_URL  ?? 'https://api.devnet.solana.com'
const NETWORK     = process.env.SOLANA_NETWORK  ?? 'devnet'
const PROGRAM_ID  = process.env.PROGRAM_ID      ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'

const JUP_PRICE_URL    = 'https://api.jup.ag/price/v2'
const DEFILLAMA_POOLS  = 'https://yields.llama.fi/pools'

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
async function getJupiterPrices(mints: string[]): Promise<{ prices: Record<string, number>; warning?: string }> {
  try {
    const res = await fetch(`${JUP_PRICE_URL}?ids=${mints.join(',')}`)
    if (!res.ok) return { prices: {}, warning: `Jupiter Price API ${res.status}` }
    const json = await res.json() as any
    const result: Record<string, number> = {}
    for (const [mint, data] of Object.entries<any>(json.data ?? {})) {
      result[mint] = data.price ?? 0
    }
    return { prices: result }
  } catch (err: any) {
    return { prices: {}, warning: `Jupiter unreachable: ${err.message ?? String(err)}` }
  }
}

async function getSolBalance(pubkey: string): Promise<{ sol: number; warning?: string }> {
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
    if (json.error) return { sol: 0, warning: `RPC getBalance: ${json.error.message}` }
    return { sol: (json.result?.value ?? 0) / 1e9 }
  } catch (err: any) {
    return { sol: 0, warning: `RPC unreachable: ${err.message ?? String(err)}` }
  }
}

interface SplHolding {
  mint: string
  symbol: string
  amount: number
  decimals: number
}

async function getSplHoldings(pubkey: string): Promise<{ holdings: SplHolding[]; warning?: string }> {
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          pubkey,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed', commitment: 'confirmed' },
        ],
      }),
    })
    const json = await res.json() as any
    if (json.error) return { holdings: [], warning: `RPC getTokenAccountsByOwner: ${json.error.message}` }

    const reverseMints: Record<string, string> = Object.fromEntries(
      Object.entries(MINTS).map(([sym, mint]) => [mint, sym]),
    )

    const holdings: SplHolding[] = (json.result?.value ?? [])
      .map((acc: any) => {
        const info = acc.account?.data?.parsed?.info
        if (!info) return null
        const amount = info.tokenAmount?.uiAmount ?? 0
        if (amount === 0) return null
        return {
          mint: info.mint,
          symbol: reverseMints[info.mint] ?? `${info.mint.slice(0, 4)}…${info.mint.slice(-4)}`,
          amount,
          decimals: info.tokenAmount?.decimals ?? 0,
        }
      })
      .filter(Boolean)

    return { holdings }
  } catch (err: any) {
    return { holdings: [], warning: `RPC unreachable: ${err.message ?? String(err)}` }
  }
}

interface DefiLlamaPool {
  protocol: string
  symbol: string
  apy: number
  apy_base: number | null
  apy_reward: number | null
  tvl_usd: number
  pool_id: string
  url: string
  risk: 'low' | 'medium' | 'high'
}

function classifyRisk(apy: number, ilRisk: string): 'low' | 'medium' | 'high' {
  if (ilRisk === 'yes' || apy > 30) return 'high'
  if (apy > 10) return 'medium'
  return 'low'
}

async function getDefiLlamaSolanaYields(): Promise<{ pools: DefiLlamaPool[]; warning?: string }> {
  try {
    const res = await fetch(DEFILLAMA_POOLS)
    if (!res.ok) return { pools: [], warning: `DefiLlama ${res.status}` }
    const json = await res.json() as any
    const pools: DefiLlamaPool[] = (json.data ?? [])
      .filter((p: any) => p.chain === 'Solana' && typeof p.apy === 'number' && p.tvlUsd > 100_000)
      .map((p: any) => ({
        protocol: p.project,
        symbol: p.symbol,
        apy: parseFloat(p.apy.toFixed(2)),
        apy_base: p.apyBase != null ? parseFloat(p.apyBase.toFixed(2)) : null,
        apy_reward: p.apyReward != null ? parseFloat(p.apyReward.toFixed(2)) : null,
        tvl_usd: Math.round(p.tvlUsd),
        pool_id: p.pool,
        url: `https://defillama.com/yields/pool/${p.pool}`,
        risk: classifyRisk(p.apy, p.ilRisk ?? 'no'),
      }))
      .sort((a: DefiLlamaPool, b: DefiLlamaPool) => b.tvl_usd - a.tvl_usd)
    return { pools }
  } catch (err: any) {
    return { pools: [], warning: `DefiLlama unreachable: ${err.message ?? String(err)}` }
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
  { name: 'potbot-mcp', version: '0.3.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
)

// ── Resources ──────────────────────────────────────────────────────────────
const RESOURCES = [
  {
    uri: 'potbot://network/info',
    name: 'PotBot Network Info',
    description: 'Network, RPC URL, program ID, and dApp links.',
    mimeType: 'application/json',
  },
  {
    uri: 'potbot://vaults/list',
    name: 'PotBot Vaults Directory',
    description: 'Snapshot of known PotBot strategy vaults with performance metadata.',
    mimeType: 'application/json',
  },
  {
    uri: 'potbot://yields/solana',
    name: 'Solana DeFi Yields (DefiLlama)',
    description: 'Live yield pools on Solana from DefiLlama with risk classification.',
    mimeType: 'application/json',
  },
]

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }))

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri
  switch (uri) {
    case 'potbot://network/info': {
      const payload = {
        network: NETWORK,
        rpc_url: RPC_URL,
        program_id: PROGRAM_ID,
        api_url: POTBOT_API,
        dapp: 'https://potbot.fun',
        explorer: NETWORK === 'devnet'
          ? `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`
          : `https://explorer.solana.com/address/${PROGRAM_ID}`,
        timestamp: new Date().toISOString(),
      }
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) }] }
    }
    case 'potbot://vaults/list': {
      const payload = { vaults: MOCK_VAULTS, network: NETWORK, source: 'mock (devnet seed data)' }
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) }] }
    }
    case 'potbot://yields/solana': {
      const { pools, warning } = await getDefiLlamaSolanaYields()
      const payload = { pools: pools.slice(0, 50), source: 'DefiLlama', updated_at: new Date().toISOString(), ...(warning ? { warning } : {}) }
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) }] }
    }
    default:
      throw new Error(`Unknown resource: ${uri}`)
  }
})

// ── Prompts ────────────────────────────────────────────────────────────────
const PROMPTS = [
  {
    name: 'vault_strategist',
    description: 'Act as a senior crypto vault strategist. Inspect a PotBot vault and recommend a rebalance.',
    arguments: [
      { name: 'vault_pubkey', description: 'PotBot vault public key', required: true },
      { name: 'goal', description: 'Investment goal (e.g. "preserve capital", "max yield", "outperform SOL")', required: false },
    ],
  },
  {
    name: 'risk_auditor',
    description: 'Audit a swap proposal for risks: slippage, concentration, governance, downside.',
    arguments: [
      { name: 'vault_pubkey', description: 'PotBot vault public key', required: true },
      { name: 'proposal_id', description: 'On-chain proposal ID', required: true },
    ],
  },
  {
    name: 'yield_hunter',
    description: 'Find the best yield strategy on Solana for a given amount and risk tolerance.',
    arguments: [
      { name: 'amount_usdc', description: 'Amount in USDC equivalent', required: true },
      { name: 'risk', description: 'low | medium | high', required: false },
    ],
  },
]

server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }))

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const name = request.params.name
  const args = request.params.arguments ?? {}

  switch (name) {
    case 'vault_strategist':
      return {
        description: 'Vault strategist analysis',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are a senior crypto vault strategist auditing a PotBot vault.

Vault: ${args.vault_pubkey ?? '<vault_pubkey>'}
Goal: ${args.goal ?? 'maximize risk-adjusted returns'}

Steps:
1. Call get_vault_analytics for this vault to inspect NAV and SPL holdings.
2. Call get_token_prices for each non-stable holding to value the book.
3. Call get_yield_rates with risk_level matching the goal — pick top 3 pools by TVL.
4. Call get_leaderboard to compare against peer vaults.
5. Recommend up to 3 specific actions, each as a draft create_swap_proposal call (do not execute — produce arguments only).

Output a concise rationale with explicit numbers, not generalities.`,
          },
        }],
      }
    case 'risk_auditor':
      return {
        description: 'Proposal risk audit',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are a risk auditor reviewing PotBot proposal #${args.proposal_id ?? '<id>'} in vault ${args.vault_pubkey ?? '<vault_pubkey>'}.

Steps:
1. Pull current vault state via get_vault_analytics.
2. Pull live prices for affected tokens via get_token_prices.
3. Identify the four risks: (a) slippage given Jupiter quote vs vault size, (b) concentration after the swap, (c) governance manipulation (whale members), (d) downside if the trade is wrong.
4. Output a YES/NO recommendation with a one-sentence rationale per risk.

Be blunt. Numbers, not vibes.`,
          },
        }],
      }
    case 'yield_hunter':
      return {
        description: 'Yield strategy recommendation',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are a Solana yield strategist.

Capital:    ${args.amount_usdc ?? '<amount_usdc>'} USDC
Risk band:  ${args.risk ?? 'medium'}

Steps:
1. Call get_yield_rates with the requested risk level.
2. Pick the top 3 pools by APY × log(TVL) — explain why.
3. For each: state the protocol, asset, APY, TVL, IL exposure if any.
4. Suggest a 60/30/10 allocation across the three.
5. Flag any pool that is not battle-tested (TVL < $5M, audited?).`,
          },
        }],
      }
    default:
      throw new Error(`Unknown prompt: ${name}`)
  }
})

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
      description: 'Cast a vote on a governance proposal. If `proposal_pubkey` and `member_wallet` are provided AND this MCP server has AGENT_KEYPAIR + a registered delegation for that member → submits a real on-chain `vote_as_delegate` tx. Otherwise returns a dApp signing link.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey:    { type: 'string', description: 'Pot/vault public key' },
          proposal_pubkey: { type: 'string', description: 'On-chain proposal account pubkey (required for real on-chain vote)' },
          proposal_id:     { type: 'number', description: 'Proposal ID — only used to build the dApp deep-link fallback' },
          member_wallet:   { type: 'string', description: 'The member wallet whose voting power is being delegated. Required for real on-chain vote.' },
          approve:         { type: 'boolean', description: 'true = YES, false = NO' },
          reasoning:       { type: 'string', description: 'Optional explanation, logged off-chain' },
        },
        required: ['vault_pubkey', 'approve'],
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
      description: 'Get live DeFi yield rates (APY) for Solana from DefiLlama (Kamino, Marginfi, Drift, Jito, Marinade, Orca, Raydium, etc.). Pools with TVL > $100k. Use to recommend a yield strategy for a vault.',
      inputSchema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'low: APY<10% no IL. medium: APY 10-30% no IL. high: APY>30% or IL.' },
          limit:      { type: 'number', description: 'Max pools to return (default 25, sorted by TVL desc)' },
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
    {
      name: 'agent_status',
      description: 'Report the AI delegate identity available to this MCP server: its pubkey, devnet SOL balance, and whether AGENT_KEYPAIR is loaded. Use this to confirm what wallet will sign on-chain votes.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'register_delegate',
      description: 'Build the on-chain transaction for a member to register a delegate (typically this MCP agent) for voting on a vault. Returns either a base64 unsigned tx for the member to sign in their wallet, or a signature if AGENT_KEYPAIR is itself the member.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey:    { type: 'string', description: 'Pot/vault public key' },
          member_wallet:   { type: 'string', description: 'Member wallet (will sign the registration). If omitted and AGENT_KEYPAIR is set, the agent registers itself (must already be a pot member).' },
          delegate_wallet: { type: 'string', description: 'Wallet to delegate voting to. If omitted, defaults to AGENT_KEYPAIR pubkey.' },
          rules_uri:       { type: 'string', description: 'IPFS / Arweave / https URI describing the delegate\'s voting policy (transparency).' },
        },
        required: ['vault_pubkey'],
      },
    },
    {
      name: 'revoke_delegate',
      description: 'Build the on-chain transaction for a member to revoke their existing delegation. Returns base64 unsigned tx for member to sign, or signature if AGENT_KEYPAIR is itself the member.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey:  { type: 'string', description: 'Pot/vault public key' },
          member_wallet: { type: 'string', description: 'Member wallet (will sign the revoke). If omitted, defaults to AGENT_KEYPAIR pubkey.' },
        },
        required: ['vault_pubkey'],
      },
    },
    {
      name: 'check_delegate',
      description: 'Read the on-chain MemberDelegate PDA for a (vault, member). Returns delegate pubkey, rules URI, registered/revoked timestamps, active flag.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey:  { type: 'string', description: 'Pot/vault public key' },
          member_wallet: { type: 'string', description: 'Member wallet whose delegation we are inspecting' },
        },
        required: ['vault_pubkey', 'member_wallet'],
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

        const [{ sol: solBalance, warning: solWarn }, holdingsResult, pricesResult] = await Promise.all([
          getSolBalance(pubkey),
          getSplHoldings(pubkey),
          getJupiterPrices([MINTS.SOL]),
        ])

        const { prices, warning: priceWarn } = pricesResult
        const solPrice = prices[MINTS.SOL] ?? 0
        const nav_sol_only = solBalance * solPrice

        // Price all SPL holdings via Jupiter
        const holdingMints = holdingsResult.holdings.map(h => h.mint)
        let holdingPrices: Record<string, number> = {}
        let holdingPricesWarn: string | undefined
        if (holdingMints.length > 0) {
          const r = await getJupiterPrices(holdingMints)
          holdingPrices = r.prices
          holdingPricesWarn = r.warning
        }

        const splValueUsd = holdingsResult.holdings.reduce(
          (sum, h) => sum + (holdingPrices[h.mint] ?? 0) * h.amount,
          0,
        )
        const nav_usd = nav_sol_only + splValueUsd

        const meta = MOCK_VAULTS.find(v => v.pubkey === pubkey)
        const warnings = [solWarn, priceWarn, holdingsResult.warning, holdingPricesWarn].filter(Boolean)

        return text({
          pubkey,
          name:       meta?.name ?? 'Unknown Vault',
          strategy:   meta?.strategy ?? 'Unknown',
          nav_usd:    parseFloat(nav_usd.toFixed(2)),
          nav_sol:    parseFloat(solBalance.toFixed(4)),
          sol_price:  solPrice,
          spl_holdings: holdingsResult.holdings.map(h => ({
            ...h,
            price_usd: holdingPrices[h.mint] ?? null,
            value_usd: parseFloat(((holdingPrices[h.mint] ?? 0) * h.amount).toFixed(2)),
          })),
          spl_value_usd: parseFloat(splValueUsd.toFixed(2)),
          pnl_pct:    meta?.pnl ?? null,
          apy_pct:    meta?.apy ?? null,
          win_rate:   meta?.win_rate ?? null,
          sharpe:     meta?.sharpe ?? null,
          members:    meta?.members ?? null,
          trades:     meta?.trades ?? null,
          source: {
            sol_balance:  'Solana RPC getBalance',
            spl_holdings: 'Solana RPC getTokenAccountsByOwner',
            prices:       'Jupiter Price API v2',
            performance:  meta ? 'mock (devnet — no real PnL feed yet)' : 'unavailable',
          },
          network:    NETWORK,
          program_id: PROGRAM_ID,
          timestamp:  new Date().toISOString(),
          dapp_url:   `https://potbot.fun/pots/${pubkey}`,
          ...(warnings.length ? { warnings } : {}),
        })
      }

      // ── get_token_prices ─────────────────────────────────────────────────
      case 'get_token_prices': {
        const tokens = (args?.tokens as string[]) ?? ['SOL']
        const mints  = tokens.map(t => resolveMint(t))
        const { prices, warning } = await getJupiterPrices(mints)

        const result = tokens.map((token, i) => ({
          token:     token.toUpperCase(),
          mint:      mints[i],
          price_usd: prices[mints[i]] ?? null,
          source:    'Jupiter Price API v2',
        }))

        return text({
          prices: result,
          timestamp: new Date().toISOString(),
          ...(warning ? { warnings: [warning] } : {}),
        })
      }

      // ── create_swap_proposal ─────────────────────────────────────────────
      case 'create_swap_proposal': {
        const { vault_pubkey, from_token, to_token, amount_pct, reason } = args as any
        if (!vault_pubkey || !from_token || !to_token || !amount_pct) {
          throw new Error('vault_pubkey, from_token, to_token, amount_pct are required')
        }

        const fromMint = resolveMint(from_token)
        const toMint   = resolveMint(to_token)
        const { prices, warning } = await getJupiterPrices([fromMint, toMint])

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
          dapp_url:       `https://potbot.fun/pots/${vault_pubkey}?tab=governance`,
          ...(warning ? { warnings: [warning] } : {}),
        })
      }

      // ── vote_on_proposal ─────────────────────────────────────────────────
      case 'vote_on_proposal': {
        const { vault_pubkey, proposal_pubkey, proposal_id, member_wallet, approve, reasoning } = args as any
        if (!vault_pubkey || approve == null) {
          throw new Error('vault_pubkey and approve are required')
        }

        // Real on-chain delegate vote path
        if (proposal_pubkey && member_wallet) {
          const agent = loadAgentKeypair()
          if (!agent) {
            return text({
              action: 'vote',
              status: 'no_agent_keypair',
              vault_pubkey, proposal_pubkey, member_wallet, approve,
              note: 'Set AGENT_KEYPAIR env (base58 secret key or JSON array) to enable real on-chain delegate voting. Falling back to dApp link.',
              dapp_url: `https://potbot.fun/pots/${vault_pubkey}?tab=governance${proposal_id != null ? `&proposal=${proposal_id}` : ''}`,
            })
          }

          const pot = new PublicKey(vault_pubkey)
          const proposal = new PublicKey(proposal_pubkey)
          const member = new PublicKey(member_wallet)

          // Check delegation exists & active & names this agent
          const delegation = await readMemberDelegate(pot, member)
          if (!delegation.exists) {
            throw new Error(`No delegation registered for member ${member_wallet} in vault ${vault_pubkey}. Call register_delegate first.`)
          }
          if (!delegation.active) {
            throw new Error(`Delegation for member ${member_wallet} was revoked at unix ${delegation.revoked_at}`)
          }
          if (delegation.delegate?.toBase58() !== agent.publicKey.toBase58()) {
            throw new Error(`Delegation names ${delegation.delegate?.toBase58()} but this MCP agent is ${agent.publicKey.toBase58()}. Cannot vote.`)
          }

          const ix = buildVoteAsDelegateIx({
            pot,
            proposal,
            memberWallet: member,
            delegateSigner: agent.publicKey,
            approve: !!approve,
          })

          try {
            const sig = await sendIxs([ix], [agent])
            return text({
              action: 'vote_as_delegate',
              status: 'submitted',
              network: NETWORK,
              vault_pubkey,
              proposal_pubkey,
              member_wallet,
              delegate_signer: agent.publicKey.toBase58(),
              vote: approve ? 'YES ✅' : 'NO ❌',
              reasoning: reasoning ?? null,
              signature: sig,
              explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`,
              rules_uri: delegation.rules_uri,
            })
          } catch (err: any) {
            throw new Error(`On-chain vote_as_delegate failed: ${err.message ?? String(err)}`)
          }
        }

        // Fallback: dApp signing link (legacy / no on-chain context)
        return text({
          action:      'vote',
          status:      'pending_signature',
          vault_pubkey,
          proposal_id: proposal_id ?? null,
          vote:        approve ? 'YES ✅' : 'NO ❌',
          reasoning:   reasoning ?? 'Agent vote',
          note:        'For real on-chain vote: pass proposal_pubkey + member_wallet (with active delegation to this agent). Otherwise sign in dApp.',
          dapp_url:    `https://potbot.fun/pots/${vault_pubkey}?tab=governance${proposal_id != null ? `&proposal=${proposal_id}` : ''}`,
        })
      }

      // ── agent_status ─────────────────────────────────────────────────────
      case 'agent_status': {
        let agentInfo: any = { configured: false, source: 'no AGENT_KEYPAIR env' }
        try {
          const kp = loadAgentKeypair()
          if (kp) {
            const conn = getConnection()
            const balance = await conn.getBalance(kp.publicKey).catch(() => 0)
            agentInfo = {
              configured: true,
              pubkey: kp.publicKey.toBase58(),
              balance_sol: balance / 1e9,
              source: process.env.AGENT_KEYPAIR?.startsWith('[') ? 'json-array' : 'base58',
            }
          }
        } catch (err: any) {
          agentInfo = { configured: false, error: err.message ?? String(err) }
        }
        return text({
          agent: agentInfo,
          program_id: POT_VAULT_PROGRAM_ID.toBase58(),
          rpc_url: rpcUrl(),
          network: NETWORK,
          tools_requiring_agent: ['vote_on_proposal (real on-chain)', 'register_delegate (when self-registering)', 'revoke_delegate (when self-revoking)'],
        })
      }

      // ── register_delegate ────────────────────────────────────────────────
      case 'register_delegate': {
        const { vault_pubkey, member_wallet, delegate_wallet, rules_uri } = args as any
        if (!vault_pubkey) throw new Error('vault_pubkey required')

        const agent = loadAgentKeypair()
        const pot = new PublicKey(vault_pubkey)

        const memberKey = member_wallet
          ? new PublicKey(member_wallet)
          : (agent?.publicKey ?? null)
        if (!memberKey) throw new Error('member_wallet required (or set AGENT_KEYPAIR for self-registration)')

        const delegateKey = delegate_wallet
          ? new PublicKey(delegate_wallet)
          : (agent?.publicKey ?? null)
        if (!delegateKey) throw new Error('delegate_wallet required (or set AGENT_KEYPAIR to delegate to the agent itself)')

        const ix = buildRegisterDelegateIx({
          pot,
          memberWallet: memberKey,
          delegate: delegateKey,
          rulesUri: rules_uri ?? '',
        })

        // If the agent IS the member, sign and submit directly
        if (agent && agent.publicKey.equals(memberKey)) {
          try {
            const sig = await sendIxs([ix], [agent])
            return text({
              action: 'register_delegate',
              status: 'submitted',
              vault_pubkey,
              member_wallet: memberKey.toBase58(),
              delegate_wallet: delegateKey.toBase58(),
              rules_uri: rules_uri ?? '',
              signature: sig,
              explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`,
            })
          } catch (err: any) {
            throw new Error(`On-chain register_delegate failed: ${err.message ?? String(err)}`)
          }
        }

        // Otherwise return unsigned tx for the member to sign
        const { tx_b64, blockhash } = await unsignedTxBase64([ix], memberKey)
        return text({
          action: 'register_delegate',
          status: 'unsigned_tx',
          vault_pubkey,
          member_wallet: memberKey.toBase58(),
          delegate_wallet: delegateKey.toBase58(),
          rules_uri: rules_uri ?? '',
          unsigned_tx_b64: tx_b64,
          recent_blockhash: blockhash,
          next_step: 'Have the member wallet sign the unsigned_tx_b64 transaction (e.g. via Phantom partial-sign API or the PotBot dApp) and submit it.',
        })
      }

      // ── revoke_delegate ──────────────────────────────────────────────────
      case 'revoke_delegate': {
        const { vault_pubkey, member_wallet } = args as any
        if (!vault_pubkey) throw new Error('vault_pubkey required')

        const agent = loadAgentKeypair()
        const pot = new PublicKey(vault_pubkey)
        const memberKey = member_wallet
          ? new PublicKey(member_wallet)
          : (agent?.publicKey ?? null)
        if (!memberKey) throw new Error('member_wallet required (or set AGENT_KEYPAIR)')

        const ix = buildRevokeDelegateIx({ pot, memberWallet: memberKey })

        if (agent && agent.publicKey.equals(memberKey)) {
          try {
            const sig = await sendIxs([ix], [agent])
            return text({
              action: 'revoke_delegate',
              status: 'submitted',
              vault_pubkey,
              member_wallet: memberKey.toBase58(),
              signature: sig,
              explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`,
            })
          } catch (err: any) {
            throw new Error(`On-chain revoke_delegate failed: ${err.message ?? String(err)}`)
          }
        }

        const { tx_b64, blockhash } = await unsignedTxBase64([ix], memberKey)
        return text({
          action: 'revoke_delegate',
          status: 'unsigned_tx',
          vault_pubkey,
          member_wallet: memberKey.toBase58(),
          unsigned_tx_b64: tx_b64,
          recent_blockhash: blockhash,
          next_step: 'Have the member wallet sign the unsigned_tx_b64 and submit.',
        })
      }

      // ── check_delegate ───────────────────────────────────────────────────
      case 'check_delegate': {
        const { vault_pubkey, member_wallet } = args as any
        if (!vault_pubkey || !member_wallet) throw new Error('vault_pubkey and member_wallet required')

        const pot = new PublicKey(vault_pubkey)
        const member = new PublicKey(member_wallet)
        const [pda] = delegatePda(pot, member)
        const info = await readMemberDelegate(pot, member)

        return text({
          vault_pubkey,
          member_wallet,
          delegate_pda: pda.toBase58(),
          ...info,
          delegate: info.delegate?.toBase58() ?? null,
          explorer_url: `https://explorer.solana.com/address/${pda.toBase58()}?cluster=${NETWORK}`,
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
        const limit = (args?.limit as number) ?? 25

        const { pools, warning } = await getDefiLlamaSolanaYields()

        if (pools.length > 0) {
          const filtered = (risk ? pools.filter(p => p.risk === risk) : pools).slice(0, limit)
          return text({
            yield_rates: filtered,
            total: filtered.length,
            summary: {
              low_risk_avg_apy:    avg(pools.filter(p => p.risk === 'low').map(p => p.apy)),
              medium_risk_avg_apy: avg(pools.filter(p => p.risk === 'medium').map(p => p.apy)),
              high_risk_avg_apy:   avg(pools.filter(p => p.risk === 'high').map(p => p.apy)),
              total_pools_indexed: pools.length,
            },
            source: 'DefiLlama yields.llama.fi/pools (Solana, TVL > $100k)',
            risk_classification: 'low: APY < 10% & no IL. medium: APY 10–30% no IL. high: APY > 30% or IL.',
            updated_at: new Date().toISOString(),
            disclaimer: 'APYs are reported by DefiLlama and change continuously. Verify on protocol UI before depositing.',
            ...(warning ? { warnings: [warning] } : {}),
          })
        }

        // Fallback to static estimates if DefiLlama unreachable
        const rates = risk ? YIELD_RATES.filter(r => r.risk === risk) : YIELD_RATES
        return text({
          yield_rates: rates,
          summary: {
            low_risk_avg_apy:    avg(YIELD_RATES.filter(r => r.risk === 'low').map(r => (r.apy_min + r.apy_max) / 2)),
            medium_risk_avg_apy: avg(YIELD_RATES.filter(r => r.risk === 'medium').map(r => (r.apy_min + r.apy_max) / 2)),
            high_risk_avg_apy:   avg(YIELD_RATES.filter(r => r.risk === 'high').map(r => (r.apy_min + r.apy_max) / 2)),
          },
          source: 'static estimates (DefiLlama fallback)',
          updated_at: new Date().toISOString(),
          disclaimer: 'APY ranges are approximate and change with market conditions.',
          ...(warning ? { warnings: [warning] } : {}),
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
