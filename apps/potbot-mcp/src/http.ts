#!/usr/bin/env node
/**
 * PotBot MCP HTTP Server — x402 micropayment mode
 *
 * Exposes PotBot MCP tools over HTTP+SSE so AI agents can call them
 * with an x402 USDC payment per request.
 *
 * Transport: HTTP/SSE (MCP 2025-11-05 spec)
 * Auth:      x402 — agent pays 0.001 USDC per analytics call
 * Activate:  X402_ENABLED=true npm start
 *
 * Endpoints:
 *   GET  /sse          — SSE stream for MCP messages
 *   POST /message      — MCP JSON-RPC messages
 *   GET  /health       — health check
 *   GET  /mcp          — server info + tool list (human-readable)
 */

import http from 'http'
import { URL } from 'url'

// ── Config ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3002', 10)
const X402_ENABLED = process.env.X402_ENABLED === 'true'
const X402_PRICE_USDC = parseFloat(process.env.X402_PRICE_USDC ?? '0.001')
const POTBOT_API = process.env.POTBOT_API_URL ?? 'https://api.potbot.fun'
const NETWORK = process.env.SOLANA_NETWORK ?? 'devnet'
const USDC_RECEIVER = process.env.X402_RECEIVER_WALLET ?? ''
const RPC_URL = process.env.SOLANA_RPC_URL ?? (NETWORK === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com')

// USDC mint (mainnet); for devnet x402 demo we still validate on-chain transfer
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

// Cache verified payment signatures so a single tx can't be reused (replay protection)
const SEEN_PAYMENTS = new Set<string>()

// Paid tools (require x402 payment)
const PAID_TOOLS = new Set([
  'get_vault_analytics',
  'get_yield_rates',
  'get_leaderboard',
])

// ── x402 verification ─────────────────────────────────────────────────────
interface X402Payment {
  txSignature: string
  amount_usdc: number
  receiver: string
  payer: string
}

async function rpcCall(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = (await res.json()) as any
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`)
  return json.result
}

async function verifyX402Payment(header: string | undefined): Promise<{
  valid: boolean
  error?: string
  payment?: X402Payment
}> {
  if (!header) return { valid: false, error: 'Missing X-402-Payment header' }

  let payload: X402Payment
  try {
    const payloadStr = Buffer.from(header, 'base64').toString('utf-8')
    payload = JSON.parse(payloadStr) as X402Payment
  } catch {
    return { valid: false, error: 'Failed to parse payment payload' }
  }

  if (!payload.txSignature) return { valid: false, error: 'Missing txSignature in payment payload' }
  if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(payload.txSignature)) {
    return { valid: false, error: 'Invalid tx signature format' }
  }
  if (payload.amount_usdc < X402_PRICE_USDC) {
    return { valid: false, error: `Insufficient payment: ${payload.amount_usdc} USDC < ${X402_PRICE_USDC} USDC required` }
  }
  if (USDC_RECEIVER && payload.receiver !== USDC_RECEIVER) {
    return { valid: false, error: 'Payment sent to wrong receiver' }
  }
  if (SEEN_PAYMENTS.has(payload.txSignature)) {
    return { valid: false, error: 'Payment signature already used (replay)' }
  }

  // ── On-chain verify ─────────────────────────────────────────────────────
  let tx: any
  try {
    tx = await rpcCall('getTransaction', [
      payload.txSignature,
      { commitment: 'confirmed', encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
    ])
  } catch (err: any) {
    return { valid: false, error: `RPC lookup failed: ${err.message ?? String(err)}` }
  }
  if (!tx) return { valid: false, error: 'Transaction not found on-chain (may be unconfirmed)' }
  if (tx.meta?.err) return { valid: false, error: `On-chain tx failed: ${JSON.stringify(tx.meta.err)}` }

  // Verify a USDC transfer to USDC_RECEIVER for at least X402_PRICE_USDC
  if (USDC_RECEIVER) {
    const pre = (tx.meta?.preTokenBalances ?? []) as any[]
    const post = (tx.meta?.postTokenBalances ?? []) as any[]

    const findReceiverUsdcBalance = (arr: any[]) =>
      arr.find(b => b.owner === USDC_RECEIVER && b.mint === USDC_MINT)

    const preBal = findReceiverUsdcBalance(pre)
    const postBal = findReceiverUsdcBalance(post)
    const preUi = preBal?.uiTokenAmount?.uiAmount ?? 0
    const postUi = postBal?.uiTokenAmount?.uiAmount ?? 0
    const delta = postUi - preUi

    if (delta < X402_PRICE_USDC) {
      return { valid: false, error: `On-chain USDC delta to receiver is ${delta}, expected >= ${X402_PRICE_USDC}` }
    }
  }

  SEEN_PAYMENTS.add(payload.txSignature)
  // Cap cache size — keep last 10k signatures
  if (SEEN_PAYMENTS.size > 10_000) {
    const first = SEEN_PAYMENTS.values().next().value
    if (first) SEEN_PAYMENTS.delete(first)
  }

  return { valid: true, payment: payload }
}

// ── SSE clients ───────────────────────────────────────────────────────────
const clients = new Map<string, http.ServerResponse>()

function sendSSE(res: http.ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// ── Tool dispatcher (import logic from index.ts) ──────────────────────────
// Minimal inline implementations for HTTP transport
const JUP_PRICE_URL = 'https://api.jup.ag/price/v2'
const MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7',
  WIF: 'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u',
}

function resolveMint(t: string): string {
  return MINTS[t.toUpperCase()] ?? t
}

async function getJupiterPrices(mints: string[]): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${JUP_PRICE_URL}?ids=${mints.join(',')}`)
    if (!res.ok) return {}
    const json = (await res.json()) as any
    const result: Record<string, number> = {}
    for (const [mint, data] of Object.entries<any>(json.data ?? {})) {
      result[mint] = data.price ?? 0
    }
    return result
  } catch {
    return {}
  }
}

