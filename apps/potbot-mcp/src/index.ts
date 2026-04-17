#!/usr/bin/env node
/**
 * PotBot MCP Server
 * 
 * Exposes PotBot vaults to AI agents via the Model Context Protocol.
 * AI agents can list vaults, get analytics, create proposals, vote, and manage
 * AI agent rules — all through a standardized MCP interface.
 * 
 * Usage:
 *   npx @potbot/mcp
 *   # or via claude_desktop_config.json:
 *   { "command": "npx", "args": ["-y", "@potbot/mcp"] }
 */
import 'dotenv/config'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

const RPC_URL = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
const PROGRAM_ID = process.env.PROGRAM_ID ?? 'ED4zhABMV97obJSD5bzasUPaNVmc3qwA3WhwqoGVCDvH'
const API_URL = process.env.API_URL ?? 'http://localhost:3001'

const connection = new Connection(RPC_URL, 'confirmed')

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_pots',
    description: 'List all PotBot strategy vaults on Solana. Returns vault name, balance, members, tamagotchi level, and performance data.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max vaults to return (default: 20)', default: 20 },
        public_only: { type: 'boolean', description: 'Only list public vaults', default: false },
      },
    },
  },
  {
    name: 'get_pot_analytics',
    description: 'Get detailed analytics for a specific vault: NAV, PnL, APY, positions, and member stats.',
    inputSchema: {
      type: 'object',
      properties: {
        pot_pubkey: { type: 'string', description: 'Base58 public key of the vault' },
      },
      required: ['pot_pubkey'],
    },
  },
  {
    name: 'get_prices',
    description: 'Get current token prices in USD via Jupiter Price API v2. Supports SOL, USDC, USDT, BONK, JitoSOL, and any Solana token by mint address.',
    inputSchema: {
      type: 'object',
      properties: {
        mints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of Solana token mint addresses. Use "SOL" for native SOL.',
        },
      },
      required: ['mints'],
    },
  },
  {
    name: 'create_proposal',
    description: 'Create a governance proposal in a vault (swap, yield deposit, settings change). Members must vote to approve before execution.',
    inputSchema: {
      type: 'object',
      properties: {
        pot_pubkey: { type: 'string', description: 'Vault public key' },
        proposal_type: {
          type: 'string',
          enum: ['swap', 'yield_deposit', 'yield_withdraw', 'change_settings', 'transfer_funds'],
          description: 'Type of proposal',
        },
        description: { type: 'string', description: 'Human-readable description of what this proposal does' },
        params: {
          type: 'object',
          description: 'Proposal-specific parameters. For swap: {from_mint, to_mint, amount_in, min_amount_out}. For yield_deposit: {protocol, amount}.',
        },
      },
      required: ['pot_pubkey', 'proposal_type', 'description', 'params'],
    },
  },
  {
    name: 'vote_on_proposal',
    description: 'Vote YES or NO on an active governance proposal in a vault.',
    inputSchema: {
      type: 'object',
      properties: {
        pot_pubkey: { type: 'string', description: 'Vault public key' },
        proposal_id: { type: 'number', description: 'Proposal ID to vote on' },
        vote: { type: 'string', enum: ['yes', 'no'], description: 'Your vote' },
        reason: { type: 'string', description: 'Optional reason for your vote' },
      },
      required: ['pot_pubkey', 'proposal_id', 'vote'],
    },
  },
  {
    name: 'join_vault',
    description: 'Join a strategy vault by depositing SOL. Returns the transaction that must be signed and submitted.',
    inputSchema: {
      type: 'object',
      properties: {
        pot_pubkey: { type: 'string', description: 'Vault public key' },
        amount_sol: { type: 'number', description: 'Amount of SOL to deposit' },
        referrer: { type: 'string', description: 'Optional referrer wallet address (earns 20% referral commission)' },
      },
      required: ['pot_pubkey', 'amount_sol'],
    },
  },
  {
    name: 'get_yield_rates',
    description: 'Get current DeFi yield opportunities on Solana from Kamino, Drift, Jito, and Marinade.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Filter by token symbol (e.g. SOL, USDC)' },
        risk: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by risk level' },
        min_apy: { type: 'number', description: 'Minimum APY percentage' },
      },
    },
  },
  {
    name: 'get_agent_rules',
    description: 'Get the AI automation rules configured for a vault\'s AI agent.',
    inputSchema: {
      type: 'object',
      properties: {
        pot_pubkey: { type: 'string', description: 'Vault public key' },
      },
      required: ['pot_pubkey'],
    },
  },
  {
    name: 'update_agent_rules',
    description: 'Update the AI automation rules for a vault. Rules define when the agent auto-proposes swaps, DCA buys, or yield deposits.',
    inputSchema: {
      type: 'object',
      properties: {
        pot_pubkey: { type: 'string', description: 'Vault public key' },
        rules: {
          type: 'array',
          description: 'Array of agent rules',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              enabled: { type: 'boolean' },
              trigger: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['price_above', 'price_below', 'time_interval', 'pnl_above', 'pnl_below'] },
                  threshold: { type: 'number' },
                  interval: { type: 'number' },
                  token: { type: 'string' },
                },
                required: ['type'],
              },
              action: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['propose_swap', 'dca_buy', 'yield_deposit', 'vote_yes', 'alert'] },
                  amount: { type: 'number' },
                  token: { type: 'string' },
                  toToken: { type: 'string' },
                },
                required: ['type'],
              },
              cooldownMinutes: { type: 'number' },
            },
            required: ['id', 'name', 'enabled', 'trigger', 'action', 'cooldownMinutes'],
          },
        },
      },
      required: ['pot_pubkey', 'rules'],
    },
  },
]

