/**
 * Jupiter Executor — off-chain swap execution service
 * 
 * Architecture:
 *   On-chain:  governance votes → proposal passes → execute_proposal records swap intent
 *   Off-chain: this service picks up the intent and executes the real Jupiter swap
 * 
 * Phase 1 (current): executor wallet signs Jupiter transactions
 *   - Vault transfers funds to executor wallet via approved proposal
 *   - Executor swaps via Jupiter and returns funds
 * 
 * Phase 2 (production): Anchor CPI to Jupiter
 *   - Program calls Jupiter CPI directly from vault PDA
 *   - Zero counterparty risk, fully trustless
 * 
 * Security:
 *   - EXECUTOR_KEYPAIR env var holds executor wallet private key (base58)
 *   - Executor wallet address must be set as pot.agent_pubkey on-chain
 *   - Max trade size enforced by on-chain pot.agent_max_trade_bps
 */
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import bs58 from 'bs58'
import { insertSwapExecution, updateSwapExecution } from '../db/supabase.js'

const JUPITER_QUOTE_API  = 'https://quote-api.jup.ag/v6/quote'
const JUPITER_SWAP_API   = 'https://quote-api.jup.ag/v6/swap'
const JUPITER_PRICE_API  = 'https://api.jup.ag/price/v2'
const WSOL_MINT          = 'So11111111111111111111111111111111111111112'

export interface SwapRequest {
  potPubkey: string
  fromMint: string
  toMint: string
  amountIn: number       // lamports or token raw amount
  minAmountOut: number
  proposalId: number
  txSignature: string    // the execute_proposal tx that authorized this
}

export interface JupiterQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  priceImpactPct: string
  routePlan: unknown[]
}

export class JupiterExecutor {
  private connection: Connection
  private executorKeypair: Keypair | null = null
  private slippageBps: number
  private maxRetries: number

  constructor(params: {
    rpcUrl: string
    executorKeypair?: string  // base58 private key
    slippageBps?: number
    maxRetries?: number
  }) {
    this.connection = new Connection(params.rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60_000,
    })
    this.slippageBps = params.slippageBps ?? 50  // 0.5% default slippage
    this.maxRetries = params.maxRetries ?? 3

    if (params.executorKeypair) {
      try {
        const decoded = bs58.decode(params.executorKeypair)
        this.executorKeypair = Keypair.fromSecretKey(decoded)
        console.log(
          `[jupiter-executor] Loaded executor wallet: ${this.executorKeypair.publicKey.toBase58()}`
        )
      } catch (e) {
        console.error('[jupiter-executor] Invalid EXECUTOR_KEYPAIR:', e)
      }
    } else {
      console.warn('[jupiter-executor] No EXECUTOR_KEYPAIR set — swaps will be simulated only')
    }
  }

  async executeSwap(req: SwapRequest): Promise<void> {
    console.log(
      `[jupiter-executor] Executing swap for pot ${req.potPubkey.slice(0, 8)}: ` +
      `${req.amountIn} ${req.fromMint.slice(0, 8)} → ${req.toMint.slice(0, 8)}`
    )

    // Record in DB
    const dbId = await insertSwapExecution({
      pot_pubkey:     req.potPubkey,
      proposal_id:    req.proposalId,
      from_mint:      req.fromMint,
      to_mint:        req.toMint,
      amount_in:      req.amountIn,
      min_amount_out: req.minAmountOut,
      status:         'pending',
    })

    if (!this.executorKeypair) {
      console.log('[jupiter-executor] Simulation mode — swap would be:', req)
      if (dbId) await updateSwapExecution(dbId, { status: 'failed', error: 'No executor keypair' })
      return
    }

    let lastError: string | undefined

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const { txSignature, amountOut, priceImpact, route } =
          await this.executeWithRetry(req, attempt)

        console.log(`[jupiter-executor] Swap confirmed: ${txSignature} — received ${amountOut}`)

        if (dbId) {
          await updateSwapExecution(dbId, {
            status:         'confirmed',
            tx_signature:   txSignature,
            amount_out:     amountOut,
            price_impact:   priceImpact,
            jupiter_route:  route,
            confirmed_at:   new Date().toISOString(),
          })
        }
        return  // Success

      } catch (e) {
        lastError = String(e)
        console.error(`[jupiter-executor] Attempt ${attempt}/${this.maxRetries} failed:`, e)
        if (attempt < this.maxRetries) {
          await sleep(1000 * attempt)  // Exponential backoff
        }
      }
    }

    // All retries exhausted
    if (dbId) {
      await updateSwapExecution(dbId, { status: 'failed', error: lastError })
    }
    console.error(`[jupiter-executor] Swap failed after ${this.maxRetries} attempts:`, lastError)
  }

  private async executeWithRetry(
    req: SwapRequest,
    attempt: number
  ): Promise<{ txSignature: string; amountOut: number; priceImpact: number; route: unknown }> {
    // 1. Get Jupiter quote
    const quote = await this.getQuote(req.fromMint, req.toMint, req.amountIn)

    const priceImpact = parseFloat(quote.priceImpactPct)
    if (priceImpact > 5) {
      throw new Error(`Price impact too high: ${priceImpact.toFixed(2)}%`)
    }

    const amountOut = Number(quote.outAmount)
    if (req.minAmountOut > 0 && amountOut < req.minAmountOut) {
      throw new Error(
        `Output ${amountOut} below minimum ${req.minAmountOut} (slippage check)`
      )
    }

    // 2. Get swap transaction from Jupiter
    const swapRes = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: this.executorKeypair!.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: attempt > 1 ? 50000 * attempt : 10000,  // Increase priority on retry
        dynamicComputeUnitLimit: true,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!swapRes.ok) {
      throw new Error(`Jupiter swap API error: ${swapRes.status} ${await swapRes.text()}`)
    }

    const swapData = await swapRes.json() as { swapTransaction: string }

    // 3. Deserialize and sign
    const txBuffer = Buffer.from(swapData.swapTransaction, 'base64')
    const tx = VersionedTransaction.deserialize(txBuffer)
    tx.sign([this.executorKeypair!])

    // 4. Submit to chain
    const rawTx = tx.serialize()
    const txSignature = await this.connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      maxRetries: 2,
    })

    // 5. Confirm
    const latestBlockhash = await this.connection.getLatestBlockhash()
    await this.connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, 'confirmed')

    return { txSignature, amountOut, priceImpact, route: quote.routePlan }
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<JupiterQuote> {
    const url = new URL(JUPITER_QUOTE_API)
    url.searchParams.set('inputMint', inputMint)
    url.searchParams.set('outputMint', outputMint)
    url.searchParams.set('amount', String(amount))
    url.searchParams.set('slippageBps', String(this.slippageBps))
    url.searchParams.set('onlyDirectRoutes', 'false')
    url.searchParams.set('asLegacyTransaction', 'false')

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`Jupiter quote error: ${res.status} ${await res.text()}`)
    return res.json() as Promise<JupiterQuote>
  }

  async getExecutorBalance(): Promise<number> {
    if (!this.executorKeypair) return 0
    const balance = await this.connection.getBalance(this.executorKeypair.publicKey)
    return balance / LAMPORTS_PER_SOL
  }

  getExecutorPublicKey(): string | null {
    return this.executorKeypair?.publicKey.toBase58() ?? null
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
