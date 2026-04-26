// apps/keeper/src/executor.ts
// Confirms a swap signature on-chain and logs the resulting trade row to Supabase.

import { Connection, PublicKey, type TransactionSignature } from '@solana/web3.js'
import { logTradeToSupabase } from './supabase-sync.js'

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

let connection: Connection | null = null
function getConnection(): Connection {
  if (!connection) connection = new Connection(RPC_URL, 'confirmed')
  return connection
}

export interface TriggerContext {
  potPubkey: string
  strategyAddress: string
  inputMint: string
  outputMint: string
  amountIn: bigint
  amountOut: bigint
  priceUsdEntry: number | null
  priceUsdExit: number | null
  triggerReason: string
}

export interface TriggerResult {
  signature: TransactionSignature
  status: 'confirmed' | 'failed'
  feeLamports: number
  errorMessage?: string
}

/**
 * Confirm a previously-sent swap signature, then write a row to trade_log.
 * Logging is best-effort: a failure to write Supabase does not throw.
 */
export async function fireTrigger(
  ctx: TriggerContext,
  signature: TransactionSignature,
): Promise<TriggerResult> {
  const conn = getConnection()
  let status: 'confirmed' | 'failed' = 'failed'
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
      if (tx?.meta) feeLamports = tx.meta.fee ?? 0
    }
  } catch (err) {
    errorMessage = (err as Error).message
  }

  try {
    await logTradeToSupabase({
      potPubkey: ctx.potPubkey,
      strategyAddress: ctx.strategyAddress,
      signature,
      inputMint: ctx.inputMint,
      outputMint: ctx.outputMint,
      amountIn: ctx.amountIn,
      amountOut: ctx.amountOut,
      priceUsdEntry: ctx.priceUsdEntry,
      priceUsdExit: ctx.priceUsdExit,
      triggerReason: ctx.triggerReason,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[keeper.executor] logTradeToSupabase failed:', (err as Error).message)
  }

  return { signature, status, feeLamports, errorMessage }
}

/** Validates that a pubkey string parses cleanly. */
export function assertValidPubkey(pk: string): PublicKey {
  return new PublicKey(pk)
}