// ─── Helper: call PotBot API ──────────────────────────────────────────────────

async function callApi(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json()
}

// Resolve common token symbols to mint addresses
const TOKEN_MINTS: Record<string, string> = {
  SOL:     'So11111111111111111111111111111111111111112',
  USDC:    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT:    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK:    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JITOSOL: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  MSOL:    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  ETH:     '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
  JUP:     'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY:     '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
}

function resolveMint(tokenOrMint: string): string {
  return TOKEN_MINTS[tokenOrMint.toUpperCase()] ?? tokenOrMint
}

// ─── Tool Handlers ─────────────────────────────────────────────────────────

async function handleListPots(args: Record<string, unknown>) {
  const limit = Number(args.limit ?? 20)

  // Try to fetch from on-chain program
  try {
    const programAccounts = await connection.getProgramAccounts(
      new PublicKey(PROGRAM_ID),
      { dataSlice: { offset: 0, length: 0 } }
    )
    // Just return pubkeys for now — full deserialization needs IDL
    const pubkeys = programAccounts.slice(0, limit).map(a => a.pubkey.toBase58())
    return {
      source: 'on-chain',
      count: pubkeys.length,
      pots: pubkeys.map(pubkey => ({ pubkey, note: 'Use get_pot_analytics for details' })),
      programId: PROGRAM_ID,
      cluster: RPC_URL.includes('devnet') ? 'devnet' : 'mainnet-beta',
    }
  } catch {
    // Program not deployed yet — return mock data for demo
    return {
      source: 'mock',
      note: 'Program not yet deployed on this cluster. Showing demo data.',
      count: 3,
      pots: [
        { pubkey: 'DEMO1111111111111111111111111111111111111111', name: '🚀 Alpha Vault', balance: 12.5, memberCount: 8, tamagotchiLevel: 2, pnl30d: '+18.4%' },
        { pubkey: 'DEMO2222222222222222222222222222222222222222', name: '🌊 DeFi Degen', balance: 45.2, memberCount: 15, tamagotchiLevel: 3, pnl30d: '+31.2%' },
        { pubkey: 'DEMO3333333333333333333333333333333333333333', name: '🛡️ Safe Harbor', balance: 8.1, memberCount: 5, tamagotchiLevel: 1, pnl30d: '+6.8%' },
      ],
    }
  }
}

async function handleGetPotAnalytics(args: Record<string, unknown>) {
  const pubkey = args.pot_pubkey as string
  if (!pubkey) throw new McpError(ErrorCode.InvalidParams, 'pot_pubkey is required')

  try {
    new PublicKey(pubkey)
  } catch {
    throw new McpError(ErrorCode.InvalidParams, `Invalid public key: ${pubkey}`)
  }

  try {
    const data = await callApi(`/analytics/${pubkey}`)
    return data
  } catch {
    // Return mock analytics if API is down
    const solPrice = 150
    const lamports = await connection.getBalance(new PublicKey(pubkey)).catch(() => 0)
    return {
      pubkey,
      navUsd: (lamports / LAMPORTS_PER_SOL) * solPrice,
      solBalance: lamports / LAMPORTS_PER_SOL,
      solBalanceUsd: (lamports / LAMPORTS_PER_SOL) * solPrice,
      pnlUsd: 0,
      pnlPct: 0,
      apy30d: 0,
      apy7d: 0,
      positions: [],
      updatedAt: Date.now(),
      note: 'API offline — showing on-chain balance only',
    }
  }
}

async function handleGetPrices(args: Record<string, unknown>) {
  const rawMints = args.mints as string[]
  if (!Array.isArray(rawMints) || rawMints.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'mints must be a non-empty array')
  }
  const mints = rawMints.map(resolveMint)

  const data = await callApi(`/prices?ids=${mints.join(',')}`)
  return {
    prices: data.prices,
    symbols: Object.fromEntries(
      rawMints.map((sym, i) => [sym, {
        mint: mints[i],
        priceUsd: data.prices[mints[i]] ?? null
      }])
    ),
    ts: data.ts,
  }
}

