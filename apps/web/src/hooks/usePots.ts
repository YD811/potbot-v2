'use client'

import { useCallback, useMemo } from 'react'
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'
import {
  getPotAddress,
  getVaultAddress,
  getMemberAddress,
  getProposalAddress,
  POT_PROGRAM_ID,
  IDL,
  potToDisplay,
  memberToDisplay,
} from '@potbot/sdk'
import type { PotDisplay, MemberDisplay, ProposalDisplay, PotState, MemberState } from '@potbot/sdk'

/* ── Provider + Program Hook ── */

export function useProgram() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  return useMemo(() => {
    if (!wallet) return null
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    })
    return new Program(IDL as any, POT_PROGRAM_ID, provider)
  }, [connection, wallet])
}

/* ── Fetch All POTs ── */

export function usePots() {
  const { connection } = useConnection()
  const program = useProgram()

  return useQuery({
    queryKey: ['pots'],
    queryFn: async (): Promise<PotDisplay[]> => {
      if (program) {
        try {
          const accounts = await (program.account as any).potAccount.all()
          const results: PotDisplay[] = []
          for (const acc of accounts) {
            const [vaultPda] = getVaultAddress(acc.publicKey)
            const vaultBalance = await connection.getBalance(vaultPda)
            results.push(potToDisplay(acc.publicKey, acc.account as PotState, vaultBalance))
          }
          return results
        } catch (e) {
          console.warn('Anchor fetch failed, falling back to raw:', e)
        }
      }

      // Fallback: raw getProgramAccounts
      const accounts = await connection.getProgramAccounts(POT_PROGRAM_ID)
      return accounts.map((acc) => ({
        pubkey: acc.pubkey.toBase58(),
        name: 'Loading...',
        emoji: '🪴',
        balance: 0,
        totalShares: 0,
        memberCount: 0,
        tradeCount: 0,
        tamagotchiLevel: 0,
        tamagotchiEmoji: '🥚',
        yieldStrategy: 'none',
        governanceLevel: 2,
        isPublic: true,
        createdAt: new Date(),
      }))
    },
    staleTime: 10_000,
    retry: 2,
  })
}

/* ── Fetch Single POT ── */

export function usePot(pubkey: string | undefined) {
  const { connection } = useConnection()
  const program = useProgram()

  return useQuery({
    queryKey: ['pot', pubkey],
    queryFn: async (): Promise<PotDisplay | null> => {
      if (!pubkey) return null
      const pk = new PublicKey(pubkey)
      const [vaultPda] = getVaultAddress(pk)

      if (program) {
        try {
          const potData = await (program.account as any).potAccount.fetch(pk)
          const vaultBalance = await connection.getBalance(vaultPda)
          return potToDisplay(pk, potData as PotState, vaultBalance)
        } catch (e) {
          console.warn('Anchor fetch failed:', e)
        }
      }

      const [potInfo, vaultBalance] = await Promise.all([
        connection.getAccountInfo(pk),
        connection.getBalance(vaultPda),
      ])
      if (!potInfo) return null

      return {
        pubkey,
        name: 'Unknown',
        emoji: '🪴',
        balance: vaultBalance / LAMPORTS_PER_SOL,
        totalShares: 0,
        memberCount: 0,
        tradeCount: 0,
        tamagotchiLevel: 0,
        tamagotchiEmoji: '🥚',
        yieldStrategy: 'none',
        governanceLevel: 2,
        isPublic: true,
        createdAt: new Date(),
      }
    },
    enabled: !!pubkey,
    staleTime: 5_000,
  })
}

/* ── Fetch Members ── */

export function useMembers(potPubkey: string | undefined) {
  const program = useProgram()

  return useQuery({
    queryKey: ['members', potPubkey],
    queryFn: async (): Promise<MemberDisplay[]> => {
      if (!potPubkey) return []

      if (program) {
        try {
          const members = await (program.account as any).memberAccount.all([
            { memcmp: { offset: 8, bytes: potPubkey } },
          ])
          const potPk = new PublicKey(potPubkey)
          const potData = await (program.account as any).potAccount.fetch(potPk)
          const totalShares = (potData as PotState).totalShares.toNumber()
          return members.map((m: any) =>
            memberToDisplay(m.account as MemberState, totalShares)
          )
        } catch (e) {
          console.warn('Anchor member fetch failed:', e)
        }
      }

      return []
    },
    enabled: !!potPubkey,
    staleTime: 10_000,
  })
}

/* ── Fetch Proposals ── */

export function useProposals(potPubkey: string | undefined) {
  const program = useProgram()

  return useQuery({
    queryKey: ['proposals', potPubkey],
    queryFn: async (): Promise<ProposalDisplay[]> => {
      if (!potPubkey) return []

      if (program) {
        try {
          const proposals = await (program.account as any).proposalAccount.all([
            { memcmp: { offset: 8, bytes: potPubkey } },
          ])
          return proposals.map((p: any) => {
            const d = p.account
            const typeKey = Object.keys(d.proposalType)[0]
            const statusKey = Object.keys(d.status)[0]
            const totalVotes = d.yesShares.toNumber() + d.noShares.toNumber()
            return {
              pubkey: p.publicKey.toBase58(),
              proposalId: d.proposalId.toNumber(),
              proposer: d.proposer.toBase58(),
              type: typeKey,
              description: d.description,
              status: statusKey,
              yesPercent: totalVotes > 0 ? (d.yesShares.toNumber() / totalVotes) * 100 : 0,
              noPercent: totalVotes > 0 ? (d.noShares.toNumber() / totalVotes) * 100 : 0,
              createdAt: new Date(d.createdAt.toNumber() * 1000),
              resolvedAt: d.resolvedAt.toNumber() > 0 ? new Date(d.resolvedAt.toNumber() * 1000) : null,
            } satisfies ProposalDisplay
          })
        } catch (e) {
          console.warn('Anchor proposal fetch failed:', e)
        }
      }

      return []
    },
    enabled: !!potPubkey,
    staleTime: 5_000,
  })
}

