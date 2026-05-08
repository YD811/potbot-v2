#!/usr/bin/env node
/**
 * PotBot MCP Server
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

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

// Load version from package.json at runtime so the handshake / startup
// banner stay in sync with the published artifact. dist/index.js sits one
// level below package.json, so `../package.json` is the right relative path.
const __dirname = dirname(fileURLToPath(import.meta.url))
const { version: PKG_VERSION } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
) as { version: string }
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
  buildCreateSwapProposalIx,
  buildDepositIx,
  loadAgentKeypair,
  sendIxs,
  unsignedTxBase64,
  readMemberDelegate,
  readPotAccount,
  getAllPots,
  getProposalsForPot,
  getVaultLamports,
  getConnection,
  delegatePda,
  vaultPda,
  proposalPda,
  rpcUrl,
} from './anchor.js'
import { getMarketAnalytics, getTopSolanaProtocols, getProtocolStats } from './data/market.js'
import { getSocialSentiment } from './data/social.js'

// ── Config ─────────────────────────────────────────────────────────────────
const POTBOT_API  = process.env.POTBOT_API_URL  ?? 'https://api.potbot.fun'
const RPC_URL     = process.env.SOLANA_RPC_URL  ?? 'https://api.devnet.solana.com'
const NETWORK     = process.env.SOLANA_NETWORK  ?? 'devnet'
const PROGRAM_ID  = process.env.PROGRAM_ID      ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'

const JUP_PRICE_URL    = 'https://api.jup.ag/price/v2'
const DEFILLAMA_POOLS  = 'https://yields.llama.fi/pools'

// ── Known mints ────────────────────────────────────────────────────────────
// Mainnet defaults — overridden per-symbol by MINTS_DEVNET when SOLANA_NETWORK=devnet.
const MINTS_MAINNET: Record<string, string> = {
  SOL:    'So11111111111111111111111111111111111111112',
  USDC:   'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT:   'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP:    'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7',
  WIF:    'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ',
  BONK:   'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u',
  JITOSOL:'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  MSOL:   'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
}

// Devnet-only overrides (only symbols whose mints actually differ on devnet).
// Anything not listed here falls through to mainnet — fine for SOL (same on
// every cluster) and acceptable for tokens we never execute against on devnet.
const MINTS_DEVNET: Record<string, string> = {
  USDC:   '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // canonical devnet USDC faucet mint
}

const MINTS: Record<string, string> =
  NETWORK === 'devnet' ? { ...MINTS_MAINNET, ...MINTS_DEVNET } : MINTS_MAINNET

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
  { name: 'potbot-mcp', version: PKG_VERSION },
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
You make decisions based on real data, not vibes. Always cite the source tool you used.

Vault: ${args.vault_pubkey ?? '<vault_pubkey>'}
Goal: ${args.goal ?? 'maximize risk-adjusted returns'}

Steps:
1. Call get_vault_analytics — inspect NAV, member_count, governance, on-chain SPL holdings.
2. For each non-stable holding AND for SOL, call get_market_analytics — record price, 24h/7d/30d % changes, 30d realized volatility, RSI, trend label, market cap rank.
3. Call get_social_sentiment for the same tokens — record overall verdict (bullish/bearish/neutral), score, confidence, top tweet samples.
4. Call get_yield_rates with risk_level matching the goal — pick top 3 pools by TVL.
5. Call get_top_solana_protocols if you'd consider migrating yield to a different protocol.
6. Cross-check by calling get_leaderboard to compare against peer vaults.
7. Recommend up to 3 specific actions, each as a draft create_swap_proposal call (do not execute — produce arguments only).

Each recommendation must cite specific numbers AND specific signals: e.g.
"Swap 30% USDC → SOL: SOL 30d trend = down (-22%), RSI 28 (oversold), social sentiment turning bullish (score +0.31, 14/20 top tweets bullish), TVL stable. Rationale: dollar-cost into oversold RSI with positive social inflection."

Refuse to recommend without first calling get_market_analytics + get_social_sentiment.`,
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
      description: 'Build the on-chain `create_proposal` transaction for a Swap proposal. Auto-derives the next proposal_id from PotAccount.next_proposal_id. Returns base64 unsigned tx for the proposer to sign, OR signs+submits if AGENT_KEYPAIR is the proposer.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey:    { type: 'string', description: 'Pot/vault public key' },
          proposer_wallet: { type: 'string', description: 'Wallet that will sign and become proposer (must be a member). Defaults to AGENT_KEYPAIR if set.' },
          from_token:      { type: 'string', description: 'Token to sell (symbol or mint)' },
          to_token:        { type: 'string', description: 'Token to buy (symbol or mint)' },
          amount_lamports: { type: 'number', description: 'Amount in lamports (or smallest token unit) of from_token to swap' },
          min_amount_out_lamports: { type: 'number', description: 'Minimum acceptable output (slippage guard). 0 disables.' },
          description:     { type: 'string', description: 'Proposal description (≤256 chars)' },
        },
        required: ['vault_pubkey', 'from_token', 'to_token', 'amount_lamports'],
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
      description: 'Build the on-chain `deposit` transaction. New members are created via init_if_needed on first deposit. Returns base64 unsigned tx for the user to sign, or signs+submits if AGENT_KEYPAIR is the user.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey: { type: 'string', description: 'Pot/vault public key' },
          user_wallet:  { type: 'string', description: 'Wallet that signs the deposit and gets the shares' },
          lamports:     { type: 'number', description: 'Deposit amount in lamports' },
          sol:          { type: 'number', description: 'Deposit amount in SOL (alternative to `lamports`)' },
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
      description: 'Get the top performing PotBot vaults from real on-chain state, ranked by a chosen metric.',
      inputSchema: {
        type: 'object',
        properties: {
          metric: { type: 'string', enum: ['tvl_lamports', 'tvl_sol', 'member_count', 'trade_count', 'total_volume_lamports'], description: 'Ranking metric (default: tvl_lamports)' },
          limit:  { type: 'number', description: 'Number of results (default 10)' },
        },
      },
    },
    {
      name: 'get_proposals',
      description: 'List on-chain governance proposals for a vault, decoded from ProposalAccount PDAs. Includes status, vote tally, proposer, and (for Swap) full swap params. Sorted by proposal_id desc.',
      inputSchema: {
        type: 'object',
        properties: {
          vault_pubkey: { type: 'string', description: 'Pot/vault public key' },
          status:       { type: 'string', enum: ['Active', 'Passed', 'Rejected', 'Executed', 'Expired'], description: 'Optional status filter' },
          limit:        { type: 'number', description: 'Max results (default 25)' },
        },
        required: ['vault_pubkey'],
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
    {
      name: 'get_market_analytics',
      description: 'Real market fundamentals for a token from CoinGecko + DefiLlama. Returns price, market cap, volume, %-changes (24h/7d/30d), ATH distance, FDV, plus derived signals: 30d realized volatility (annualized %), 14d RSI, and a trend label. Use this BEFORE proposing a swap so the rationale is grounded in real data.',
      inputSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Symbol (SOL, USDC, JUP, BONK, WIF, JITOSOL, MSOL, BTC, ETH) or known mint address' },
        },
        required: ['token'],
      },
    },
    {
      name: 'get_top_solana_protocols',
      description: 'Top Solana DeFi protocols by TVL from DefiLlama (Kamino, Marinade, Jito, Raydium, etc.) with 24h / 7d % TVL changes. Useful when picking a yield destination.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max protocols (default 20)' },
        },
      },
    },
    {
      name: 'get_protocol_stats',
      description: 'Detailed TVL stats for one DefiLlama protocol slug (e.g. "kamino", "marinade-finance", "jupiter").',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'DefiLlama protocol slug — see get_top_solana_protocols.' },
        },
        required: ['slug'],
      },
    },
    {
      name: 'get_social_sentiment',
      description: 'Aggregated Twitter + news sentiment for a token. Pulls top ~20 Twitter posts (LunarCrush, key-gated) and ~20 news headlines (CryptoPanic), scores each via VADER, and returns a bullish/bearish/neutral verdict with confidence + per-source breakdown. Use BEFORE creating a proposal to know which direction crypto-twitter is leaning.',
      inputSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Symbol or known mint. Same resolver as get_market_analytics.' },
        },
        required: ['token'],
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
        const sort       = (args?.sort as string) ?? 'member_count'
        const limit      = (args?.limit as number) ?? 25
        const publicOnly = args?.public_only !== false

        const onChain = await getAllPots()
        const conn = getConnection()

        // Fetch vault SOL balances in parallel
        const balances = await Promise.all(onChain.map(async p => {
          const [vault] = vaultPda(new PublicKey(p.pubkey))
          const lamports = await conn.getBalance(vault).catch(() => 0)
          return lamports
        }))

        const enriched = onChain.map((p, i) => ({
          pubkey: p.pubkey,
          name: p.name,
          emoji: p.emoji,
          authority: p.authority,
          is_public: p.is_public,
          tvl_sol: balances[i] / 1e9,
          tvl_lamports: balances[i],
          total_shares: p.total_shares,
          member_count: p.member_count,
          trade_count: p.trade_count,
          yield_strategy: p.yield_strategy,
          quorum_bps: p.quorum_bps,
          trade_level: p.trade_level,
          created_at: p.created_at,
          next_proposal_id: p.next_proposal_id,
          agent_pubkey: p.agent_pubkey,
        }))

        const filtered = enriched
          .filter(v => !publicOnly || v.is_public)
          .sort((a, b) => {
            const av = (a as any)[sort] ?? 0
            const bv = (b as any)[sort] ?? 0
            return (bv > av ? 1 : bv < av ? -1 : 0)
          })
          .slice(0, limit)

        return text({
          vaults: filtered,
          total: filtered.length,
          total_on_chain: onChain.length,
          sorted_by: sort,
          source: 'Solana RPC getProgramAccounts (PotAccount discriminator)',
          network: NETWORK,
          program_id: POT_VAULT_PROGRAM_ID.toBase58(),
        })
      }

      // ── get_vault_analytics ──────────────────────────────────────────────
      case 'get_vault_analytics': {
        const pubkey = args?.vault_pubkey as string
        if (!pubkey) throw new Error('vault_pubkey required')

        const potKey = new PublicKey(pubkey)
        const [vaultKey] = vaultPda(potKey)

        const [pot, vaultLamports, holdingsResult, pricesResult] = await Promise.all([
          readPotAccount(potKey),
          getVaultLamports(potKey),
          getSplHoldings(vaultKey.toBase58()),
          getJupiterPrices([MINTS.SOL]),
        ])

        if (!pot) {
          throw new Error(`No PotAccount found at ${pubkey}. Use list_vaults to discover real on-chain pots.`)
        }

        const { prices, warning: priceWarn } = pricesResult
        const solPrice = prices[MINTS.SOL] ?? 0
        const vaultSol = Number(vaultLamports) / 1e9
        const nav_sol_usd = vaultSol * solPrice

        // Price SPL holdings of the vault via Jupiter
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
        const nav_usd = nav_sol_usd + splValueUsd
        const warnings = [priceWarn, holdingsResult.warning, holdingPricesWarn].filter(Boolean)

        return text({
          pubkey,
          vault_pda:    vaultKey.toBase58(),
          name:         pot.name,
          emoji:        pot.emoji,
          authority:    pot.authority,
          is_public:    pot.is_public,
          yield_strategy: pot.yield_strategy,

          // Treasury (real on-chain)
          tvl_usd:      parseFloat(nav_usd.toFixed(2)),
          tvl_sol:      parseFloat(vaultSol.toFixed(4)),
          sol_price:    solPrice,
          spl_holdings: holdingsResult.holdings.map(h => ({
            ...h,
            price_usd: holdingPrices[h.mint] ?? null,
            value_usd: parseFloat(((holdingPrices[h.mint] ?? 0) * h.amount).toFixed(2)),
          })),
          spl_value_usd: parseFloat(splValueUsd.toFixed(2)),

          // Activity (real on-chain)
          member_count: pot.member_count,
          trade_count:  pot.trade_count,
          total_shares: pot.total_shares,
          total_volume_lamports: pot.total_volume_lamports,
          high_water_mark_lamports: pot.high_water_mark,
          next_proposal_id: pot.next_proposal_id,
          created_at:   pot.created_at,
          agent_pubkey: pot.agent_pubkey,

          // Governance (real on-chain)
          governance: {
            trade_level:    pot.trade_level,
            withdraw_level: pot.withdraw_level,
            quorum_bps:     pot.quorum_bps,
            vote_timeout_seconds: pot.vote_timeout_seconds,
            min_deposit_lamports: pot.min_deposit_lamports,
          },

          source: {
            pot_account:   'Solana RPC getAccountInfo + on-chain decode',
            vault_balance: 'Solana RPC getBalance(vault_pda)',
            spl_holdings:  'Solana RPC getTokenAccountsByOwner(vault_pda)',
            prices:        'Jupiter Price API v2',
            performance:   'PnL/APY/Sharpe not yet available — needs on-chain accounting (Q2 2026)',
          },
          network:    NETWORK,
          program_id: POT_VAULT_PROGRAM_ID.toBase58(),
          timestamp:  new Date().toISOString(),
          dapp_url:   `https://potbot.fun/pots/${pubkey}`,
          explorer_url: `https://explorer.solana.com/address/${pubkey}?cluster=${NETWORK}`,
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
        const { vault_pubkey, proposer_wallet, from_token, to_token, amount_lamports, min_amount_out_lamports, description } = args as any
        if (!vault_pubkey || !from_token || !to_token || !amount_lamports) {
          throw new Error('vault_pubkey, from_token, to_token, amount_lamports are required')
        }

        const fromMint = resolveMint(from_token)
        const toMint   = resolveMint(to_token)
        const potKey = new PublicKey(vault_pubkey)
        const pot = await readPotAccount(potKey)
        if (!pot) throw new Error(`No PotAccount at ${vault_pubkey}`)

        const agent = loadAgentKeypair()
        const proposer = proposer_wallet
          ? new PublicKey(proposer_wallet)
          : (agent?.publicKey ?? null)
        if (!proposer) throw new Error('proposer_wallet required (or set AGENT_KEYPAIR if the agent is itself a member)')

        const ix = buildCreateSwapProposalIx({
          pot: potKey,
          proposer,
          proposalId: BigInt(pot.next_proposal_id),
          fromMint: new PublicKey(fromMint),
          toMint: new PublicKey(toMint),
          amountInLamports: BigInt(amount_lamports),
          minAmountOutLamports: BigInt(min_amount_out_lamports ?? 0),
          description: description ?? `Swap ${from_token.toUpperCase()} → ${to_token.toUpperCase()}`,
        })

        const [proposalPdaKey] = proposalPda(potKey, BigInt(pot.next_proposal_id))

        // If agent is the proposer, sign and submit
        if (agent && agent.publicKey.equals(proposer)) {
          try {
            const sig = await sendIxs([ix], [agent])
            return text({
              action: 'create_swap_proposal',
              status: 'submitted',
              vault_pubkey,
              proposal_pubkey: proposalPdaKey.toBase58(),
              proposal_id: pot.next_proposal_id,
              proposer: proposer.toBase58(),
              from_mint: fromMint,
              to_mint: toMint,
              amount_in_lamports: amount_lamports,
              min_amount_out_lamports: min_amount_out_lamports ?? 0,
              signature: sig,
              explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`,
            })
          } catch (err: any) {
            throw new Error(`On-chain create_proposal failed: ${err.message ?? String(err)}`)
          }
        }

        // Otherwise: return base64 unsigned tx
        const { tx_b64, blockhash } = await unsignedTxBase64([ix], proposer)
        return text({
          action: 'create_swap_proposal',
          status: 'unsigned_tx',
          vault_pubkey,
          proposal_pubkey: proposalPdaKey.toBase58(),
          proposal_id: pot.next_proposal_id,
          proposer: proposer.toBase58(),
          from_mint: fromMint,
          to_mint: toMint,
          amount_in_lamports: amount_lamports,
          min_amount_out_lamports: min_amount_out_lamports ?? 0,
          description: description ?? `Swap ${from_token.toUpperCase()} → ${to_token.toUpperCase()}`,
          unsigned_tx_b64: tx_b64,
          recent_blockhash: blockhash,
          next_step: 'Have the proposer wallet sign the unsigned_tx_b64 (e.g. via Phantom partial-sign or PotBot dApp) and submit.',
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

      // ── get_market_analytics ─────────────────────────────────────────────
      case 'get_market_analytics': {
        const token = args?.token as string
        if (!token) throw new Error('token required')
        const { data, warning } = await getMarketAnalytics(token)
        return text({
          token: token.toUpperCase(),
          analytics: data,
          source: 'CoinGecko + derived signals',
          ...(warning ? { warnings: [warning] } : {}),
        })
      }

      // ── get_top_solana_protocols ─────────────────────────────────────────
      case 'get_top_solana_protocols': {
        const limit = (args?.limit as number) ?? 20
        const protocols = await getTopSolanaProtocols(limit)
        return text({
          protocols,
          total: protocols.length,
          source: 'DefiLlama /protocols (Solana chain filter)',
          updated_at: new Date().toISOString(),
        })
      }

      // ── get_protocol_stats ───────────────────────────────────────────────
      case 'get_protocol_stats': {
        const slug = args?.slug as string
        if (!slug) throw new Error('slug required')
        const stats = await getProtocolStats(slug)
        if (!stats) throw new Error(`No DefiLlama protocol with slug "${slug}"`)
        return text({ ...stats, source: 'DefiLlama /protocol/{slug}', updated_at: new Date().toISOString() })
      }

      // ── get_social_sentiment ─────────────────────────────────────────────
      case 'get_social_sentiment': {
        const token = args?.token as string
        if (!token) throw new Error('token required')
        const result = await getSocialSentiment(token)
        return text({
          ...result,
          method: 'VADER local + LunarCrush (if LUNARCRUSH_API_KEY set) + CryptoPanic (CRYPTOPANIC_API_KEY for higher rate limits). Top tweets weighted 60%, news 40%.',
        })
      }

      // ── join_strategy_vault (= deposit ix) ───────────────────────────────
      case 'join_strategy_vault': {
        const { vault_pubkey, user_wallet, lamports, sol } = args as any
        if (!vault_pubkey || !user_wallet) throw new Error('vault_pubkey and user_wallet required')
        if (!lamports && !sol) throw new Error('lamports or sol amount required')

        const potKey = new PublicKey(vault_pubkey)
        const userKey = new PublicKey(user_wallet)
        const pot = await readPotAccount(potKey)
        if (!pot) throw new Error(`No PotAccount at ${vault_pubkey}`)

        const lamportsBig = lamports != null
          ? BigInt(lamports)
          : BigInt(Math.round(Number(sol) * 1e9))

        if (lamportsBig < BigInt(pot.min_deposit_lamports)) {
          throw new Error(`Below min_deposit (${pot.min_deposit_lamports} lamports). You provided ${lamportsBig}.`)
        }

        const ix = buildDepositIx({ pot: potKey, depositor: userKey, lamports: lamportsBig })

        const agent = loadAgentKeypair()
        if (agent && agent.publicKey.equals(userKey)) {
          try {
            const sig = await sendIxs([ix], [agent])
            return text({
              action: 'deposit',
              status: 'submitted',
              vault_pubkey,
              user_wallet,
              lamports: lamportsBig.toString(),
              sol: Number(lamportsBig) / 1e9,
              signature: sig,
              explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`,
            })
          } catch (err: any) {
            throw new Error(`On-chain deposit failed: ${err.message ?? String(err)}`)
          }
        }

        const { tx_b64, blockhash } = await unsignedTxBase64([ix], userKey)
        return text({
          action: 'deposit',
          status: 'unsigned_tx',
          vault_pubkey,
          vault_name: pot.name,
          user_wallet,
          lamports: lamportsBig.toString(),
          sol: Number(lamportsBig) / 1e9,
          min_deposit_lamports: pot.min_deposit_lamports,
          is_public: pot.is_public,
          unsigned_tx_b64: tx_b64,
          recent_blockhash: blockhash,
          next_step: 'Have the user wallet sign the unsigned_tx_b64 (e.g. via Phantom partial-sign or PotBot dApp) and submit. Members are created via init_if_needed on first deposit.',
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
        const metric = (args?.metric as string) ?? 'tvl_lamports'
        const limit  = (args?.limit as number) ?? 10

        const onChain = await getAllPots()
        const conn = getConnection()

        const balances = await Promise.all(onChain.map(async p => {
          const [vault] = vaultPda(new PublicKey(p.pubkey))
          return await conn.getBalance(vault).catch(() => 0)
        }))

        const enriched = onChain.map((p, i) => ({
          pubkey: p.pubkey,
          name: p.name,
          emoji: p.emoji,
          authority: p.authority,
          is_public: p.is_public,
          tvl_sol: balances[i] / 1e9,
          tvl_lamports: balances[i],
          member_count: p.member_count,
          trade_count: p.trade_count,
          total_volume_lamports: Number(p.total_volume_lamports),
          yield_strategy: p.yield_strategy,
          created_at: p.created_at,
        }))

        const ranked = enriched
          .sort((a, b) => ((b as any)[metric] ?? 0) - ((a as any)[metric] ?? 0))
          .slice(0, limit)
          .map((v, i) => ({ rank: i + 1, ...v }))

        return text({
          leaderboard: ranked,
          metric,
          total_on_chain: onChain.length,
          source: 'Solana RPC getProgramAccounts (PotAccount discriminator)',
          network: NETWORK,
          updated_at: new Date().toISOString(),
        })
      }

      // ── get_proposals ────────────────────────────────────────────────────
      case 'get_proposals': {
        const { vault_pubkey, status, limit } = args as any
        if (!vault_pubkey) throw new Error('vault_pubkey required')

        const potKey = new PublicKey(vault_pubkey)
        let proposals = await getProposalsForPot(potKey)
        if (status) proposals = proposals.filter(p => p.status === status)
        const max = (limit as number) ?? 25
        const sliced = proposals.slice(0, max)

        return text({
          proposals: sliced,
          total: sliced.length,
          total_for_vault: proposals.length,
          vault_pubkey,
          source: 'Solana RPC getProgramAccounts (ProposalAccount discriminator) + on-chain decode',
          note: 'Only Swap proposal type fields are decoded in detail; other variants return type name only.',
          network: NETWORK,
          updated_at: new Date().toISOString(),
        })
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
  console.error(`🤖 PotBot MCP Server v${PKG_VERSION} running (stdio)`)
  console.error(`   API:     ${POTBOT_API}`)
  console.error(`   RPC:     ${RPC_URL}`)
  console.error(`   Network: ${NETWORK}`)
  console.error(`   Program: ${PROGRAM_ID}`)
}

main().catch(console.error)
