/**
 * Market analytics aggregation — pulls fundamentals from public sources
 * the AI agent can use to ground its proposals in real data instead of
 * hallucinating. All sources are free, no API keys required.
 *
 * Sources:
 *   - CoinGecko Pro-free tier (no key, ~10-30 req/min)
 *   - DefiLlama (yields.llama.fi + open.llama.fi/v1) — keyless
 *   - Jupiter Price API v2 (already used for live quotes)
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const DEFILLAMA_PROTOCOLS = 'https://api.llama.fi/protocols'

// Solana-mint → CoinGecko id. Extend as needed.
export const COINGECKO_IDS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
  'JUPyiwrYJFskUPiHa7hkeR8NqtwybKv5LqYjTrsixO7': 'jupiter-exchange-solana',
  'EKpQGSKe94Fp3gWQrW1zYvbwDiQMqFEuer5pVUeX3mQ': 'dogwifcoin',
  'DezXAZ8z7PnrnRJjz3wXBoRgixVrtVZvWr8Alfred89u': 'bonk',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'jito-staked-sol',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'msol',
}

const SYMBOL_TO_CG_ID: Record<string, string> = {
  SOL: 'solana', USDC: 'usd-coin', USDT: 'tether', JUP: 'jupiter-exchange-solana',
  WIF: 'dogwifcoin', BONK: 'bonk', JITOSOL: 'jito-staked-sol', MSOL: 'msol',
  BTC: 'bitcoin', ETH: 'ethereum',
}

export function resolveCoinGeckoId(tokenOrMint: string): string | null {
  const upper = tokenOrMint.toUpperCase()
  if (SYMBOL_TO_CG_ID[upper]) return SYMBOL_TO_CG_ID[upper]
  if (COINGECKO_IDS[tokenOrMint]) return COINGECKO_IDS[tokenOrMint]
  return null
}

export interface MarketAnalytics {
  cg_id: string
  symbol: string
  name: string
  price_usd: number
  market_cap_usd: number | null
  market_cap_rank: number | null
  total_volume_24h_usd: number | null
  pct_change_24h: number | null
  pct_change_7d: number | null
  pct_change_30d: number | null
  ath_usd: number | null
  ath_pct_from_ath: number | null
  atl_usd: number | null
  circulating_supply: number | null
  total_supply: number | null
  fdv_usd: number | null
  // Derived signals
  realized_volatility_30d_pct: number | null
  trend_30d: 'strong_up' | 'up' | 'sideways' | 'down' | 'strong_down' | null
  rsi_14d: number | null
  source_timestamp: string
}

export async function getMarketAnalytics(tokenOrMint: string): Promise<{
  data: MarketAnalytics | null
  warning?: string
}> {
  const cgId = resolveCoinGeckoId(tokenOrMint)
  if (!cgId) {
    return { data: null, warning: `No CoinGecko mapping for "${tokenOrMint}". Pass a known symbol (SOL, USDC, JUP, BONK, etc.) or extend COINGECKO_IDS.` }
  }

  try {
    // Single-call wrapper that returns enough to derive most signals.
    const url = `${COINGECKO_BASE}/coins/${cgId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return { data: null, warning: `CoinGecko ${res.status}` }
    const json = await res.json() as any
    const md = json.market_data ?? {}

    // Fetch 30d hourly chart for volatility + RSI signals
    let volatility: number | null = null
    let rsi: number | null = null
    let trend: MarketAnalytics['trend_30d'] = null
    try {
      const chartRes = await fetch(`${COINGECKO_BASE}/coins/${cgId}/market_chart?vs_currency=usd&days=30&interval=daily`)
      if (chartRes.ok) {
        const chart = await chartRes.json() as any
        const prices: number[] = (chart.prices ?? []).map((p: [number, number]) => p[1])
        if (prices.length > 14) {
          volatility = computeRealizedVolatility(prices)
          rsi = computeRSI(prices, 14)
          trend = classifyTrend(prices)
        }
      }
    } catch { /* charts optional */ }

    return {
      data: {
        cg_id: cgId,
        symbol: (json.symbol ?? '').toUpperCase(),
        name: json.name ?? cgId,
        price_usd: md.current_price?.usd ?? 0,
        market_cap_usd: md.market_cap?.usd ?? null,
        market_cap_rank: md.market_cap_rank ?? null,
        total_volume_24h_usd: md.total_volume?.usd ?? null,
        pct_change_24h: md.price_change_percentage_24h ?? null,
        pct_change_7d: md.price_change_percentage_7d ?? null,
        pct_change_30d: md.price_change_percentage_30d ?? null,
        ath_usd: md.ath?.usd ?? null,
        ath_pct_from_ath: md.ath_change_percentage?.usd ?? null,
        atl_usd: md.atl?.usd ?? null,
        circulating_supply: md.circulating_supply ?? null,
        total_supply: md.total_supply ?? null,
        fdv_usd: md.fully_diluted_valuation?.usd ?? null,
        realized_volatility_30d_pct: volatility,
        trend_30d: trend,
        rsi_14d: rsi,
        source_timestamp: new Date().toISOString(),
      },
    }
  } catch (err: any) {
    return { data: null, warning: `CoinGecko unreachable: ${err.message ?? String(err)}` }
  }
}