async function handleCreateProposal(args: Record<string, unknown>) {
  const { pot_pubkey, proposal_type, description, params } = args as {
    pot_pubkey: string
    proposal_type: string
    description: string
    params: Record<string, unknown>
  }

  // Validate
  try { new PublicKey(pot_pubkey) } catch {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid pot_pubkey')
  }

  // Return instruction data — actual signing must be done by the agent's wallet
  return {
    status: 'prepared',
    potPubkey: pot_pubkey,
    proposalType: proposal_type,
    description,
    params,
    note: 'To submit: sign and send the createProposal instruction via @potbot/sdk. Members must vote to approve before execution.',
    sdkExample: [
      `import { PotSDK } from '@potbot/sdk'`,
      `const sdk = new PotSDK({ rpcUrl: '${RPC_URL}', wallet })`,
      `const tx = await sdk.createProposal('${pot_pubkey}', {`,
      `  type: '${proposal_type}',`,
      `  description: '${description}',`,
      `  params: ${JSON.stringify(params, null, 2)}`,
      `})`,
    ].join('\n'),
  }
}

async function handleVoteOnProposal(args: Record<string, unknown>) {
  const { pot_pubkey, proposal_id, vote, reason } = args as {
    pot_pubkey: string
    proposal_id: number
    vote: 'yes' | 'no'
    reason?: string
  }

  return {
    status: 'prepared',
    potPubkey: pot_pubkey,
    proposalId: proposal_id,
    vote,
    reason: reason ?? null,
    note: 'To submit: sign and send the vote instruction via @potbot/sdk.',
    sdkExample: [
      `import { PotSDK } from '@potbot/sdk'`,
      `const sdk = new PotSDK({ rpcUrl: '${RPC_URL}', wallet })`,
      `await sdk.vote('${pot_pubkey}', ${proposal_id}, ${vote === 'yes' ? 'true' : 'false'})`,
    ].join('\n'),
  }
}

async function handleJoinVault(args: Record<string, unknown>) {
  const { pot_pubkey, amount_sol, referrer } = args as {
    pot_pubkey: string
    amount_sol: number
    referrer?: string
  }

  try { new PublicKey(pot_pubkey) } catch {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid pot_pubkey')
  }
  if (!amount_sol || amount_sol <= 0) {
    throw new McpError(ErrorCode.InvalidParams, 'amount_sol must be positive')
  }

  return {
    status: 'prepared',
    potPubkey: pot_pubkey,
    amountLamports: Math.floor(amount_sol * LAMPORTS_PER_SOL),
    amountSol: amount_sol,
    referrer: referrer ?? null,
    note: 'To submit: sign and send the deposit instruction via @potbot/sdk.',
    sdkExample: [
      `import { PotSDK } from '@potbot/sdk'`,
      `const sdk = new PotSDK({ rpcUrl: '${RPC_URL}', wallet })`,
      `await sdk.deposit('${pot_pubkey}', ${Math.floor(amount_sol * LAMPORTS_PER_SOL)}${referrer ? `, '${referrer}'` : ''})`,
    ].join('\n'),
  }
}

async function handleGetYieldRates(args: Record<string, unknown>) {
  const { token, risk, min_apy } = args as { token?: string; risk?: string; min_apy?: number }

  let path = '/yield/opportunities'
  const params = new URLSearchParams()
  if (token) params.set('token', token)
  if (risk) params.set('risk', risk)
  if (params.toString()) path += '?' + params.toString()

  const data = await callApi(path)
  let opportunities = data.opportunities
  if (min_apy != null) opportunities = opportunities.filter((o: any) => o.apy >= min_apy)

  return {
    opportunities,
    bestApy: opportunities[0]?.apy ?? 0,
    bestProtocol: opportunities[0]?.protocol ?? null,
    filters: { token, risk, min_apy },
    count: opportunities.length,
  }
}

async function handleGetAgentRules(args: Record<string, unknown>) {
  const pubkey = args.pot_pubkey as string
  if (!pubkey) throw new McpError(ErrorCode.InvalidParams, 'pot_pubkey is required')
  return callApi(`/agent/${pubkey}/rules`)
}

async function handleUpdateAgentRules(args: Record<string, unknown>) {
  const { pot_pubkey, rules } = args as { pot_pubkey: string; rules: unknown[] }
  if (!pot_pubkey) throw new McpError(ErrorCode.InvalidParams, 'pot_pubkey is required')
  if (!Array.isArray(rules)) throw new McpError(ErrorCode.InvalidParams, 'rules must be an array')
  return callApi(`/agent/${pot_pubkey}/rules`, 'POST', { rules })
}

// ─── MCP Server Setup ─────────────────────────────────────────────────────

const server = new Server(
  { name: 'potbot-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params

  try {
    let result: unknown

    switch (name) {
      case 'list_pots':          result = await handleListPots(args); break
      case 'get_pot_analytics':  result = await handleGetPotAnalytics(args); break
      case 'get_prices':         result = await handleGetPrices(args); break
      case 'create_proposal':    result = await handleCreateProposal(args); break
      case 'vote_on_proposal':   result = await handleVoteOnProposal(args); break
      case 'join_vault':         result = await handleJoinVault(args); break
      case 'get_yield_rates':    result = await handleGetYieldRates(args); break
      case 'get_agent_rules':    result = await handleGetAgentRules(args); break
      case 'update_agent_rules': result = await handleUpdateAgentRules(args); break
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (e) {
    if (e instanceof McpError) throw e
    throw new McpError(ErrorCode.InternalError, String(e))
  }
})

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
console.error('[potbot-mcp] Server started — listening for MCP requests')
