import type { PublicKey } from '@solana/web3.js'
import type BN from 'bn.js'

/* ── Yield Strategy ── */
export type YieldStrategy =
  | { none: {} }
  | { conservative: {} }
  | { balanced: {} }
  | { aggressive: {} }

/* ── POT State (mirrors on-chain PotAccount) ── */
export interface PotState {
  authority: PublicKey
  name: string
  emoji: string
  vaultBump: number
  potBump: number
  totalShares: BN
  memberCount: number
  tradeCount: number
  totalVolume: BN
  tamagotchiLevel: number
  tamagotchiXp: BN
  communityTokenMint: PublicKey
  config: PotConfig
  governance: GovSettings
  nextProposalId: BN
  createdAt: BN
}

export interface PotConfig {
  isPublic: boolean
  minDeposit: BN
  lockupSeconds: BN
  yieldStrategy: YieldStrategy
  maxYieldAllocationBps: number
}

export interface GovSettings {
  tradeLevel: number
  withdrawLevel: number
  memberChangeLevel: number
  settingsChangeLevel: number
  yieldChangeLevel: number
  voteTimeoutSeconds: BN
  quorumBps: number
}

/* ── Member State ── */
export interface MemberState {
  pot: PublicKey
  wallet: PublicKey
  shares: BN
  depositTotal: BN
  withdrawTotal: BN
  joinedAt: BN
  lastDepositAt: BN
  bump: number
}

/* ── Proposal ── */
export type ProposalType =
  | { swap: { fromMint: PublicKey; toMint: PublicKey; amountIn: BN; minAmountOut: BN } }
  | { withdraw: { beneficiary: PublicKey; amount: BN } }
  | { changeSettings: { newTradeLevel: number; newWithdrawLevel: number } }
  | { changeYield: { newStrategy: number } }

export type ProposalStatus =
  | { active: {} }
  | { passed: {} }
  | { rejected: {} }
  | { executed: {} }
  | { expired: {} }

export interface ProposalState {
  pot: PublicKey
  proposalId: BN
  proposer: PublicKey
  proposalType: ProposalType
  description: string
  status: ProposalStatus
  yesShares: BN
  noShares: BN
  totalSharesSnapshot: BN
  createdAt: BN
  resolvedAt: BN
  bump: number
}

/* ── Duel State ── */
export interface DuelState {
  id: BN
  challenger: PublicKey
  defender: PublicKey
  stakeBps: number
  durationSeconds: BN
  startTs: BN
  status: DuelStatus
  challengerStartValue: BN
  defenderStartValue: BN
  challengerEndValue: BN
  defenderEndValue: BN
  challengerEscrow: PublicKey
  defenderEscrow: PublicKey
  winner: PublicKey | null
  challengerPnlBps: number
  defenderPnlBps: number
}

export type DuelStatus =
  | { pending: {} }
  | { accepted: {} }
  | { active: {} }
  | { settling: {} }
  | { completed: {} }
  | { cancelled: {} }

/* ── Frontend-friendly types ── */
export interface PotDisplay {
  pubkey: string
  name: string
  emoji: string
  balance: number
  totalShares: number
  memberCount: number
  tradeCount: number
  tamagotchiLevel: number
  tamagotchiEmoji: string
  yieldStrategy: string
  governanceLevel: number
  isPublic: boolean
  createdAt: Date
}

export interface MemberDisplay {
  wallet: string
  shares: number
  sharePercent: number
  depositTotal: number
  withdrawTotal: number
  pnl: number
  joinedAt: Date
}

export interface ProposalDisplay {
  pubkey: string
  proposalId: number
  proposer: string
  type: string
  description: string
  status: string
  yesPercent: number
  noPercent: number
  createdAt: Date
  resolvedAt: Date | null
}
