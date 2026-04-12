/**
 * Position tracking — each executed swap creates a Position record.
 * Used for PnL analytics and strategy settings.
 */

export interface Position {
  id: string
  potPubkey: string
  /** Proposal ID that created this position */
  proposalId: number
  /** Token being held */
  tokenMint: string
  tokenSymbol: string
  tokenDecimals: number
  /** Amount of tokenMint held (raw units) */
  amount: number
  /** SOL/USDC spent to acquire this position */
  costBasisSol: number
  /** Price at entry (USD per token) */
  entryPriceUsd: number
  /** Unix ms when the trade executed */
  openedAt: number
  /** Whether position is still open */
  isOpen: boolean
  /** If closed: price at close */
  closePriceUsd?: number
  /** tx signature of the opening swap */
  openTxSig?: string
  /** Strategy settings for this position */
  strategy: PositionStrategy
}

export interface PositionStrategy {
  /** Auto-sell if price drops this % below entry. 0 = disabled */
  stopLossPct: number
  /** Auto-sell if price rises this % above entry. 0 = disabled */
  takeProfitPct: number
  /** Max % of vault that can be in this position */
  maxAllocationPct: number
  /** DeFi routing when idle — none/kamino/drift/marginfi */
  defiRoute: 'none' | 'kamino' | 'drift' | 'marginfi'
  /** % of position to route to DeFi yield */
  defiAllocationPct: number
}

export const DEFAULT_STRATEGY: PositionStrategy = {
  stopLossPct: 0,
  takeProfitPct: 0,
  maxAllocationPct: 20,
  defiRoute: 'none',
  defiAllocationPct: 0,
}

/* ── Seed positions for mock demo ── */

export const SEED_POSITIONS: Position[] = [
  {
    id: 'pos-bonk-001',
    potPubkey: 'DemoPoT1111111111111111111111111111111111111',
    proposalId: 1,
    tokenMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    tokenSymbol: 'BONK',
    tokenDecimals: 5,
    amount: 5_000_000_000, // 50,000 BONK
    costBasisSol: 10,
    entryPriceUsd: 0.0000125,
    openedAt: Date.now() - 5 * 86400000,
    isOpen: true,
    strategy: {
      stopLossPct: 20,
      takeProfitPct: 100,
      maxAllocationPct: 25,
      defiRoute: 'none',
      defiAllocationPct: 0,
    },
  },
  {
    id: 'pos-usdc-001',
    potPubkey: 'DemoPoT1111111111111111111111111111111111111',
    proposalId: 2,
    tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    amount: 25_000_000, // 25 USDC
    costBasisSol: 5,
    entryPriceUsd: 1.0,
    openedAt: Date.now() - 2 * 86400000,
    isOpen: true,
    strategy: {
      stopLossPct: 0,
      takeProfitPct: 0,
      maxAllocationPct: 50,
      defiRoute: 'kamino',
      defiAllocationPct: 80,
    },
  },
  {
    id: 'pos-jito-001',
    potPubkey: 'DemoPoT2222222222222222222222222222222222222',
    proposalId: 1,
    tokenMint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    tokenSymbol: 'JitoSOL',
    tokenDecimals: 9,
    amount: 2_000_000_000, // 2 JitoSOL
    costBasisSol: 2,
    entryPriceUsd: 180,
    openedAt: Date.now() - 10 * 86400000,
    isOpen: true,
    strategy: {
      stopLossPct: 15,
      takeProfitPct: 50,
      maxAllocationPct: 40,
      defiRoute: 'marginfi',
      defiAllocationPct: 100,
    },
  },
]

/* ── PnL calculation ── */

export interface PositionPnl {
  position: Position
  currentPriceUsd: number
  pnlUsd: number
  pnlPct: number
  currentValueUsd: number
  entryValueUsd: number
  /** Current value vs vault balance */
  allocationPct: number
  stopLossTriggerUsd: number | null
  takeProfitTriggerUsd: number | null
  strategyStatus: 'normal' | 'near_stop' | 'near_tp' | 'triggered_stop' | 'triggered_tp'
}

export function calcPositionPnl(
  pos: Position,
  currentPriceUsd: number,
  vaultBalanceUsd: number
): PositionPnl {
  const tokenAmount = pos.amount / Math.pow(10, pos.tokenDecimals)
  const entryValueUsd = tokenAmount * pos.entryPriceUsd
  const currentValueUsd = tokenAmount * currentPriceUsd
  const pnlUsd = currentValueUsd - entryValueUsd
  const pnlPct = entryValueUsd > 0 ? (pnlUsd / entryValueUsd) * 100 : 0
  const allocationPct = vaultBalanceUsd > 0 ? (currentValueUsd / vaultBalanceUsd) * 100 : 0

  const slPct = pos.strategy.stopLossPct
  const tpPct = pos.strategy.takeProfitPct

  const stopLossTriggerUsd = slPct > 0 ? pos.entryPriceUsd * (1 - slPct / 100) : null
  const takeProfitTriggerUsd = tpPct > 0 ? pos.entryPriceUsd * (1 + tpPct / 100) : null

  let strategyStatus: PositionPnl['strategyStatus'] = 'normal'
  if (stopLossTriggerUsd && currentPriceUsd <= stopLossTriggerUsd) {
    strategyStatus = 'triggered_stop'
  } else if (takeProfitTriggerUsd && currentPriceUsd >= takeProfitTriggerUsd) {
    strategyStatus = 'triggered_tp'
  } else if (stopLossTriggerUsd && currentPriceUsd <= stopLossTriggerUsd * 1.1) {
    strategyStatus = 'near_stop'
  } else if (takeProfitTriggerUsd && currentPriceUsd >= takeProfitTriggerUsd * 0.9) {
    strategyStatus = 'near_tp'
  }

  return {
    position: pos,
    currentPriceUsd,
    pnlUsd,
    pnlPct,
    currentValueUsd,
    entryValueUsd,
    allocationPct,
    stopLossTriggerUsd,
    takeProfitTriggerUsd,
    strategyStatus,
  }
}

export function formatPct(pct: number, decimals = 1): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(decimals)}%`
}