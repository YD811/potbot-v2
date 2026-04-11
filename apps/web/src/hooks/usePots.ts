'use client'

import { useMemo } from 'react'
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
} from '@potbot/sdk'
import { useMockStore } from '@/lib/mock-store'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'

/* ── Program Hook (null when program not deployed) ── */

export function useProgram() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  return useMemo(() => {
    if (!wallet) return null
    try {
      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
      return new Program(IDL as any, provider)
    } catch {
      return null
    }
  }, [connection, wallet])
}

/* ── Check if program is deployed ── */

function useIsProgramLive() {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['program-live'],
    queryFn: async () => {
      try {
        const info = await connection.getAccountInfo(POT_PROGRAM_ID)
        return info !== null && info.executable
      } catch {
        return false
      }
    },
    staleTime: 60_000,
    retry: false,
  })
}

/* ══════════════════════════════
   QUERIES
   ══════════════════════════════ */

/* ── All POTs ── */

export function usePots() {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const program = useProgram()
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['pots', isLive],
    queryFn: async () => {
      // Try on-chain first
      if (isLive && program) {
        try {
          const accounts = await (program.account as any).potAccount.all()
          return accounts.map((acc: any) => {
            const d = acc.account
            const stratKey = Object.keys(d.config.yieldStrategy)[0]
            return {
              pubkey: acc.publicKey.toBase58(),
              name: d.name,
              emoji: d.emoji || '🪴',
              balance: 0,
              totalShares: d.totalShares.toNumber(),
              memberCount: d.memberCount,
              tradeCount: d.tradeCount,
              tamagotchiLevel: d.tamagotchiLevel,
              tamagotchiEmoji: ['🥚','🐣','🐤','🦅','🐉','👑'][d.tamagotchiLevel] || '🥚',
              yieldStrategy: stratKey,
              governanceLevel: d.governance.tradeLevel,
              isPublic: d.config.isPublic,
              createdAt: new Date(d.createdAt.toNumber() * 1000),
            }
          })
        } catch (e) {
          console.warn('On-chain fetch failed, using mock:', e)
        }
      }

      // Mock fallback
      return mockStore.pots.map((p) => {
        const tama = calculateTamaStats({
          tradeVolume: p.totalVolume,
          memberCount: p.memberCount,
          winRate: 0.6,
          yieldApy: p.yieldStrategy * 0.05,
          ageSeconds: (Date.now() - p.createdAt) / 1000,
        })
        return {
          pubkey: p.pubkey,
          name: p.name,
          emoji: p.emoji,
          balance: p.balance,
          totalShares: p.totalShares,
          memberCount: p.memberCount,
          tradeCount: p.tradeCount,
          tamagotchiLevel: tama.level,
          tamagotchiEmoji: tama.emoji,
          yieldStrategy: ['None', 'Conservative', 'Balanced', 'Aggressive'][p.yieldStrategy] || 'None',
          governanceLevel: p.tradeLevel,
          isPublic: p.isPublic,
          createdAt: new Date(p.createdAt),
        }
      })
    },
    staleTime: 3_000,
  })
}

/* ── Single POT ── */

export function usePot(pubkey: string | undefined) {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()

  return useQuery({
    queryKey: ['pot', pubkey, isLive],
    queryFn: async () => {
      if (!pubkey) return null

      const mock = mockStore.pots.find((p) => p.pubkey === pubkey)
      if (!mock) return null

      const tama = calculateTamaStats({
        tradeVolume: mock.totalVolume,
        memberCount: mock.memberCount,
        winRate: 0.6,
        yieldApy: mock.yieldStrategy * 0.05,
        ageSeconds: (Date.now() - mock.createdAt) / 1000,
      })

      return {
        pubkey: mock.pubkey,
        name: mock.name,
        emoji: mock.emoji,
        balance: mock.balance,
        totalShares: mock.totalShares,
        memberCount: mock.memberCount,
        tradeCount: mock.tradeCount,
        tamagotchiLevel: tama.level,
        tamagotchiEmoji: tama.emoji,
        tamagotchiXp: tama.xp,
        tamagotchiXpToNext: tama.xpToNext,
        tamagotchiStage: tama.stage,
        yieldStrategy: ['None', 'Conservative', 'Balanced', 'Aggressive'][mock.yieldStrategy] || 'None',
        governanceLevel: mock.tradeLevel,
        withdrawLevel: mock.withdrawLevel,
        isPublic: mock.isPublic,
        authority: mock.authority,
        nextProposalId: mock.nextProposalId,
        createdAt: new Date(mock.createdAt),
      }
    },
    enabled: !!pubkey,
    staleTime: 2_000,
  })
}

