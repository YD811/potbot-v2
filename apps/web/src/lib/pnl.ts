/**
 * PnL calculation service for PotBot.
 *
 * Data sources:
 *  - On-chain: member.shares, member.deposit_total, pot.total_shares, vault lamports
 *  - Price: Pyth (SOL/USD real-time) + Jupiter (token prices)
 *  - Historical: Supabase (entry price snapshots, daily NAV records)
 *
 * PnL types supported:
 *  1. SOL-denominated PnL (always available, no price feed needed)
 *  2. USD-denominated PnL (requires entry price from Supabase snapshot)
 */

import { getSolUsdPrice, getTokenPrices } from './pyth'

export interface MemberOnChainData {
  wallet: string
  shares: bigint
  depositTotal: bigint     // lamports deposited, all-time
  withdrawTotal: bigint    // lamports withdrawn, all-time
  joinedAt: number
}

export interface PotOnChainData {
  pubkey: string
  name: string
  totalShares: bigint
  tradeCount: number
  totalVolume: bigint
  vaultLamports: bigint   // fetched separately from vault PDA
  tamagotchiLevel: number
}

export interface MemberPnL {
  // SOL denominated (always accurate, no oracle needed)
  currentValueSol: number       // current SOL value of shares
  netDepositedSol: number       // total deposited minus withdrawn
  pnlSol: number                // currentValue - netDeposited (in SOL)
  pnlPct: number                // percentage return
  sharePriceSol: number         // current price of 1 share in SOL

  // USD denominated (requires Pyth price)
  currentValueUsd: number
  pnlUsd: number                // currentValue - entryUsd
  entryUsd: number | null       // null if no snapshot available
  solUsdPrice: number

  // Metadata
  pot: string
  member: string
  calculatedAt: number
}

export interface PotStats {
  name: string
  pubkey: string
  vaultSol: number
  vaultUsd: number
  navPerShareSol: number        // net asset value per share
  memberCount: number
  totalVolumeSol: number
  allTimePnlSol: number         // vault - all deposits (approximation)
  solUsdPrice: number
  tamagotchiLevel: number
  calculatedAt: number
}

const LAMPORTS_PER_SOL = 1_000_000_000

/**
 * Calculate SOL-denominated PnL for a member in a specific pot.
 * This is the primary PnL shown in the UI — no external price feed needed.
 */
export function calcMemberPnlSol(
  member: MemberOnChainData,
  pot: PotOnChainData,
): Pick<MemberPnL, 'currentValueSol' | 'netDepositedSol' | 'pnlSol' | 'pnlPct' | 'sharePriceSol'> {
  const totalShares = Number(pot.totalShares)
  const vaultLamports = Number(pot.vaultLamports)
  const memberShares = Number(member.shares)

  const sharePriceLamports = totalShares > 0
    ? vaultLamports / totalShares
    : 1

  const currentValueLamports = memberShares * sharePriceLamports
  const netDepositedLamports = Number(member.depositTotal) - Number(member.withdrawTotal)
  const pnlLamports = currentValueLamports - netDepositedLamports

  const currentValueSol = currentValueLamports / LAMPORTS_PER_SOL
  const netDepositedSol = netDepositedLamports / LAMPORTS_PER_SOL
  const pnlSol = pnlLamports / LAMPORTS_PER_SOL
  const pnlPct = netDepositedLamports > 0
    ? (pnlLamports / netDepositedLamports) * 100
    : 0
  const sharePriceSol = sharePriceLamports / LAMPORTS_PER_SOL

  return { currentValueSol, netDepositedSol, pnlSol, pnlPct, sharePriceSol }
}

/**
 * Full PnL calculation including USD conversion.
 * Fetches live SOL/USD price from Pyth.
 */
export async function calcMemberPnlFull(
  member: MemberOnChainData,
  pot: PotOnChainData,
  entryUsdSnapshot?: number | null, // from Supabase, null if not available
): Promise<MemberPnL> {
  const solPnl = calcMemberPnlSol(member, pot)
  const solUsdPrice = await getSolUsdPrice()

  const currentValueUsd = solPnl.currentValueSol * solUsdPrice
  const entryUsd = entryUsdSnapshot ?? null
  const pnlUsd = entryUsd !== null ? currentValueUsd - entryUsd : 0

  return {
    ...solPnl,
    currentValueUsd,
    pnlUsd,
    entryUsd,
    solUsdPrice,
    pot: pot.pubkey,
    member: member.wallet,
    calculatedAt: Math.floor(Date.now() / 1000),
  }
}

/**
 * Calculate pot-level stats (NAV, vault value, all-time PnL approximation).
 */
export async function calcPotStats(pot: PotOnChainData): Promise<PotStats> {
  const solUsdPrice = await getSolUsdPrice()
  const vaultSol = Number(pot.vaultLamports) / LAMPORTS_PER_SOL
  const vaultUsd = vaultSol * solUsdPrice
  const totalShares = Number(pot.totalShares)
  const navPerShareSol = totalShares > 0 ? vaultSol / totalShares : 1
  const totalVolumeSol = Number(pot.totalVolume) / LAMPORTS_PER_SOL

  // Approximation: if vault > total deposited volume → positive all-time PnL
  // Accurate per-member PnL requires individual member data
  const allTimePnlSol = vaultSol - totalVolumeSol

  return {
    name: pot.name,
    pubkey: pot.pubkey,
    vaultSol,
    vaultUsd,
    navPerShareSol,
    memberCount: 0, // fill from pot.member_count
    totalVolumeSol,
    allTimePnlSol,
    solUsdPrice,
    tamagotchiLevel: pot.tamagotchiLevel,
    calculatedAt: Math.floor(Date.now() / 1000),
  }
}

/**
 * Aggregate PnL across multiple pots for a single member wallet.
 * Useful for the "Total Portfolio" view.
 */
export function aggregateTotalPnl(pnls: MemberPnL[]): {
  totalCurrentValueSol: number
  totalCurrentValueUsd: number
  totalPnlSol: number
  totalPnlUsd: number
  totalPnlPct: number
  netDepositedSol: number
} {
  const totalCurrentValueSol = pnls.reduce((s, p) => s + p.currentValueSol, 0)
  const totalCurrentValueUsd = pnls.reduce((s, p) => s + p.currentValueUsd, 0)
  const totalPnlSol = pnls.reduce((s, p) => s + p.pnlSol, 0)
  const totalPnlUsd = pnls.reduce((s, p) => s + p.pnlUsd, 0)
  const netDepositedSol = pnls.reduce((s, p) => s + p.netDepositedSol, 0)
  const totalPnlPct = netDepositedSol > 0 ? (totalPnlSol / netDepositedSol) * 100 : 0

  return {
    totalCurrentValueSol,
    totalCurrentValueUsd,
    totalPnlSol,
    totalPnlUsd,
    totalPnlPct,
    netDepositedSol,
  }
}
