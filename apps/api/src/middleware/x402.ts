/**
 * x402 Payment Middleware — gates API endpoints behind USDC micropayments
 *
 * Protocol: https://x402.org
 * Network:   Solana (USDC SPL token)
 * Price:     0.001 USDC per request (configurable)
 *
 * Flow:
 *   1. Client requests endpoint without X-PAYMENT header
 *   2. Server responds 402 with payment requirements JSON
 *   3. Client sends USDC on-chain to PAYMENT_ADDRESS
 *   4. Client retries with `X-PAYMENT: <base64(payload)>` header
 *   5. Server verifies tx on Solana + checks nonce (replay protection)
 *   6. Server responds 200 + `X-PAYMENT-RESPONSE: <settlement>`
 *
 * Set env vars to enable:
 *   X402_ENABLED=true
 *   X402_PAYMENT_ADDRESS=<your USDC token account>
 *   X402_RPC_URL=https://api.mainnet-beta.solana.com
 */
import type { Context, MiddlewareHandler, Next } from 'hono'
import { Connection, PublicKey } from '@solana/web3.js'

// ── Constants ────────────────────────────────────────────────────────────────

const USDC_MINT       = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_DECIMALS   = 6
const DEFAULT_PRICE   = 1_000                                   // 0.001 USDC (micro-units)
const NONCE_TTL_MS    = 10 * 60_000                             // 10 minutes
const TIMEOUT_SECONDS = 300

// In-memory nonce store — prevents replay attacks.
// Replace with Redis set for multi-instance deployments.
const usedNonces = new Map<string, number>()                    // nonce → expiresAt

// Prune expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [nonce, exp] of usedNonces) {
    if (now > exp) usedNonces.delete(nonce)
  }
}, 5 * 60_000)

// ── Types ────────────────────────────────────────────────────────────────────

export interface X402Options {
  /** Price in USDC micro-units (default: 1000 = 0.001 USDC) */
  price?: number
  /** Human-readable description shown to clients */
  description?: string
}

interface X402Payload {
  scheme:    'exact'
  network:   string
  payload: {
    txSignature:   string
    nonce:         string
    recipient:     string
    amount:        string
    asset:         string
    payerAddress?: string
  }
}

interface PaymentRequirements {
  x402Version: 1
  accepts: Array<{
    scheme:              'exact'
    network:             string
    maxAmountRequired:   string
    resource:            string
    description:         string
    mimeType:            string
    payTo:               string
    maxTimeoutSeconds:   number
    asset:               string
    extra:               { name: string; decimals: number }
  }>
}

// ── Middleware factory ────────────────────────────────────────────────────────

