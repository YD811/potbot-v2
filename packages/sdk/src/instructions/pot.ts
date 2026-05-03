import type { Program } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import type BN from 'bn.js'
import { getPotAddress, getVaultAddress, getMemberAddress, getProposalAddress, getVoterRecordAddress } from '../pda'

/* ── Create POT ── */

export interface CreatePotParams {
  name: string
  emoji: string
  isPublic: boolean
  minDeposit: BN
  lockupSeconds: BN
  yieldStrategy: number       // 0=none, 1=conservative, 2=balanced, 3=aggressive
  maxYieldAllocationBps: number
  /** Max single swap size as % of vault in bps (e.g. 2000 = 20%). 0 = no limit */
  maxTradeSizeBps: number
  /** Max number of members. 0 = unlimited */
  maxMembers: number
  /** Protocol performance fee in bps (0-1000) */
  protocolFeeBps: number
  tradeLevel: number
  withdrawLevel: number
  memberChangeLevel: number
  settingsChangeLevel: number
  yieldChangeLevel: number
  voteTimeoutSeconds: BN
  quorumBps: number
}

export async function createPot(
  program: Program,
  authority: PublicKey,
  params: CreatePotParams
) {
  const [potPda] = getPotAddress(params.name, authority)
  const [vaultPda] = getVaultAddress(potPda)

  return program.methods
    .createPot({
      name: params.name,
      emoji: params.emoji,
      isPublic: params.isPublic,
      minDeposit: params.minDeposit,
      lockupSeconds: params.lockupSeconds,
      yieldStrategy: params.yieldStrategy,
      maxYieldAllocationBps: params.maxYieldAllocationBps,
      maxTradeSizeBps: params.maxTradeSizeBps,
      maxMembers: params.maxMembers,
      protocolFeeBps: params.protocolFeeBps,
      tradeLevel: params.tradeLevel,
      withdrawLevel: params.withdrawLevel,
      memberChangeLevel: params.memberChangeLevel,
      settingsChangeLevel: params.settingsChangeLevel,
      yieldChangeLevel: params.yieldChangeLevel,
      voteTimeoutSeconds: params.voteTimeoutSeconds,
      quorumBps: params.quorumBps,
    })
    .accounts({
      pot: potPda,
      vault: vaultPda,
      authority,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}

/* ── Deposit ── */

export async function depositToPot(
  program: Program,
  potAddress: PublicKey,
  depositor: PublicKey,
  lamports: BN
) {
  const [memberPda] = getMemberAddress(potAddress, depositor)
  const [vaultPda] = getVaultAddress(potAddress)

  return program.methods
    .deposit(lamports)
    .accounts({
      pot: potAddress,
      vault: vaultPda,
      member: memberPda,
      depositor,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}

/* ── Withdraw ── */

export async function withdrawFromPot(
  program: Program,
  potAddress: PublicKey,
  withdrawer: PublicKey,
  shares: BN
) {
  const [memberPda] = getMemberAddress(potAddress, withdrawer)
  const [vaultPda] = getVaultAddress(potAddress)

  return program.methods
    .withdraw(shares)
    .accounts({
      pot: potAddress,
      vault: vaultPda,
      member: memberPda,
      withdrawer,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}

/* ── Create Proposal ── */

export async function createProposal(
  program: Program,
  potAddress: PublicKey,
  proposer: PublicKey,
  nextProposalId: number,
  params: {
    proposalType: any
    description: string
  }
) {
  const [proposalPda] = getProposalAddress(potAddress, nextProposalId)
  const [memberPda] = getMemberAddress(potAddress, proposer)

  return program.methods
    .createProposal({
      proposalType: params.proposalType,
      description: params.description,
    })
    .accounts({
      pot: potAddress,
      proposal: proposalPda,
      member: memberPda,
      proposer,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}

/* ── Vote ── */

export async function voteOnProposal(
  program: Program,
  potAddress: PublicKey,
  proposalAddress: PublicKey,
  voter: PublicKey,
  approve: boolean
) {
  const [memberPda] = getMemberAddress(potAddress, voter)
  const [voterRecordPda] = getVoterRecordAddress(proposalAddress, voter)

  return program.methods
    .vote(approve)
    .accounts({
      pot: potAddress,
      proposal: proposalAddress,
      member: memberPda,
      voterRecord: voterRecordPda,
      voter,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}

/* ── Execute Proposal ── */

export async function executeProposal(
  program: Program,
  potAddress: PublicKey,
  proposalAddress: PublicKey,
  executor: PublicKey
) {
  const [vaultPda] = getVaultAddress(potAddress)

  return program.methods
    .executeProposal()
    .accounts({
      pot: potAddress,
      vault: vaultPda,
      proposal: proposalAddress,
      executor,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}