async function getDefiLlamaSolanaYields(): Promise<Array<{
  protocol: string; symbol: string; apy: number; tvl_usd: number; risk: 'low' | 'medium' | 'high'; pool_id: string; url: string;
}>> {
  try {
    const res = await fetch('https://yields.llama.fi/pools')
    if (!res.ok) return []
    const json = (await res.json()) as any
    return (json.data ?? [])
      .filter((p: any) => p.chain === 'Solana' && typeof p.apy === 'number' && p.tvlUsd > 100_000)
      .map((p: any) => ({
        protocol: p.project,
        symbol: p.symbol,
        apy: parseFloat(p.apy.toFixed(2)),
        tvl_usd: Math.round(p.tvlUsd),
        risk: (p.ilRisk === 'yes' || p.apy > 30 ? 'high' : p.apy > 10 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
        pool_id: p.pool,
        url: `https://defillama.com/yields/pool/${p.pool}`,
      }))
      .sort((a: any, b: any) => b.tvl_usd - a.tvl_usd)
  } catch {
    return []
  }
}

const MOCK_VAULTS = [
  { pubkey: 'PotXALPHA11111111111111111111111111111111111', name: 'Alpha Fund', strategy: 'Trend', members: 8, tvl_sol: 45.2, pnl: 12.3, apy: 28.7, win_rate: 0.67, sharpe: 1.42, is_public: true },
  { pubkey: 'PotWHALE111111111111111111111111111111111111', name: 'Whale DAO', strategy: 'DCA', members: 24, tvl_sol: 210.8, pnl: 8.1, apy: 18.4, win_rate: 0.72, sharpe: 1.85, is_public: true },
  { pubkey: 'PotYIELD11111111111111111111111111111111111', name: 'Yield Farmers', strategy: 'Yield', members: 12, tvl_sol: 88.4, pnl: 6.2, apy: 34.1, win_rate: 0.81, sharpe: 2.10, is_public: true },
]

const YIELD_RATES = [
  { protocol: 'Kamino Lend', risk: 'low', apy_min: 3.2, apy_max: 6.1, asset: 'SOL', tvl_m: 480 },
  { protocol: 'Drift Perps LP', risk: 'high', apy_min: 22.1, apy_max: 54.7, asset: 'SOL', tvl_m: 140 },
  { protocol: 'Jito MEV', risk: 'high', apy_min: 18.3, apy_max: 42.1, asset: 'jitoSOL', tvl_m: 890 },
]

async function dispatchTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'list_vaults': {
      const sort = (args.sort as string) ?? 'pnl'
      const limit = (args.limit as number) ?? 10
      const vaults = [...MOCK_VAULTS].sort((a: any, b: any) => (b[sort] ?? 0) - (a[sort] ?? 0)).slice(0, limit)
      return { vaults, total: vaults.length, sorted_by: sort, network: NETWORK }
    }
    case 'get_vault_analytics': {
      const pubkey = args.vault_pubkey as string
      const prices = await getJupiterPrices([MINTS.SOL])
      const solPrice = prices[MINTS.SOL] ?? 150
      const meta = MOCK_VAULTS.find(v => v.pubkey === pubkey)
      return { pubkey, name: meta?.name ?? 'Unknown', nav_usd: (meta?.tvl_sol ?? 0) * solPrice, pnl_pct: meta?.pnl ?? 0, apy_pct: meta?.apy ?? 0, win_rate: meta?.win_rate ?? 0, sharpe: meta?.sharpe ?? 0, network: NETWORK }
    }
    case 'get_token_prices': {
      const tokens = (args.tokens as string[]) ?? ['SOL']
      const mints = tokens.map(t => resolveMint(t))
      const prices = await getJupiterPrices(mints)
      return { prices: tokens.map((token, i) => ({ token: token.toUpperCase(), mint: mints[i], price_usd: prices[mints[i]] ?? null, source: 'Jupiter Price API v2' })), timestamp: new Date().toISOString() }
    }
    case 'get_yield_rates': {
      const risk = args.risk_level as string | undefined
      const limit = (args.limit as number) ?? 25
      const live = await getDefiLlamaSolanaYields()
      if (live.length > 0) {
        const filtered = (risk ? live.filter(p => p.risk === risk) : live).slice(0, limit)
        return {
          yield_rates: filtered,
          total: filtered.length,
          source: 'DefiLlama yields.llama.fi/pools (Solana, TVL > $100k)',
          updated_at: new Date().toISOString(),
        }
      }
      const rates = risk ? YIELD_RATES.filter(r => r.risk === risk) : YIELD_RATES
      return { yield_rates: rates, source: 'static fallback', updated_at: new Date().toISOString() }
    }
    case 'get_leaderboard': {
      const metric = (args.metric as string) ?? 'pnl'
      const limit = (args.limit as number) ?? 10
      const ranked = [...MOCK_VAULTS].sort((a: any, b: any) => (b[metric] ?? 0) - (a[metric] ?? 0)).slice(0, limit).map((v, i) => ({ rank: i + 1, ...v }))
      return { leaderboard: ranked, metric, network: NETWORK }
    }
    default:
      throw new Error(`Tool not available in HTTP mode: ${name}. Use stdio transport for full tool support.`)
  }
}

