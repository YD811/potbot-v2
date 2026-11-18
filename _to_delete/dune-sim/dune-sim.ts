/**
 * Dune SIM — Real-time Solana blockchain data for PotBot
 *
 * Docs: https://docs.sim.dune.com
 * Bounty: Dune / Superteam NL ($5,000)
 */

const DUNE_SIM_BASE = 'https://api.sim.dune.com/v1'

function getDuneApiKey(): string {
  return process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''
}

function duneHeaders(): HeadersInit {
  const key = getDuneApiKey()
  return key
    ? { 'X-Dune-Api-Key': key, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface DuneTokenBalance {
  mint: string; symbol: string; name: string; decimals: number
  amount: number; uiAmount: number; priceUsd: number; valueUsd: number; logoUri?: string
}

export interface DuneWalletPortfolio {
  address: string; solBalance: number; solValueUsd: number
  tokens: DuneTokenBalance[]; totalValueUsd: number; lastUpdatedAt: number
}

export interface DuneTransaction {
  signature: string; blockTime: number; fee: number; success: boolean
  type: 'swap' | 'transfer' | 'other'
  amountIn?: number; amountOut?: number; tokenIn?: string; tokenOut?: string
}

export interface DuneGlobalStats {
  totalVaults: number; totalTvlSol: number; totalTvlUsd: number
  totalVolumeSol: number; totalMembers: number; lastUpdatedAt: number
}

export async function getWalletPortfolio(
  address: string,
): Promise<DuneWalletPortfolio | null> {
  const key = getDuneApiKey()
  if (!key) return null

  try {
    const res = await fetch(`${DUNE_SIM_BASE}/solana/balances/${address}`, {
      headers: duneHeaders(),
    })
    if (!res.ok) return null
    const data = await res.json()

    const tokens: DuneTokenBalance[] = (data.tokens ?? []).map((t: any) => ({
      mint:     t.mint ?? t.address,
      symbol:   t.symbol ?? '???',
      name:     t.name ?? t.symbol ?? 'Unknown',
      decimals: t.decimals ?? 9,
      amount:   Number(t.amount ?? 0),
      uiAmount: Number(t.ui_amount ?? t.uiAmount ?? 0),
      priceUsd: Number(t.price_usd ?? t.priceUsd ?? 0),
      valueUsd: Number(t.value_usd ?? t.valueUsd ?? 0),
      logoUri:  t.logo_uri ?? t.logoUri,
    }))

    const solBalance = Number(data.sol_balance ?? data.solBalance ?? 0)
    const solPrice   = Number(data.sol_price_usd ?? 150)
    const solValueUsd = solBalance * solPrice
    const tokenValueUsd = tokens.reduce((sum, t) => sum + t.valueUsd, 0)

    return {
      address, solBalance, solValueUsd, tokens,
      totalValueUsd: solValueUsd + tokenValueUsd,
      lastUpdatedAt: Date.now(),
    }
  } catch {
    return null
  }
}

export async function getWalletTransactions(
  address: string,
  limit = 20,
): Promise<DuneTransaction[]> {
  const key = getDuneApiKey()
  if (!key) return []
  try {
    const res = await fetch(
      `${DUNE_SIM_BASE}/transactions/${address}?chain=solana&limit=${limit}`,
      { headers: duneHeaders() },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.transactions ?? []).map((tx: any) => ({
      signature: tx.hash ?? tx.signature,
      blockTime: tx.block_time ?? tx.blockTime ?? 0,
      fee:       Number(tx.fee ?? 0),
      success:   tx.success ?? true,
      type:      inferTxType(tx),
      amountIn:  tx.amount_in,
      amountOut: tx.amount_out,
      tokenIn:   tx.token_in,
      tokenOut:  tx.token_out,
    }))
  } catch {
    return []
  }
}

function inferTxType(tx: any): 'swap' | 'transfer' | 'other' {
  const label = (tx.transaction_type ?? tx.type ?? '').toLowerCase()
  if (label.includes('swap') || label.includes('jupiter')) return 'swap'
  if (label.includes('transfer')) return 'transfer'
  return 'other'
}

export async function getGlobalStats(
  vaultAddresses: string[],
): Promise<DuneGlobalStats> {
  const key = getDuneApiKey()
  if (!key || vaultAddresses.length === 0) {
    return { totalVaults: vaultAddresses.length, totalTvlSol: 0, totalTvlUsd: 0, totalVolumeSol: 0, totalMembers: 0, lastUpdatedAt: Date.now() }
  }
  const sample = vaultAddresses.slice(0, 10)
  const portfolios = await Promise.all(sample.map(addr => getWalletPortfolio(addr)))
  const valid = portfolios.filter(Boolean) as DuneWalletPortfolio[]
  return {
    totalVaults:    vaultAddresses.length,
    totalTvlSol:    valid.reduce((s, p) => s + p.solBalance, 0),
    totalTvlUsd:    valid.reduce((s, p) => s + p.totalValueUsd, 0),
    totalVolumeSol: 0,
    totalMembers:   0,
    lastUpdatedAt:  Date.now(),
  }
}

export function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}
