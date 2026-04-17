/**
 * PnL Engine — real-time PnL, APY, and NAV calculations for vaults
 */
import { getPrices } from './price-oracle.js'
import type { Position, NavSnapshot } from '../types.js'

export interface PositionWithPnl extends Position {
  currentPrice: number
  currentValue: number
  unrealizedPnlUsd: number
  unrealizedPnlPct: number
}

export interface VaultAnalytics {
  pubkey: string
  navUsd: number
  navPerShareUsd: number
  totalShares: number
  pnlUsd: number
  pnlPct: number
  apy30d: number
  apy7d: number
  positions: PositionWithPnl[]
  solBalanceLamports: number
  solBalanceUsd: number
  updatedAt: number
}

const SOL_MINT = 'So11111111111111111111111111111111111111112'

export async function computeVaultAnalytics(
  pubkey: string,
  positions: Position[],
  solBalanceLamports: number,
  totalShares: number,
  historicalNav: NavSnapshot[] = []
): Promise<VaultAnalytics> {
  const allMints = [SOL_MINT, ...positions.map(p => p.mint).filter(m => m !== SOL_MINT)]
  const prices = await getPrices(allMints)
  const solPrice = prices[SOL_MINT] ?? 150

  const solBalance = solBalanceLamports / 1e9
  const solBalanceUsd = solBalance * solPrice

  const positionsWithPnl: PositionWithPnl[] = positions.map(pos => {
    const currentPrice = prices[pos.mint] ?? pos.entryPrice
    const currentValue = pos.amount * currentPrice
    const unrealizedPnlUsd = currentValue - pos.entryValue
    const unrealizedPnlPct = pos.entryValue > 0
      ? (unrealizedPnlUsd / pos.entryValue) * 100
      : 0
    return { ...pos, currentPrice, currentValue, unrealizedPnlUsd, unrealizedPnlPct }
  })

  const totalPositionValueUsd = positionsWithPnl.reduce((sum, p) => sum + p.currentValue, 0)
  const navUsd = solBalanceUsd + totalPositionValueUsd
  const navPerShareUsd = totalShares > 0 ? navUsd / totalShares : navUsd

  const totalEntryValue = positions.reduce((sum, p) => sum + p.entryValue, 0)
  const pnlUsd = totalPositionValueUsd - totalEntryValue
  const pnlPct = totalEntryValue > 0 ? (pnlUsd / totalEntryValue) * 100 : 0

  const apy30d = computeApy(historicalNav, navUsd, 30)
  const apy7d = computeApy(historicalNav, navUsd, 7)

  return {
    pubkey,
    navUsd,
    navPerShareUsd,
    totalShares,
    pnlUsd,
    pnlPct,
    apy30d,
    apy7d,
    positions: positionsWithPnl,
    solBalanceLamports,
    solBalanceUsd,
    updatedAt: Date.now(),
  }
}

function computeApy(
  history: NavSnapshot[],
  currentNav: number,
  days: number
): number {
  if (history.length === 0 || currentNav <= 0) return 0
  const cutoff = Date.now() / 1000 - days * 86400
  // Find oldest snapshot within window
  const oldest = history
    .filter(h => h.ts >= cutoff)
    .sort((a, b) => a.ts - b.ts)[0]
  if (!oldest || oldest.nav <= 0) return 0
  const growthFactor = currentNav / oldest.nav
  // Annualize: (1 + growth)^(365/days) - 1
  const annualFactor = Math.pow(growthFactor, 365 / days)
  return (annualFactor - 1) * 100
}
