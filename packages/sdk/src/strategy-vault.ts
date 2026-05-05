/**
 * StrategyVault SDK methods
 * Wrappers around the on-chain strategy_vault instructions
 */
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  type TransactionInstruction,
} from '@solana/web3.js'
import type { AnchorProvider, Program } from '@coral-xyz/anchor'
import BN from 'bn.js'

export const STRATEGY_VAULT_DISCRIMINATOR = 'strategy_vault'

export interface StrategyVaultConfig {
  description: string
  strategyType: 'DCA' | 'Trend' | 'Reversion' | 'Yield' | 'Custom'
  entryFeeLamports: number
  performanceFeeBps: number
  managementFeeBps: number
  referralBps: number
  isPublic: boolean
}

export interface StrategyVaultAccount {
  pubkey: string
  potPubkey: string
  creator: string
  isActive: boolean
  entryFeeLamports: number
  performanceFeeBps: number
  managementFeeBps: number
  referralBps: number
  description: string
  tamagotchiLevel: number
  totalAumUsdCents: number
  totalFeesEarnedLamports: number
  participantCount: number
}

export type TamagotchiLevel = 0 | 1 | 2 | 3 | 4 | 5
export const TAMAGOTCHI_EMOJIS = ['🥚', '🐣', '🐤', '🦅', '🐉', '👑']
export const TAMAGOTCHI_NAMES  = ['Egg', 'Chick', 'Fledgling', 'Eagle', 'Dragon', 'Titan']

export function getTamagotchiInfo(level: TamagotchiLevel) {
  return {
    level,
    emoji: TAMAGOTCHI_EMOJIS[level],
    name: TAMAGOTCHI_NAMES[level],
    swapFeeBps: getSwapFeeBps(level),
    entryFeeDiscountBps: getEntryFeeDiscountBps(level),
    unlockedFeatures: getUnlockedFeatures(level),
  }
}

function getSwapFeeBps(level: TamagotchiLevel): number {
  const fees = [50, 45, 40, 30, 20, 10]
  return fees[level] ?? 50
}

function getEntryFeeDiscountBps(level: TamagotchiLevel): number {
  const discounts = [0, 500, 1000, 1500, 2500, 5000]
  return discounts[level] ?? 0
}

function getUnlockedFeatures(level: TamagotchiLevel): string[] {
  const features: Record<TamagotchiLevel, string[]> = {
    0: ['basic_swaps', 'governance'],
    1: ['basic_swaps', 'governance', 'yield_basic'],
    2: ['basic_swaps', 'governance', 'yield_basic', 'ai_agent'],
    3: ['basic_swaps', 'governance', 'yield_basic', 'ai_agent', 'jupiter_limit_orders'],
    4: ['basic_swaps', 'governance', 'yield_basic', 'ai_agent', 'jupiter_limit_orders', 'jupiter_dca'],
    5: ['basic_swaps', 'governance', 'yield_basic', 'ai_agent', 'jupiter_limit_orders', 'jupiter_dca', 'nft_shares'],
  }
  return features[level] ?? []
}

export function computeExpectedTamagotchiLevel(
  memberCount: number,
  aumUsdCents: number
): TamagotchiLevel {
  const aumUsd = aumUsdCents / 100
  if (memberCount >= 100 || aumUsd >= 1_000_000) return 5
  if (memberCount >= 50  || aumUsd >= 100_000)   return 4
  if (memberCount >= 20  || aumUsd >= 10_000)    return 3
  if (memberCount >= 10  || aumUsd >= 1_000)     return 2
  if (memberCount >= 3   || aumUsd >= 100)       return 1
  return 0
}

/**
 * Build a create_strategy_vault instruction
 * Call via program.methods.createStrategyVault(...)
 */
export function buildCreateStrategyVaultIx(
  program: Program<any>,
  authority: PublicKey,
  potPubkey: PublicKey,
  config: StrategyVaultConfig
): Promise<TransactionInstruction> {
  // PDA: ["strategy_vault", potPubkey]
  const [strategyVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('strategy_vault'), potPubkey.toBuffer()],
    program.programId
  )

  return program.methods
    .createStrategyVault(
      config.description,
      new BN(config.entryFeeLamports),
      config.performanceFeeBps,
      config.managementFeeBps,
      config.referralBps
    )
    .accounts({
      strategyVault: strategyVaultPda,
      pot: potPubkey,
      authority,
      systemProgram: SystemProgram.programId,
    })
    .instruction()
}

/**
 * Build a join_strategy_vault instruction
 */
export function buildJoinStrategyVaultIx(
  program: Program<any>,
  participant: PublicKey,
  potPubkey: PublicKey,
  referrer: PublicKey | null = null
): Promise<TransactionInstruction> {
  const [strategyVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('strategy_vault'), potPubkey.toBuffer()],
    program.programId
  )
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), potPubkey.toBuffer()],
    program.programId
  )

  const remainingAccounts = referrer
    ? [{ pubkey: referrer, isSigner: false, isWritable: true }]
    : []

  return program.methods
    .joinStrategyVault()
    .accounts({
      strategyVault: strategyVaultPda,
      pot: potPubkey,
      vault: vaultPda,
      participant,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .instruction()
}

/**
 * Build an exit_strategy_vault instruction
 */
export function buildExitStrategyVaultIx(
  program: Program<any>,
  participant: PublicKey,
  potPubkey: PublicKey
): Promise<TransactionInstruction> {
  const [strategyVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('strategy_vault'), potPubkey.toBuffer()],
    program.programId
  )
  const [memberPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('member'), potPubkey.toBuffer(), participant.toBuffer()],
    program.programId
  )

  return program.methods
    .exitStrategyVault()
    .accounts({
      strategyVault: strategyVaultPda,
      pot: potPubkey,
      member: memberPda,
      participant,
      systemProgram: SystemProgram.programId,
    })
    .instruction()
}

/**
 * Build an evolve_tamagotchi instruction (permissionless — anyone can call)
 */
export function buildEvolveTamagotchiIx(
  program: Program<any>,
  caller: PublicKey,
  potPubkey: PublicKey
): Promise<TransactionInstruction> {
  const [strategyVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('strategy_vault'), potPubkey.toBuffer()],
    program.programId
  )

  return program.methods
    .evolveTamagotchi()
    .accounts({
      strategyVault: strategyVaultPda,
      pot: potPubkey,
      caller,
    })
    .instruction()
}

/**
 * Format entry fee for display
 */
export function formatEntryFee(lamports: number, discountBps: number): string {
  const sol = lamports / LAMPORTS_PER_SOL
  const discounted = sol * (1 - discountBps / 10000)
  if (discountBps > 0) {
    return `${discounted.toFixed(4)} SOL (${discountBps / 100}% discount)`
  }
  return `${sol.toFixed(4)} SOL`
}

/**
 * Calculate creator earnings from fees
 */
export function computeCreatorEarnings(params: {
  participantCount: number
  entryFeeLamports: number
  totalVolumeUsd: number
  performanceFeeBps: number
  aumUsd: number
  managementFeeBps: number
}): { entryFees: number; performanceFees: number; managementFees: number; total: number } {
  const entryFees = params.participantCount * params.entryFeeLamports
  const performanceFees = Math.floor((params.totalVolumeUsd * params.performanceFeeBps) / 10000 * LAMPORTS_PER_SOL / 150) // approx SOL
  const managementFees = Math.floor((params.aumUsd * params.managementFeeBps) / 10000 / 365 * LAMPORTS_PER_SOL / 150)
  return {
    entryFees,
    performanceFees,
    managementFees,
    total: entryFees + performanceFees + managementFees,
  }
}
