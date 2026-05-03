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
  getVoterRecordAddress,
  POT_PROGRAM_ID,
  IDL,
} from '@potbot/sdk'
import { useMockStore } from '@/lib/mock-store'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'

const TAMA_EMOJIS = ['🦚','🐓','🐔','🦅','🐉','👑']

/* ── Anchor program instance ── */

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

/* ── Detect if on-chain program is live ── */

export function useIsProgramLive() {
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

export function usePots() {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const program = useProgram()
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['pots', isLive],
    queryFn: async () => {
      if (isLive && program) {
        try {
          const accounts = await (program.account as any).potAccount.all()
          const withBalances = await Promise.all(
            accounts.map(async (acc: any) => {
              const d = acc.account
              const [vaultPda] = getVaultAddress(acc.publicKey)
              const vaultInfo = await connection.getAccountInfo(vaultPda)
              const balance = (vaultInfo?.lamports ?? 0) / LAMPORTS_PER_SOL
              const tama = calculateTamaStats({
                tradeVolume: d.totalVolume.toNumber() / LAMPORTS_PER_SOL,
                memberCount: d.memberCount,
                winRate: 0,
                yieldApy: 0,
                ageSeconds: Math.floor(Date.now() / 1000 - d.createdAt.toNumber()),
              })
              const stratKey = Object.keys(d.config.yieldStrategy)[0]
              return {
                pubkey: acc.publicKey.toBase58(),
                name: d.name,
                emoji: d.emoji || '🤴',
                balance,
                totalShares: d.totalShares.toNumber(),
                memberCount: d.memberCount,
                tradeCount: d.tradeCount,
                tamagotchiLevel: tama.level,
                tamagotchiEmoji: tama.emoji,
                tamagotchiXp: tama.xp,
                yieldStrategy: stratKey,
                governanceLevel: d.governance.tradeLevel,
                isPublic: d.config.isPublic,
                createdAt: new Date(d.createdAt.toNumber() * 1000),
                sharesPerSol: d.sharesPerSol?.toNumber() ?? 100,
              }
            })
          )
          return withBalances
        } catch (e) {
          console.warn('On-chain fetch failed, using mock:', e)
        }
      }

      // Mock fallback — use .getState() to always get fresh data
      return useMockStore.getState().pots.map((p) => {
        const tama = calculateTamaStats({
          tradeVolume: p.tradeCount * 2,
          memberCount: p.memberCount,
          winRate: 0.6,
          yieldApy: p.yieldStrategy === 3 ? 0.30 : p.yieldStrategy === 2 ? 0.15 : p.yieldStrategy === 1 ? 0.06 : 0,
          ageSeconds: 7 * 86400,
        })
        return {
          ...p,
          tamagotchiLevel: tama.level,
          tamagotchiEmoji: tama.emoji,
          tamagotchiXp: tama.xp,
          trustLevel: p.trustLevel ?? 'unverified',
          verifiedBy: p.verifiedBy ?? null,
          auditUrl: p.auditUrl ?? null,
        }
      })
    },
    staleTime: 5_000,
  })
}