// ── Server info ───────────────────────────────────────────────────────────
const SERVER_INFO = {
  name: 'potbot-mcp',
  version: '0.3.0',
  transport: 'http+sse',
  x402_enabled: X402_ENABLED,
  x402_price_usdc: X402_ENABLED ? X402_PRICE_USDC : 0,
  x402_receiver: USDC_RECEIVER || '(not configured)',
  paid_tools: Array.from(PAID_TOOLS),
  free_tools: ['list_vaults', 'get_token_prices', 'create_swap_proposal', 'vote_on_proposal', 'join_strategy_vault', 'get_agent_rules'],
  mcp_spec: '2025-11-05',
  potbot_api: POTBOT_API,
  network: NETWORK,
  dapp: 'https://potbot.fun',
  docs: 'https://github.com/YD811/potbot-v2/blob/main/docs/MCP.md',
}

// ── HTTP Server ───────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-402-Payment, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // ── Health check ───────────────────────────────────────────────────────
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', ...SERVER_INFO, uptime: process.uptime() }))
    return
  }

  // ── Server info ────────────────────────────────────────────────────────
  if (url.pathname === '/mcp' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(SERVER_INFO, null, 2))
    return
  }

  // ── SSE stream ─────────────────────────────────────────────────────────
  if (url.pathname === '/sse' && req.method === 'GET') {
    const clientId = Date.now().toString()
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    // Send server info on connect
    sendSSE(res, 'connected', { server: SERVER_INFO })

    clients.set(clientId, res)
    req.on('close', () => clients.delete(clientId))
    return
  }

  // ── MCP message handler ────────────────────────────────────────────────
  if (url.pathname === '/message' && req.method === 'POST') {
    let body = ''
    for await (const chunk of req) {
      body += chunk
    }

    let message: any
    try {
      message = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }

    // Handle MCP protocol messages
    if (message.method === 'tools/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: [
            { name: 'list_vaults', description: 'List PotBot Strategy Vaults (free)', inputSchema: { type: 'object', properties: { sort: { type: 'string' }, limit: { type: 'number' } } } },
            { name: 'get_token_prices', description: 'Live token prices from Jupiter (free)', inputSchema: { type: 'object', properties: { tokens: { type: 'array', items: { type: 'string' } } }, required: ['tokens'] } },
            { name: 'get_vault_analytics', description: `Vault NAV, PnL, APY, Sharpe${X402_ENABLED ? ` [x402: ${X402_PRICE_USDC} USDC]` : ''}`, inputSchema: { type: 'object', properties: { vault_pubkey: { type: 'string' } }, required: ['vault_pubkey'] } },
            { name: 'get_yield_rates', description: `DeFi APY rates (Kamino/Drift/Jito)${X402_ENABLED ? ` [x402: ${X402_PRICE_USDC} USDC]` : ''}`, inputSchema: { type: 'object', properties: { risk_level: { type: 'string', enum: ['low', 'medium', 'high'] } } } },
            { name: 'get_leaderboard', description: `Top vaults by metric${X402_ENABLED ? ` [x402: ${X402_PRICE_USDC} USDC]` : ''}`, inputSchema: { type: 'object', properties: { metric: { type: 'string' }, limit: { type: 'number' } } } },
          ],
        },
      }))
      return
    }

    if (message.method === 'tools/call') {
      const toolName = message.params?.name as string
      const toolArgs = (message.params?.arguments ?? {}) as Record<string, unknown>

      // x402 gate for paid tools
      if (X402_ENABLED && PAID_TOOLS.has(toolName)) {
        const { valid, error, payment } = await verifyX402Payment(req.headers['x-402-payment'] as string | undefined)

        if (!valid) {
          res.writeHead(402, {
            'Content-Type': 'application/json',
            'X-402-Price-USDC': X402_PRICE_USDC.toString(),
            'X-402-Receiver': USDC_RECEIVER,
            'X-402-Network': 'solana-mainnet',
            'X-402-Asset': 'USDC',
            'X-402-Memo': `potbot-mcp:${toolName}`,
          })
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: 402,
              message: `Payment required: ${error}`,
              data: {
                required_payment: { amount_usdc: X402_PRICE_USDC, receiver: USDC_RECEIVER, network: 'solana-mainnet', asset: 'USDC' },
                send_payment_to: `https://solscan.io/account/${USDC_RECEIVER}`,
                then_retry_with: 'X-402-Payment: <base64({"txSignature":"...","amount_usdc":0.001,"receiver":"...","payer":"..."})>',
              },
            },
          }))
          return
        }

        console.log(`[x402] Tool: ${toolName}, paid: ${payment?.amount_usdc} USDC by ${payment?.payer}`)
      }

      try {
        const result = await dispatchTool(toolName, toolArgs)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
        }))
      } catch (err: any) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32000, message: err.message ?? String(err) },
        }))
      }
      return
    }

    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `Unknown method: ${message.method}` }))
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found', paths: ['/health', '/mcp', '/sse', '/message'] }))
})

server.listen(PORT, () => {
  console.log(`🌐 PotBot MCP HTTP Server v0.3.0`)
  console.log(`   Port:    ${PORT}`)
  console.log(`   x402:    ${X402_ENABLED ? `enabled (${X402_PRICE_USDC} USDC/paid-call)` : 'disabled'}`)
  console.log(`   Network: ${NETWORK}`)
  console.log(`   Docs:    https://github.com/YD811/potbot-v2/blob/main/docs/MCP.md`)
  if (X402_ENABLED && !USDC_RECEIVER) {
    console.warn('⚠️  X402_RECEIVER_WALLET not set — payments cannot be verified')
  }
})

export default server