// ── Signal helpers ────────────────────────────────────────────────────────

export function computeRealizedVolatility(prices: number[]): number {
  // Annualized realized volatility from daily log returns, expressed as %.
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) returns.push(Math.log(prices[i] / prices[i - 1]))
  }
  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (returns.length - 1)
  const stdDaily = Math.sqrt(variance)
  // Annualize × sqrt(365); convert to %.
  return parseFloat((stdDaily * Math.sqrt(365) * 100).toFixed(2))
}

export function computeRSI(prices: number[], period = 14): number {
  if (prices.length <= period) return 50
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff; else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return parseFloat((100 - 100 / (1 + rs)).toFixed(1))
}

export function classifyTrend(prices: number[]): MarketAnalytics['trend_30d'] {
  if (prices.length < 14) return null
  const first = prices[0]
  const last = prices[prices.length - 1]
  const pct = ((last - first) / first) * 100
  if (pct > 25) return 'strong_up'
  if (pct > 5) return 'up'
  if (pct > -5) return 'sideways'
  if (pct > -25) return 'down'
  return 'strong_down'
}

// ── DefiLlama protocol metrics (orthogonal signal) ────────────────────────

export interface ProtocolStats {
  name: string
  slug: string
  tvl_usd: number
  chain_tvls: Record<string, number>
  change_1d_pct: number | null
  change_7d_pct: number | null
  url: string
  category: string
}

export async function getProtocolStats(slug: string): Promise<ProtocolStats | null> {
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${slug}`)
    if (!res.ok) return null
    const json = await res.json() as any
    return {
      name: json.name,
      slug: json.slug,
      tvl_usd: json.currentChainTvls
        ? Object.values<number>(json.currentChainTvls).reduce((a, b) => a + b, 0)
        : 0,
      chain_tvls: json.currentChainTvls ?? {},
      change_1d_pct: json.change_1d ?? null,
      change_7d_pct: json.change_7d ?? null,
      url: json.url ?? '',
      category: json.category ?? 'unknown',
    }
  } catch {
    return null
  }
}

// Categories we filter out — these aren't Solana-native protocols even
// though DefiLlama lists Solana among their supported chains.
const NON_NATIVE_CATEGORIES = new Set(['CEX', 'Bridge', 'RWA', 'Cross Chain Bridge', 'Cross Chain'])

export async function getTopSolanaProtocols(limit = 20): Promise<ProtocolStats[]> {
  try {
    const res = await fetch(DEFILLAMA_PROTOCOLS)
    if (!res.ok) return []
    const json = await res.json() as any[]
    return json
      .filter(p => p.chains?.includes('Solana'))
      .filter(p => !NON_NATIVE_CATEGORIES.has(p.category ?? ''))
      // Use Solana-only TVL (chainTvls.Solana) when available so multi-chain
      // protocols (Lido etc.) are ranked by what's actually on Solana.
      .map(p => {
        const solanaTvl = p.chainTvls?.Solana ?? p.tvl ?? 0
        return {
          name: p.name,
          slug: p.slug,
          tvl_usd: Math.round(solanaTvl),
          chain_tvls: { Solana: Math.round(p.chainTvls?.Solana ?? 0) },
          change_1d_pct: p.change_1d != null ? parseFloat(p.change_1d.toFixed(2)) : null,
          change_7d_pct: p.change_7d != null ? parseFloat(p.change_7d.toFixed(2)) : null,
          url: p.url ?? '',
          category: p.category ?? 'unknown',
        }
      })
      .filter(p => p.tvl_usd > 0)
      .sort((a, b) => b.tvl_usd - a.tvl_usd)
      .slice(0, limit)
  } catch {
    return []
  }
}