export function usePot(pubkey?: string) {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const program = useProgram()
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['pot', pubkey, isLive],
    queryFn: async () => {
      if (!pubkey) return null

      if (isLive && program) {
        try {
          const pk = new PublicKey(pubkey)
          const d = await (program.account as any).potAccount.fetch(pk)
          const [vaultPda] = getVaultAddress(pk)
          const vaultInfo = await connection.getAccountInfo(vaultPda)
          const balance = (vaultInfo?.lamports ?? 0) / LAMPORTS_PER_SOL
          const stratKey = Object.keys(d.config.yieldStrategy)[0]
          const tama = calculateTamaStats({
            tradeVolume: d.totalVolume.toNumber() / LAMPORTS_PER_SOL,
            memberCount: d.memberCount,
            winRate: 0,
            yieldApy: 0,
            ageSeconds: Math.floor(Date.now() / 1000 - d.createdAt.toNumber()),
          })
          return {
            pubkey,
            name: d.name,
            emoji: d.emoji || '🤴',
            balance,
            totalShares: d.totalShares.toNumber(),
            memberCount: d.memberCount,
            tradeCount: d.tradeCount,
            tamagotchiLevel: tama.level,
            tamagotchiEmoji: tama.emoji,
            tamagotchiXp: tama.xp,
            yieldStrategy: stratKey,
            governanceLevel: d.governance.tradeLevel,
            withdrawGovernanceLevel: d.governance.withdrawLevel,
            isPublic: d.config.isPublic,
            minDeposit: d.config.minDeposit.toNumber() / LAMPORTS_PER_SOL,
            lockupSeconds: d.config.lockupSeconds.toNumber(),
            nextProposalId: d.nextProposalId.toNumber(),
            authority: d.authority.toBase58(),
            createdAt: new Date(d.createdAt.toNumber() * 1000),
            tokenMint: d.tokenMint?.toBase58() ?? null,
            sharesPerSol: d.sharesPerSol?.toNumber() ?? 100,
          }
        } catch (e) {
          console.warn('On-chain pot fetch failed:', e)
        }
      }

      const store = useMockStore.getState()
      const p = store.pots.find((p) => p.pubkey === pubkey)
      if (!p) return null
      const tama = calculateTamaStats({
        tradeVolume: p.tradeCount * 2,
        memberCount: p.memberCount,
        winRate: 0.6,
        yieldApy: 0.08,
        ageSeconds: 7 * 86400,
      })
      return {
        ...p,
        tamagotchiLevel: tama.level,
        tamagotchiEmoji: tama.emoji,
        tamagotchiXp: tama.xp,
        withdrawGovernanceLevel: 2,
        minDeposit: 0.01,
        lockupSeconds: 0,
        nextProposalId: store.getProposals(pubkey).length,
        authority: p.pubkey,
      }
    },
    enabled: !!pubkey,
    staleTime: 5_000,
  })
}

export function useMembers(potPubkey?: string) {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const program = useProgram()

  return useQuery({
    queryKey: ['members', potPubkey, isLive],
    queryFn: async () => {
      if (!potPubkey) return []

      if (isLive && program) {
        try {
          const potPk = new PublicKey(potPubkey)
          const potAcc = await (program.account as any).potAccount.fetch(potPk)
          const accounts = await (program.account as any).memberAccount.all([
            { memcmp: { offset: 8, bytes: potPubkey } },
          ])
          return accounts.map((acc: any) => {
            const d = acc.account
            const totalShares = potAcc.totalShares.toNumber()
            const shares = d.shares.toNumber()
            return {
              wallet: d.wallet.toBase58(),
              shares,
              sharePercent: totalShares > 0 ? (shares / totalShares) * 100 : 0,
              depositTotal: d.depositTotal.toNumber() / LAMPORTS_PER_SOL,
              withdrawTotal: d.withdrawTotal.toNumber() / LAMPORTS_PER_SOL,
              pnl: (d.withdrawTotal.toNumber() - d.depositTotal.toNumber()) / LAMPORTS_PER_SOL,
              joinedAt: new Date(d.joinedAt.toNumber() * 1000),
            }
          })
        } catch (e) {
          console.warn('On-chain members fetch failed:', e)
        }
      }

      const store = useMockStore.getState()
      const members = store.getMembers(potPubkey)
      const pot = store.pots.find((p) => p.pubkey === potPubkey)
      const totalShares = pot?.totalShares ?? 1
      return members.map((m) => ({
        ...m,
        sharePercent: (m.shares / totalShares) * 100,
        pnl: m.withdrawTotal - m.depositTotal,
      }))
    },
    enabled: !!potPubkey,
    staleTime: 5_000,
  })
}

