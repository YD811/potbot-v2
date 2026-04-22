/**
 * PotBot × Kora Integration
 * Gasless transaction support via Kora paymaster (Solana Foundation)
 *
 * Kora lets users pay transaction fees with SPL tokens (USDC, BONK, etc.)
 * instead of SOL — or have fees sponsored entirely by the protocol.
 *
 * Docs: https://launch.solana.com/docs/kora
 * GitHub: https://github.com/solana-foundation/kora
 */

import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  type TransactionInstruction,
} from '@solana/web3.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KoraConfig {
  /** Kora node RPC endpoint. Use hosted node or run your own. */
  koraEndpoint: string
  /** SPL token mint that users pay fees with (e.g. USDC). Null = protocol sponsors. */
  feeTokenMint?: PublicKey | null
  /** API key for Kora node authentication (optional) */
  apiKey?: string
}

export interface KoraEstimate {
  /** Estimated fee in lamports equivalent */
  feeLamports: bigint
  /** Fee denominated in feeToken units (if fee token set) */
  feeTokenAmount: bigint
  /** Fee token decimals */
  feeTokenDecimals: number
}

export interface GaslessResult {
  /** Fully signed transaction returned by Kora node */
  signedTransaction: string // base64
  /** Kora signature */
  koraSignature: string
}

// ── Well-known fee tokens on Solana ──────────────────────────────────────────

export const FEE_TOKENS = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  BONK: new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
  JUP:  new PublicKey('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),
  SOL:  null, // null = native SOL (no abstraction)
} as const

// ── Kora JSON-RPC Client ──────────────────────────────────────────────────────

export class KoraClient {
  private endpoint: string
  private headers: Record<string, string>
  private feeTokenMint: PublicKey | null

  constructor(config: KoraConfig) {
    this.endpoint = config.koraEndpoint
    this.feeTokenMint = config.feeTokenMint ?? null
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    }
  }

  /** Call a Kora JSON-RPC method */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    })

    if (!res.ok) {
      throw new Error(`Kora RPC error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json() as { result?: T; error?: { code: number; message: string } }

    if (data.error) {
      throw new Error(`Kora error [${data.error.code}]: ${data.error.message}`)
    }

    return data.result as T
  }

  /**
   * Estimate the fee for a transaction.
   * Returns the cost in SPL token units (if fee token configured).
   */
  async estimateFee(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
  ): Promise<KoraEstimate> {
    const serialized = transaction instanceof VersionedTransaction
      ? Buffer.from(transaction.serialize()).toString('base64')
      : transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')

    const result = await this.rpc<{
      feeLamports: string
      feeTokenAmount: string
      feeTokenDecimals: number
    }>('kora_estimateFee', [serialized])

    return {
      feeLamports: BigInt(result.feeLamports),
      feeTokenAmount: BigInt(result.feeTokenAmount),
      feeTokenDecimals: result.feeTokenDecimals,
    }
  }

  /**
   * Submit a transaction to Kora for fee sponsoring.
   * Kora will:
   *  1. Validate the transaction meets its policy
   *  2. Inject a fee payment instruction (if fee token set)
   *  3. Co-sign as fee payer
   *  4. Return the fully-signed transaction for network submission
   */
  async sponsorTransaction(
    transaction: Transaction | VersionedTransaction,
    signerPublicKey: PublicKey,
  ): Promise<GaslessResult> {
    const serialized = transaction instanceof VersionedTransaction
      ? Buffer.from(transaction.serialize()).toString('base64')
      : transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')

    const params: unknown[] = [
      serialized,
      signerPublicKey.toBase58(),
      ...(this.feeTokenMint ? [this.feeTokenMint.toBase58()] : []),
    ]

    const result = await this.rpc<{ transaction: string; signature: string }>(
      'kora_signTransaction',
      params,
    )

    return {
      signedTransaction: result.transaction,
      koraSignature: result.signature,
    }
  }

  /**
   * Check if Kora node is healthy and accepting requests.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.rpc('kora_health', [])
      return true
    } catch {
      return false
    }
  }
}

// ── Factory helper ─────────────────────────────────────────────────────────────

/**
 * Create a KoraClient with sensible defaults for PotBot.
 *
 * @example
 * // Protocol-sponsored (free for users)
 * const kora = createKoraClient({ koraEndpoint: process.env.KORA_URL! })
 *
 * // User pays in USDC
 * const kora = createKoraClient({
 *   koraEndpoint: process.env.KORA_URL!,
 *   feeTokenMint: FEE_TOKENS.USDC,
 * })
 */
export function createKoraClient(config: KoraConfig): KoraClient {
  return new KoraClient(config)
}

// ── React hook helper (web app) ───────────────────────────────────────────────

/**
 * Build a gasless transaction wrapper for use in the web DApp.
 * Attaches Kora co-signing to any PotBot transaction.
 *
 * Usage in Next.js component:
 * ```ts
 * const { buildGasless } = useKora()
 * const tx = await buildGasless(governance.createVoteTx(...))
 * await wallet.sendRawTransaction(tx)
 * ```
 */
export interface GaslessTransactionBuilder {
  /**
   * Wrap a transaction with Kora gasless sponsoring.
   * Returns the base64-encoded signed transaction ready for `sendRawTransaction`.
   */
  buildGasless: (
    tx: Transaction | VersionedTransaction,
    signerPublicKey: PublicKey,
  ) => Promise<string>

  /** Whether Kora is available (healthy node + config present) */
  isAvailable: boolean

  /** Estimate fee before showing to user */
  estimateFee: (
    tx: Transaction | VersionedTransaction,
    connection: Connection,
  ) => Promise<KoraEstimate | null>
}

export function createGaslessBuilder(
  koraClient: KoraClient | null,
): GaslessTransactionBuilder {
  return {
    isAvailable: koraClient !== null,

    buildGasless: async (tx, signerPublicKey) => {
      if (!koraClient) {
        throw new Error('Kora not configured — set NEXT_PUBLIC_KORA_URL in env')
      }
      const result = await koraClient.sponsorTransaction(tx, signerPublicKey)
      return result.signedTransaction
    },

    estimateFee: async (tx, connection) => {
      if (!koraClient) return null
      try {
        return await koraClient.estimateFee(tx, connection)
      } catch {
        return null
      }
    },
  }
}

// ── PotBot-specific gasless actions ──────────────────────────────────────────

/**
 * Action types that benefit most from gasless in PotBot:
 *
 * GOVERNANCE_VOTE     — members vote on proposals (most frequent, lowest friction needed)
 * DUEL_ACCEPT         — defender votes to accept a duel challenge
 * SIDE_BET            — spectators place bets (critical: they may not have SOL)
 * SWAP_PROPOSAL       — create a swap governance proposal from Telegram
 */
export const GASLESS_ACTIONS = [
  'GOVERNANCE_VOTE',
  'DUEL_ACCEPT',
  'SIDE_BET',
  'SWAP_PROPOSAL',
] as const

export type GaslessAction = typeof GASLESS_ACTIONS[number]

/**
 * Per-action fee sponsorship policy.
 * Protocol sponsors governance votes and side bets entirely.
 * Swap proposals use USDC fee token.
 */
export const GASLESS_POLICY: Record<GaslessAction, { sponsored: boolean; feeToken: PublicKey | null }> = {
  GOVERNANCE_VOTE: { sponsored: true,  feeToken: null },
  DUEL_ACCEPT:     { sponsored: true,  feeToken: null },
  SIDE_BET:        { sponsored: true,  feeToken: null },
  SWAP_PROPOSAL:   { sponsored: false, feeToken: FEE_TOKENS.USDC },
}
