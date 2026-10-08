/**
 * Pyth pull-oracle helper: fetch the latest VAAs from Hermes and build a transaction that
 * posts them on-chain, runs our consumer instructions, then closes the ephemeral accounts.
 *
 * The program caps price age at 300 s and prices conservatively (price ± conf), so every
 * NAV-dependent instruction (deposit, rebalance_open) ships fresh updates in the same tx.
 */
import type { Connection, PublicKey, TransactionInstruction, VersionedTransaction } from '@solana/web3.js'
import type { Wallet } from '@coral-xyz/anchor'
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver'
import { HermesClient } from '@pythnetwork/hermes-client'

const HERMES_URL = process.env.NEXT_PUBLIC_PYTH_HERMES_URL ?? 'https://hermes.pyth.network'

export interface PricedTx {
  tx: VersionedTransaction
  signers: Array<{ publicKey: PublicKey; secretKey: Uint8Array }>
}

/**
 * Build versioned transactions that post `feedIds` (0x hex) and then call `consumer` with
 * the posted price-update account for each feed, in the same order.
 */
export async function buildWithPythUpdates(
  connection: Connection,
  wallet: Wallet,
  feedIds: string[],
  consumer: (priceUpdateAccounts: PublicKey[]) => Promise<TransactionInstruction[]>,
  opts: { computeUnitPriceMicroLamports?: number } = {},
): Promise<PricedTx[]> {
  const hermes = new HermesClient(HERMES_URL)
  const latest = await hermes.getLatestPriceUpdates(feedIds, { encoding: 'base64' })
  const updateData: string[] = latest.binary.data

  const receiver = new PythSolanaReceiver({ connection, wallet })
  const builder = receiver.newTransactionBuilder({ closeUpdateAccounts: true })
  await builder.addPostPriceUpdates(updateData)
  await builder.addPriceConsumerInstructions(async (getPriceUpdateAccount) => {
    const accounts = feedIds.map((id) => getPriceUpdateAccount(id))
    const ixs = await consumer(accounts)
    return ixs.map((instruction) => ({ instruction, signers: [] }))
  })
  const txs = await builder.buildVersionedTransactions({
    computeUnitPriceMicroLamports: opts.computeUnitPriceMicroLamports ?? 50_000,
  })
  return txs as PricedTx[]
}

/** Latest Hermes prices in USD keyed by feed id (display only). */
export async function fetchHermesPrices(feedIds: string[]): Promise<Record<string, { price: number; conf: number; publishTime: number }>> {
  if (feedIds.length === 0) return {}
  const hermes = new HermesClient(HERMES_URL)
  const res = await hermes.getLatestPriceUpdates(feedIds, { parsed: true })
  const out: Record<string, { price: number; conf: number; publishTime: number }> = {}
  for (const p of res.parsed ?? []) {
    const e = p.price.expo
    out['0x' + p.id] = {
      price: Number(p.price.price) * 10 ** e,
      conf: Number(p.price.conf) * 10 ** e,
      publishTime: p.price.publish_time,
    }
  }
  return out
}