export function useProposals(potPubkey?: string) {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const program = useProgram()

  return useQuery({
    queryKey: ['proposals', potPubkey, isLive],
    queryFn: async () => {
      if (!potPubkey) return []

      if (isLive && program) {
        try {
          const accounts = await (program.account as any).proposalAccount.all([
            { memcmp: { offset: 8, bytes: potPubkey } },
          ])
          return accounts.map((acc: any) => {
            const p = acc.account
            const typeKey = Object.keys(p.proposalType)[0]
            const snapshot = p.totalSharesSnapshot.toNumber()
            return {
              pubkey: acc.publicKey.toBase58(),
              proposalId: p.proposalId.toNumber(),
              proposer: p.proposer.toBase58(),
              type: typeKey,
              description: p.description,
              status: Object.keys(p.status)[0],
              yesPercent: snapshot > 0 ? Math.round((p.yesShares.toNumber() / snapshot) * 100) : 0,
              noPercent: snapshot > 0 ? Math.round((p.noShares.toNumber() / snapshot) * 100) : 0,
              yesShares: p.yesShares.toNumber(),
              noShares: p.noShares.toNumber(),
              totalSharesSnapshot: snapshot,
              createdAt: new Date(p.createdAt.toNumber() * 1000),
              resolvedAt: p.resolvedAt.toNumber() > 0 ? new Date(p.resolvedAt.toNumber() * 1000) : null,
            }
          }).sort((a: any, b: any) => b.proposalId - a.proposalId)
        } catch (e) {
          console.warn('On-chain proposals fetch failed:', e)
        }
      }

      return useMockStore.getState().getProposals(potPubkey)
        .map((p) => {
          return {
            ...p,
            yesPercent: p.totalSharesSnapshot > 0 ? Math.round((p.yesShares / p.totalSharesSnapshot) * 100) : 0,
            noPercent: p.totalSharesSnapshot > 0 ? Math.round((p.noShares / p.totalSharesSnapshot) * 100) : 0,
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
  const { publicKey } = useWallet()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()
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
      maxTradeSizeBps?: number
      maxMembers?: number
      protocolFeeBps?: number
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      if (isLive && program) {
        try {
          const [potPda] = getPotAddress(params.name, publicKey)
          const [vaultPda] = getVaultAddress(potPda)
          // @ts-ignore — Anchor IDL types are too deeply nested for TS inference
          const tx = await program.methods
            .createPot({
              name: params.name,
              emoji: params.emoji,
              isPublic: params.isPublic,
              minDeposit: new BN(Math.round(params.minDeposit * LAMPORTS_PER_SOL)),
              lockupSeconds: new BN(params.lockupSeconds),
              yieldStrategy: params.yieldStrategy,
              maxYieldAllocationBps: 5000,
              tradeLevel: params.tradeLevel,
              withdrawLevel: params.withdrawLevel,
              memberChangeLevel: params.tradeLevel,
              settingsChangeLevel: 3,
              yieldChangeLevel: 2,
              voteTimeoutSeconds: new BN(7 * 86400),
              quorumBps: 5001,
              maxTradeSizeBps: params.maxTradeSizeBps ?? 5000,
              maxMembers: params.maxMembers ?? 1000,
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
          console.warn('On-chain createPot failed, falling back to mock:', e)
        }
      }

      // Always use .getState() in async callbacks to avoid stale closure
      const potAddress = useMockStore.getState().createPot({
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
  const { publicKey } = useWallet()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { potAddress: string; amountSol: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      if (isLive && program) {
        try {
          const potPk = new PublicKey(params.potAddress)
          const [vaultPda] = getVaultAddress(potPk)
          const [memberPda] = getMemberAddress(potPk, publicKey)
          const lamports = Math.round(params.amountSol * LAMPORTS_PER_SOL)
          const tx = await program.methods
            .deposit(new BN(lamports))
            .accounts({
              pot: potPk,
              vault: vaultPda,
              member: memberPda,
              depositor: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          return { tx }
        } catch (e) {
          console.warn('On-chain deposit failed, falling back to mock:', e)
        }
      }

      useMockStore.getState().deposit(params.potAddress, publicKey.toBase58(), params.amountSol)
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
  const { publicKey } = useWallet()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { potAddress: string; shares: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      if (isLive && program) {
        try {
          const potPk = new PublicKey(params.potAddress)
          const [vaultPda] = getVaultAddress(potPk)
          const [memberPda] = getMemberAddress(potPk, publicKey)
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
        } catch (e) {
          console.warn('On-chain withdraw failed, falling back to mock:', e)
        }
      }

      useMockStore.getState().withdraw(params.potAddress, publicKey.toBase58(), params.shares)
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
  const { publicKey } = useWallet()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      nextProposalId: number
      proposalType: Record<string, any>
      description: string
      /** Optional: persisted to Supabase for Jupiter execute flow */
      swapMeta?: { inputMint: string; outputMint: string; amountLamports: number; inputSymbol?: string; outputSymbol?: string }
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      if (isLive && program) {
        try {
          const potPk = new PublicKey(params.potAddress)
          const [memberPda] = getMemberAddress(potPk, publicKey)
          const [proposalPda] = getProposalAddress(potPk, params.nextProposalId)
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
          const proposalAddress = proposalPda.toBase58()
          if (params.swapMeta) {
            fetch(`/api/proposals/${proposalAddress}/meta`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(params.swapMeta),
            }).catch(() => {})
          }
          return { proposalAddress, tx }
        } catch (e) {
          console.warn('On-chain createProposal failed, falling back to mock:', e)
        }
      }

      const typeKey = Object.keys(params.proposalType)[0]
      const proposalAddress = useMockStore.getState().createProposal({
        potPubkey: params.potAddress,
        proposer: publicKey.toBase58(),
        type: typeKey,
        description: params.description,
      })
      if (params.swapMeta) {
        fetch(`/api/proposals/${proposalAddress}/meta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params.swapMeta),
        }).catch(() => {})
      }
      return { proposalAddress, tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
    },
  })
}

export function useVote() {
  const { publicKey } = useWallet()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      proposalAddress: string
      approve: boolean
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      if (isLive && program) {
        try {
          const potPk = new PublicKey(params.potAddress)
          const proposalPk = new PublicKey(params.proposalAddress)
          const [memberPda] = getMemberAddress(potPk, publicKey)
          const [voterRecordPda] = getVoterRecordAddress(proposalPk, publicKey)
          // @ts-ignore — Anchor method builder types are too deep for TS inference here.
          const tx = await program.methods
            .vote(params.approve)
            .accounts({
              pot: potPk,
              proposal: proposalPk,
              member: memberPda,
              voterRecord: voterRecordPda,
              voter: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          return { tx }
        } catch (e) {
          console.warn('On-chain vote failed, falling back to mock:', e)
        }
      }

      useMockStore.getState().vote(params.proposalAddress, publicKey.toBase58(), params.approve)
      return { tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
    },
  })
}

export function useExecuteProposal() {
  const { publicKey } = useWallet()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      proposalAddress: string
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      if (isLive && program) {
        try {
          const potPk = new PublicKey(params.potAddress)
          const proposalPk = new PublicKey(params.proposalAddress)
          const [vaultPda] = getVaultAddress(potPk)
          const tx = await program.methods
            .executeProposal()
            .accounts({
              pot: potPk,
              vault: vaultPda,
              proposal: proposalPk,
              executor: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          return { tx }
        } catch (e) {
          console.warn('On-chain executeProposal failed, falling back to mock:', e)
        }
      }

      useMockStore.getState().executeProposal(params.proposalAddress)
      return { tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pot', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposals', vars.potAddress] })
      queryClient.invalidateQueries({ queryKey: ['pots'] })
    },
  })
}