/* ─────── MUTATIONS ─────── */

/* ── Create POT ── */

export function useCreatePot() {
  const program = useProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      emoji: string
      isPublic: boolean
      minDeposit: number
      lockupSeconds: number
      yieldStrategy: number
      tradeLevel: number
      withdrawLevel: number
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const [potPda] = getPotAddress(publicKey, params.name)
      const [vaultPda] = getVaultAddress(potPda)

      if (program) {
        const tx = await program.methods
          .createPot({
            name: params.name,
            emoji: params.emoji,
            isPublic: params.isPublic,
            minDeposit: new BN(params.minDeposit * LAMPORTS_PER_SOL),
            lockupSeconds: new BN(params.lockupSeconds),
            yieldStrategy: params.yieldStrategy,
            maxYieldAllocationBps: 5000,
            tradeLevel: params.tradeLevel,
            withdrawLevel: params.withdrawLevel,
            memberChangeLevel: params.tradeLevel,
            settingsChangeLevel: 3,
            yieldChangeLevel: 2,
            voteTimeoutSeconds: new BN(86400),
            quorumBps: 5000,
          })
          .accounts({
            pot: potPda,
            vault: vaultPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        return { potAddress: potPda.toBase58(), tx }
      }

      return {
        potAddress: potPda.toBase58(),
        tx: 'demo-mode',
        message: `POT "${params.name}" PDA: ${potPda.toBase58()} (program not deployed)`,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pots'] })
    },
  })
}

/* ── Deposit ── */

export function useDeposit() {
  const program = useProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { potAddress: string; amountSol: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const potPk = new PublicKey(params.potAddress)
      const [memberPda] = getMemberAddress(potPk, publicKey)
      const [vaultPda] = getVaultAddress(potPk)
      const lamports = new BN(params.amountSol * LAMPORTS_PER_SOL)

      if (program) {
        const tx = await program.methods
          .deposit(lamports)
          .accounts({
            pot: potPk,
            vault: vaultPda,
            member: memberPda,
            depositor: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        return { tx }
      }

      return { tx: 'demo-mode' }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['members', vars.potAddress] })
    },
  })
}

/* ── Withdraw ── */

export function useWithdraw() {
  const program = useProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { potAddress: string; shares: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const potPk = new PublicKey(params.potAddress)
      const [memberPda] = getMemberAddress(potPk, publicKey)
      const [vaultPda] = getVaultAddress(potPk)

      if (program) {
        const tx = await program.methods
          .withdraw(new BN(params.shares))
          .accounts({
            pot: potPk,
            vault: vaultPda,
            member: memberPda,
            withdrawer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        return { tx }
      }

      return { tx: 'demo-mode' }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['members', vars.potAddress] })
    },
  })
}

/* ── Create Proposal ── */

export function useCreateProposal() {
  const program = useProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      nextProposalId: number
      proposalType: any
      description: string
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const potPk = new PublicKey(params.potAddress)
      const [proposalPda] = getProposalAddress(potPk, params.nextProposalId)
      const [memberPda] = getMemberAddress(potPk, publicKey)

      if (program) {
        const tx = await program.methods
          .createProposal({
            proposalType: params.proposalType,
            description: params.description,
          })
          .accounts({
            pot: potPk,
            proposal: proposalPda,
            member: memberPda,
            proposer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        return { proposalAddress: proposalPda.toBase58(), tx }
      }

      return { proposalAddress: proposalPda.toBase58(), tx: 'demo-mode' }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
    },
  })
}

/* ── Vote ── */

export function useVote() {
  const program = useProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      proposalAddress: string
      approve: boolean
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const potPk = new PublicKey(params.potAddress)
      const [memberPda] = getMemberAddress(potPk, publicKey)

      if (program) {
        const tx = await program.methods
          .vote(params.approve)
          .accounts({
            pot: potPk,
            proposal: new PublicKey(params.proposalAddress),
            member: memberPda,
            voter: publicKey,
          })
          .rpc()
        return { tx }
      }

      return { tx: 'demo-mode' }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
    },
  })
}

/* ── Execute Proposal ── */

export function useExecuteProposal() {
  const program = useProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      proposalAddress: string
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const potPk = new PublicKey(params.potAddress)
      const [vaultPda] = getVaultAddress(potPk)

      if (program) {
        const tx = await program.methods
          .executeProposal()
          .accounts({
            pot: potPk,
            vault: vaultPda,
            proposal: new PublicKey(params.proposalAddress),
            executor: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        return { tx }
      }

      return { tx: 'demo-mode' }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
    },
  })
}
