/**
 * Standalone price fetcher for the AI agent (no React hooks — runs in async context)
 */
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2'

export async function fetchPricesRaw(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {}
  try {
    const ids = mints.join(',')
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`)
    if (!res.ok) return {}
    const json = await res.json()
    const result: Record<string, number> = {}
    for (const [mint, data] of Object.entries(json.data as Record<string, { price: string }>)) {
      result[mint] = parseFloat(data.price)
    }
    return result
  } catch {
    return {}
  }
}