export function x402Gate(options: X402Options = {}): MiddlewareHandler {
  const priceAmount = options.price ?? DEFAULT_PRICE
  const description = options.description ?? 'PotBot Analytics API'

  return async (c: Context, next: Next) => {
    // Feature flag — set X402_ENABLED=true to activate
    if (!process.env.X402_ENABLED || process.env.X402_ENABLED !== 'true') {
      return next()
    }

    const paymentAddress = process.env.X402_PAYMENT_ADDRESS
    if (!paymentAddress) {
      console.warn('[x402] X402_PAYMENT_ADDRESS not set — skipping gate')
      return next()
    }

    const paymentHeader = c.req.header('X-PAYMENT')

    if (!paymentHeader) {
      return respondPaymentRequired(c, {
        priceAmount,
        paymentAddress,
        resource: c.req.url,
        description,
      })
    }

    // Verify payment proof
    const result = await verifyPayment(paymentHeader, {
      priceAmount,
      paymentAddress,
    })

    if (!result.ok) {
      c.header('WWW-Authenticate', 'x402')
      return c.json({ error: result.error ?? 'Payment verification failed' }, 402)
    }

    // Mark nonce as used
    usedNonces.set(result.nonce!, Date.now() + NONCE_TTL_MS)

    await next()

    // Settlement response header
    const settlement = {
      success:     true,
      settled:     true,
      txSignature: result.txSignature,
      network:     getNetwork(),
      ts:          Date.now(),
    }
    c.header('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify(settlement)).toString('base64'))
  }
}

// ── 402 Response ─────────────────────────────────────────────────────────────

function respondPaymentRequired(
  c: Context,
  opts: { priceAmount: number; paymentAddress: string; resource: string; description: string }
): Response {
  const requirements: PaymentRequirements = {
    x402Version: 1,
    accepts: [{
      scheme:            'exact',
      network:           getNetwork(),
      maxAmountRequired: String(opts.priceAmount),
      resource:          opts.resource,
      description:       opts.description,
      mimeType:          'application/json',
      payTo:             opts.paymentAddress,
      maxTimeoutSeconds: TIMEOUT_SECONDS,
      asset:             USDC_MINT,
      extra:             { name: 'USDC', decimals: USDC_DECIMALS },
    }],
  }

  c.header('WWW-Authenticate', 'x402')
  c.header('Content-Type', 'application/json')
  return c.json(requirements, 402)
}

// ── Payment Verification ──────────────────────────────────────────────────────

interface VerifyResult {
  ok:           boolean
  nonce?:       string
  txSignature?: string
  error?:       string
}

async function verifyPayment(
  rawHeader: string,
  opts: { priceAmount: number; paymentAddress: string }
): Promise<VerifyResult> {
  // 1. Decode base64 payload
  let payload: X402Payload
  try {
    const decoded = Buffer.from(rawHeader, 'base64').toString('utf-8')
    payload = JSON.parse(decoded) as X402Payload
  } catch {
    return { ok: false, error: 'Invalid payment header encoding' }
  }

  if (payload.scheme !== 'exact') {
    return { ok: false, error: `Unsupported payment scheme: ${payload.scheme}` }
  }

  const { txSignature, nonce, recipient, amount, asset } = payload.payload ?? {}

  if (!txSignature || !nonce || !recipient || !amount || !asset) {
    return { ok: false, error: 'Missing required payment payload fields' }
  }

  // 2. Replay protection
  if (usedNonces.has(nonce)) {
    return { ok: false, error: 'Nonce already used (replay detected)' }
  }

  // 3. Validate payment parameters
  if (asset !== USDC_MINT) {
    return { ok: false, error: `Wrong asset: expected USDC (${USDC_MINT})` }
  }
  if (recipient.toLowerCase() !== opts.paymentAddress.toLowerCase()) {
    return { ok: false, error: 'Wrong payment recipient' }
  }
  if (Number(amount) < opts.priceAmount) {
    return { ok: false, error: `Insufficient payment: ${amount} < ${opts.priceAmount}` }
  }

  // 4. Verify on-chain
  const onChainOk = await verifyOnChain(txSignature, {
    recipient: opts.paymentAddress,
    minAmount: opts.priceAmount,
  })

  if (!onChainOk) {
    return { ok: false, error: 'On-chain verification failed' }
  }

  return { ok: true, nonce, txSignature }
}

async function verifyOnChain(
  txSignature: string,
  opts: { recipient: string; minAmount: number }
): Promise<boolean> {
  try {
    const rpcUrl = process.env.X402_RPC_URL
      ?? process.env.RPC_URL
      ?? 'https://api.mainnet-beta.solana.com'

    const conn = new Connection(rpcUrl, 'confirmed')

    const tx = await conn.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    })

    if (!tx || tx.meta?.err) return false

    // Scan for SPL token transfer to recipient
    const instructions = tx.transaction.message.instructions
    for (const ix of instructions) {
      if (!('parsed' in ix)) continue
      const parsed = ix.parsed
      if (!parsed || typeof parsed !== 'object') continue

      // transferChecked / transfer
      if (
        (parsed.type === 'transferChecked' || parsed.type === 'transfer') &&
        parsed.info
      ) {
        const { destination, tokenAmount, mint } = parsed.info
        if (
          mint === USDC_MINT &&
          destination?.toLowerCase() === opts.recipient.toLowerCase() &&
          Number(tokenAmount?.amount ?? 0) >= opts.minAmount
        ) {
          return true
        }
      }
    }

    // Also check inner instructions
    for (const inner of tx.meta?.innerInstructions ?? []) {
      for (const ix of inner.instructions) {
        if (!('parsed' in ix)) continue
        const parsed = (ix as any).parsed
        if (!parsed || typeof parsed !== 'object') continue
        if (
          (parsed.type === 'transferChecked' || parsed.type === 'transfer') &&
          parsed.info?.mint === USDC_MINT &&
          parsed.info?.destination?.toLowerCase() === opts.recipient.toLowerCase() &&
          Number(parsed.info?.tokenAmount?.amount ?? parsed.info?.amount ?? 0) >= opts.minAmount
        ) {
          return true
        }
      }
    }

    return false
  } catch (e) {
    console.error('[x402] On-chain verification error:', e)
    // Fail open in devnet/demo mode
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[x402] Non-production mode — accepting unverified payment')
      return true
    }
    return false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNetwork(): string {
  const rpcUrl = process.env.X402_RPC_URL ?? process.env.RPC_URL ?? ''
  if (rpcUrl.includes('devnet'))  return 'solana-devnet'
  if (rpcUrl.includes('mainnet')) return 'solana-mainnet'
  return 'solana-mainnet'
}

// ── Pre-configured gates ──────────────────────────────────────────────────────

/** Standard gate: 0.001 USDC per analytics call */
export const analyticsGate = x402Gate({
  price:       1_000,
  description: 'PotBot Vault Analytics — NAV, PnL, APY, Sharpe',
})

/** Heavy gate: 0.005 USDC for AI agent operations */
export const agentGate = x402Gate({
  price:       5_000,
  description: 'PotBot AI Agent — rule execution & proposal creation',
})

/** Free tier — no payment required (for public price feeds) */
export const freeTier: MiddlewareHandler = (_c, next) => next()
