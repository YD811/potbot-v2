import { Connection, PublicKey, type TransactionSignature } from '@solana/web3.js'
import { logTradeToSupabase, type TradeLogInput } from './supabase-sync'

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

let connection: Connection | null = null
function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, 'confirmed')
  }
  return connection
}

export interface TriggerContext {
  potPubkey: string
  strategyPubkey: string
  reason: string
  inputMint: string
  outputMint: string
  inputAmount: number
  expectedOutputAmount: number
}

export interface TriggerResult {
  signature: TransactionSignature
  realizedOutputAmount: number
  feeLamports: number
  status: 'confirmed' | 'failed'
  errorMessage?: string
}

/**
 * Fire a trigger by sending the prepared swap transaction (passed in as a base64 tx
 * blob in production). For now this is a thin wrapper that takes a pre-confirmed
 * signature and logs the trade into Supabase. The full Jupiter integration lives
 * upstream in the strategy module — we keep this layer dumb on purpose.
 */
export async function fireTrigger(
  ctx: TriggerContext,
  signature: TransactionSignature,
): Promise<TriggerResult> {
  const conn = getConnection()
  let status: 'confirmed' | 'failed' = 'failed'
  let realizedOutputAmount = 0
  let feeLamports = 0
  let errorMessage: string | undefined

  try {
    const conf = await conn.confirmTransaction(signature, 'confirmed')
    if (conf.value.err) {
      errorMessage = JSON.stringify(conf.value.err)
    } else {
      status = 'confirmed'
      const tx = await conn.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
      if (tx?.meta) {
        feeLamports = tx.meta.fee ?? 0
        // Best-effort realized output extraction left to upstream parsers.
        realizedOutputAmount = ctx.expectedOutputAmount
      }
    }
  } catch (err) {
    errorMessage = (err as Error).message
  }

  // Log the trade regardless of outcome so users have an audit trail.
  const entry: TradeLogInput = {
    pot: ctx.potPubkey,
    strategy: ctx.strategyPubkey,
    signature,
    side: 'swap',
    inputMint: ctx.inputMint,
    outputMint: ctx.outputMint,
    inputAmount: ctx.inputAmount,
    outputAmount: realizedOutputAmount,
    feeLamports,
    status,
    reason: ctx.reason,
    errorMessage,
    timestamp: Math.floor(Date.now() / 1000),
  }

  try {
    await logTradeToSupabase(entry)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[keeper.executor] logTradeToSupabase failed:', (err as Error).message)
  }

  return {
    signature,
    realizedOutputAmount,
    feeLamports,
    status,
    errorMessage,
  }
}

/**
 * Used by tests / dry-runs: validate that a pubkey string parses cleanly.
 */
export function assertValidPubkey(pk: string): PublicKey {
  return new PublicKey(pk)
}
