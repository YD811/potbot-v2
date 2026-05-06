import { Connection, PublicKey } from '@solana/web3.js'

export const PYTH_DEVNET_FEEDS: Record<string, string> = {
  'SOL/USD': 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix',
  'USDC/USD': '5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7',
}

export interface PriceResult {
  price: number
  publishTime: number
  symbol: string
}

export async function getPrice(
  connection: Connection,
  symbol: 'SOL/USD' | 'USDC/USD'
): Promise<PriceResult> {
  const feedAddress = PYTH_DEVNET_FEEDS[symbol]
  if (!feedAddress) throw new Error(`Unknown symbol: ${symbol}`)

  const accountInfo = await connection.getAccountInfo(new PublicKey(feedAddress))
  if (!accountInfo) throw new Error(`Pyth feed account not found: ${feedAddress}`)

  const data = accountInfo.data

  if (data.length < 240) {
    throw new Error(`Pyth account data too short: ${data.length} bytes`)
  }

  const priceBigInt = data.readBigInt64LE(208)
  const exponent = data.readInt32LE(216)
  const publishTime = Number(data.readBigInt64LE(224))

  const price = Number(priceBigInt) * Math.pow(10, exponent)

  const now = Math.floor(Date.now() / 1000)
  if (now - publishTime > 60) {
    throw new Error(`Pyth feed stale: ${symbol} last updated ${now - publishTime}s ago`)
  }

  return { price, publishTime, symbol }
}
