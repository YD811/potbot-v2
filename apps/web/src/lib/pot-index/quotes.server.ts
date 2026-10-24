import 'server-only'
import registry from './assets.devnet.json'
import { fetchHermesPrices } from './pyth-post'

/**
 * Display prices for listed assets. Pyth Hermes first; if the key is not entitled (or Hermes is
 * down) fall back to CoinGecko so NAV, charts and history keep working. Only for display and
 * snapshots: every on-chain instruction still needs signed Pyth updates and does not use this.
 */

export type Quote = { price: number; conf: number; publishTime: number }
export type Quotes = { prices: Record<string, Quote>; source: 'pyth' | 'coingecko' }

// Same ids as token-info: devnet legs are test mints that track the real asset.
const COINGECKO_IDS: Record<string, string> = {
  SOL: 'solana',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  XRP: 'ripple',
  JITOSOL: 'jito-staked-sol',
  PYTH: 'pyth-network',
  DOGE: 'dogecoin',
  TSLAX: 'tesla-xstock',
  QQQX: 'nasdaq-xstock',
}

const FEED_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.values(registry.assets as Record<string, { symbol: string; feedId: string }>).map((a) => [a.feedId.toLowerCase(), a.symbol]),
)

let cgCache: { at: number; data: Record<string, number> } | null = null
let pythDownUntil = 0

async function coingecko(): Promise<Record<string, number>> {
  if (cgCache && Date.now() - cgCache.at < 60_000) return cgCache.data
  const ids = Array.from(new Set(Object.values(COINGECKO_IDS))).join(',')
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { headers: { accept: 'application/json' }, cache: 'no-store' })
  if (!r.ok) throw new Error(`coingecko ${r.status}`)
  const j = (await r.json()) as Record<string, { usd?: number }>
  const bySymbol: Record<string, number> = {}
  for (const [sym, id] of Object.entries(COINGECKO_IDS)) {
    const v = j[id]?.usd
    if (typeof v === 'number' && v > 0) bySymbol[sym] = v
  }
  cgCache = { at: Date.now(), data: bySymbol }
  return bySymbol
}

export async function fetchQuotes(feedIds: string[]): Promise<Quotes> {
  const ids = Array.from(new Set(feedIds.map((f) => f.toLowerCase())))
  if (ids.length === 0) return { prices: {}, source: 'pyth' }
  if (Date.now() > pythDownUntil) {
    try {
      const prices = await fetchHermesPrices(ids)
      if (Object.keys(prices).length > 0) return { prices, source: 'pyth' }
    } catch {
      pythDownUntil = Date.now() + 5 * 60_000 // do not hammer Hermes while the key is not entitled
    }
  }
  const bySymbol = await coingecko()
  const prices: Record<string, Quote> = {}
  for (const id of ids) {
    const sym = FEED_TO_SYMBOL[id]
    const p = sym ? bySymbol[sym] : undefined
    // publishTime 0: the UI treats these as not fresh enough to mint, which is correct.
    if (p) prices[id] = { price: p, conf: 0, publishTime: 0 }
  }
  return { prices, source: 'coingecko' }
}
