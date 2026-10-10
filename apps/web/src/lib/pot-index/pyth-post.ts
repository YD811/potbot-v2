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

// In the browser go through our same-origin proxy (Hermes has no CORS for browsers); in Node hit Hermes directly.
const HERMES_URL =
  process.env.NEXT_PUBLIC_PYTH_HERMES_URL ??
  (typeof window !== 'undefined' ? `${window.location.origin}/api/pot-index/hermes` : 'https://hermes.pyth.network')
// Node scripts talking to Hermes directly need the key; the browser goes through the proxy which adds it.
const HERMES_OPTS = typeof window === 'undefined' && process.env.PYTH_API_KEY ? { accessToken: process.env.PYTH_API_KEY } : {}

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
  const hermes = new HermesClient(HERMES_URL, HERMES_OPTS)
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
  const hermes = new HermesClient(HERMES_URL, HERMES_OPTS)
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

/**
 * A "price session": post the updates once, use the posted accounts across several of our own
 * transactions, then reclaim the rent. `postTxs` go first, `closeTxs` last; the caller builds
 * whatever goes in between with `priceUpdates` (one account per feed id, in order).
 */
export async function buildPythSession(
  connection: Connection,
  wallet: Wallet,
  feedIds: string[],
  opts: { computeUnitPriceMicroLamports?: number } = {},
): Promise<{ postTxs: PricedTx[]; closeTxs: PricedTx[]; priceUpdates: PublicKey[] }> {
  const hermes = new HermesClient(HERMES_URL, HERMES_OPTS)
  const latest = await hermes.getLatestPriceUpdates(feedIds, { encoding: 'base64' })
  const receiver = new PythSolanaReceiver({ connection, wallet })
  const { postInstructions, priceFeedIdToPriceUpdateAccount, closeInstructions } =
    await receiver.buildPostPriceUpdateInstructions(latest.binary.data as string[])
  const fee = { computeUnitPriceMicroLamports: opts.computeUnitPriceMicroLamports ?? 50_000 }
  const postB = receiver.newTransactionBuilder({ closeUpdateAccounts: false })
  postB.addInstructions(postInstructions)
  const closeB = receiver.newTransactionBuilder({ closeUpdateAccounts: false })
  closeB.addInstructions(closeInstructions)
  const priceUpdates = feedIds.map((id) => {
    const k = priceFeedIdToPriceUpdateAccount[id]
    if (!k) throw new Error(`no price update account for ${id}`)
    return k
  })
  return {
    postTxs: (await postB.buildVersionedTransactions(fee)) as PricedTx[],
    closeTxs: (await closeB.buildVersionedTransactions(fee)) as PricedTx[],
    priceUpdates,
  }
}