/* ── Members ── */

export function useMembers(potPubkey: string | undefined) {
  const mockStore = useMockStore()

  return useQuery({
    queryKey: ['members', potPubkey],
    queryFn: async () => {
      if (!potPubkey) return []
      const pot = mockStore.pots.find((p) => p.pubkey === potPubkey)
      const totalShares = pot?.totalShares ?? 0

      return mockStore.members
        .filter((m) => m.potPubkey === potPubkey)
        .map((m) => ({
          wallet: m.wallet,
          shares: m.shares,
          sharePercent: totalShares > 0 ? (m.shares / totalShares) * 100 : 0,
          depositTotal: m.depositTotal,
          withdrawTotal: m.withdrawTotal,
          pnl: m.withdrawTotal - m.depositTotal,
          joinedAt: new Date(m.joinedAt),
        }))
    },
    enabled: !!potPubkey,
    staleTime: 3_000,
  })
}

/* ── Proposals ── */

export function useProposals(potPubkey: string | undefined) {
  const mockStore = useMockStore()

  return useQuery({
    queryKey: ['proposals', potPubkey],
    queryFn: async () => {
      if (!potPubkey) return []

      return mockStore.proposals
        .filter((p) => p.potPubkey === potPubkey)
        .map((p) => {
          const totalVotes = p.yesShares + p.noShares
          return {
            pubkey: p.pubkey,
            proposalId: p.proposalId,
            proposer: p.proposer,
            type: p.type,
            description: p.description,
            status: p.status,
            yesPercent: totalVotes > 0 ? Math.round((p.yesShares / totalVotes) * 100) : 0,
            noPercent: totalVotes > 0 ? Math.round((p.noShares / totalVotes) * 100) : 0,
            yesShares: p.yesShares,
            noShares: p.noShares,
            totalSharesSnapshot: p.totalSharesSnapshot,
            createdAt: new Date(p.createdAt),
            resolvedAt: null,
          }
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    enabled: !!potPubkey,
    staleTime: 2_000,
  })
}

/* ══════════════════════════════
   MUTATIONS
   ══════════════════════════════ */

export function useCreatePot() {
  const mockStore = useMockStore()
  const { publicKey } = useWallet()
  const program = useProgram()
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

      // Try on-chain
      if (program) {
        try {
          const [potPda] = getPotAddress(publicKey, params.name)
          const [vaultPda] = getVaultAddress(potPda)
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
        } catch (e) {
          console.warn('On-chain createPot failed, using mock:', e)
        }
      }

      // Mock fallback
      const potAddress = mockStore.createPot({
        authority: publicKey.toBase58(),
        ...params,
      })
      return { potAddress, tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pots'] })
    },
  })
}

export function useDeposit() {
  const mockStore = useMockStore()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { potAddress: string; amountSol: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')
      mockStore.deposit(params.potAddress, publicKey.toBase58(), params.amountSol)
      return { tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['members', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pots'] })
    },
  })
}

export function useWithdraw() {
  const mockStore = useMockStore()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { potAddress: string; shares: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')
      mockStore.withdraw(params.potAddress, publicKey.toBase58(), params.shares)
      return { tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['members', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pots'] })
    },
  })
}

export function useCreateProposal() {
  const mockStore = useMockStore()
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
      const typeKey = typeof params.proposalType === 'string'
        ? params.proposalType
        : Object.keys(params.proposalType)[0]

      const proposalAddress = mockStore.createProposal({
        potPubkey: params.potAddress,
        proposer: publicKey.toBase58(),
        type: typeKey,
        description: params.description,
      })
      return { proposalAddress, tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
    },
  })
}

export function useVote() {
  const mockStore = useMockStore()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      proposalAddress: string
      approve: boolean
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')
      mockStore.vote(params.proposalAddress, publicKey.toBase58(), params.approve)
      return { tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
    },
  })
}

export function useExecuteProposal() {
  const mockStore = useMockStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      proposalAddress: string
    }) => {
      mockStore.executeProposal(params.proposalAddress)
      return { tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pots'] })
    },
  })
}
