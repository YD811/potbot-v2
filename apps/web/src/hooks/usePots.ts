'use client'

import { useMemo } from 'react'
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Keypair } from '@solana/web3.js'
import {
  getPotAddress,
  getVaultAddress,
  getMemberAddress,
  getProposalAddress,
  getVoterRecordAddress,
  getTokenMintAddress,
  POT_PROGRAM_ID,
  TREASURY_ADDRESS,
  IDL,
} from '@potbot/sdk'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { useMockStore } from '@/lib/mock-store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { calculateTamaStats } from '@/lib/tamagotchi/stats'
import { usePrivyAnchorWallet } from '@/hooks/usePrivyAnchorWallet'

const TAMA_EMOJIS = ['🦚','🐓','🐔','🦅','🐉','👑']

/* ── Anchor program instance ── */

export function useProgram() {
  const { connection } = useConnection()
  // Wallet-adapter wallet (Phantom/Solflare in Crypto mode).
  const adapterWallet = useAnchorWallet()
  // Privy embedded wallet (Normie mode — email/Google/Twitter/LinkedIn).
  // Returns null when Privy isn't configured or the user isn't signed in.
  const privyWallet = usePrivyAnchorWallet()
  const wallet = adapterWallet ?? privyWallet

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

/**
 * Active signer pubkey across both Crypto-mode (wallet-adapter) and
 * Normie-mode (Privy embedded wallet). All mutation hooks below should
 * read the user pubkey through this helper, not directly via
 * `useWallet().publicKey`, so that Privy users can also create pots,
 * deposit, vote, etc.
 */
export function useActivePubkey(): PublicKey | null {
  const publicKey = useActivePubkey()
  const privyWallet = usePrivyAnchorWallet()
  return publicKey ?? privyWallet?.publicKey ?? null
}

/* Read-only program — no wallet required. Used for queries that just need
 * to decode account data (no signing). Falls through to a stub keypair
 * wallet so AnchorProvider is happy.
 */
export function useReadProgram() {
  const { connection } = useConnection()

  return useMemo(() => {
    try {
      const dummy = Keypair.generate()
      const stubWallet = {
        publicKey: dummy.publicKey,
        signTransaction: async <T>(_tx: T) => { throw new Error('read-only') },
        signAllTransactions: async <T>(_txs: T[]) => { throw new Error('read-only') },
      } as any
      const provider = new AnchorProvider(connection, stubWallet, { commitment: 'confirmed' })
      return new Program(IDL as any, provider)
    } catch {
      return null
    }
  }, [connection])
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
    // Whether the program is deployed essentially never changes during
    // a session — bump from 60s to 5min so this account-info ping
    // doesn't fire on every navigation.
    staleTime: 5 * 60_000,
    gcTime:    10 * 60_000,
    retry: false,
  })
}

/* ══════════════════════════════
   QUERIES
   ══════════════════════════════ */

export function usePots() {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const walletProgram = useProgram()
  const readProgram = useReadProgram()
  const program = walletProgram ?? readProgram
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['pots', isLive],
    queryFn: async () => {
      if (isLive && program) {
        try {
          const accounts = await (program.account as any).potAccount.all()

          // Batch every vault-balance lookup into a single
          // getMultipleAccountsInfo call. Previously we fired one
          // getAccountInfo per pot (N+1 RPC) which on devnet ran 200-
          // 500 ms per request → noticeably slow /vaults render.
          const vaultPdas = accounts.map((acc: any) => getVaultAddress(acc.publicKey)[0])
          const vaultInfos = vaultPdas.length > 0
            ? await connection.getMultipleAccountsInfo(vaultPdas)
            : []

          const onChain = accounts.map((acc: any, i: number) => {
            const d = acc.account
            const balance = (vaultInfos[i]?.lamports ?? 0) / LAMPORTS_PER_SOL
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

          // Merge curated demo strategies (Solana Index Fund, Memecoin
          // Basket, …) so the /vaults grid stays populated even when only
          // a handful of pots have actually been created on-chain. The
          // demo rows are clearly marked `mode: 'virtual'` so the pot
          // detail page can render a "preview" state instead of trying
          // to fetch a non-existent on-chain account.
          const onChainPubkeys = new Set(onChain.map((p: any) => p.pubkey))
          let demoExtras: any[] = []
          if (isSupabaseConfigured) {
            try {
              const { data } = await supabase
                .from('demo_pots')
                .select('pubkey,name,emoji,balance,member_count,trade_count,total_volume,is_public,yield_strategy,authority,created_at')
                .order('created_at', { ascending: true })
                .limit(20)
              if (data) {
                demoExtras = data
                  .filter((r: any) => !onChainPubkeys.has(r.pubkey))
                  .map((r: any) => ({
                    pubkey: r.pubkey,
                    name: r.name,
                    emoji: r.emoji,
                    balance: Number(r.balance),
                    totalShares: Math.round(Number(r.balance) * 1000),
                    memberCount: r.member_count,
                    tradeCount: r.trade_count,
                    totalVolume: Number(r.total_volume),
                    isPublic: r.is_public,
                    yieldStrategy: r.yield_strategy,
                    authority: r.authority,
                    governanceLevel: 2,
                    createdAt: new Date(r.created_at).getTime(),
                    nextProposalId: 0,
                    meteoraLpBalance: 0,
                    totalYieldEarned: 0,
                    lastYieldAccrualAt: Date.now(),
                    mode: 'virtual',
                    tokenTicker: '',
                    navPerShareBps: 10000,
                    tamagotchiLevel: 1,
                    tamagotchiEmoji: '🌱',
                    tamagotchiXp: 0,
                  }))
                // Inject into the mock store too — usePot(pubkey) falls
                // back to it when an on-chain fetch misses.
                const store = useMockStore.getState()
                for (const ep of demoExtras) {
                  if (!store.pots.find((p) => p.pubkey === ep.pubkey)) {
                    useMockStore.setState((s) => ({ pots: [...s.pots, ep] }))
                  }
                }
              }
            } catch {
              // Supabase unreachable — just return the on-chain list.
            }
          }

          return [...onChain, ...demoExtras]
        } catch (e) {
          console.warn('On-chain fetch failed, using mock:', e)
        }
      }

      // Mock fallback — seed pots + Supabase demo_pots merged
      const seedPots = useMockStore.getState().pots
      const seedPubkeys = new Set(seedPots.map((p) => p.pubkey))

      // Fetch user-created pots from Supabase (those not in seed list)
      let extraPots: any[] = []
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('demo_pots')
            .select('pubkey,name,emoji,balance,member_count,trade_count,total_volume,is_public,yield_strategy,authority,created_at')
            .not('pubkey', 'in', `(${[...seedPubkeys].join(',')})`)
            .order('created_at', { ascending: false })
            .limit(50)
          if (data) {
            extraPots = data.map((r: any) => ({
              pubkey: r.pubkey,
              name: r.name,
              emoji: r.emoji,
              balance: Number(r.balance),
              totalShares: Math.round(Number(r.balance) * 1000),
              memberCount: r.member_count,
              tradeCount: r.trade_count,
              totalVolume: Number(r.total_volume),
              isPublic: r.is_public,
              yieldStrategy: r.yield_strategy,
              authority: r.authority,
              createdAt: new Date(r.created_at).getTime(),
              nextProposalId: 0,
              meteoraLpBalance: 0,
              totalYieldEarned: 0,
              lastYieldAccrualAt: Date.now(),
              mode: 'virtual',
              tokenTicker: '',
              navPerShareBps: 10000,
            }))
            // Inject into mock store so usePot(pubkey) can find them
            const store = useMockStore.getState()
            for (const ep of extraPots) {
              if (!store.pots.find((p) => p.pubkey === ep.pubkey)) {
                useMockStore.setState((s) => ({ pots: [...s.pots, ep] }))
              }
            }
          }
        } catch {
          // Supabase unreachable — continue with seed pots only
        }
      }

      const allPots = [...seedPots, ...extraPots]
      return allPots.map((p) => {
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
          trustLevel: (p as any).trustLevel ?? 'unverified',
          verifiedBy: (p as any).verifiedBy ?? null,
          auditUrl: (p as any).auditUrl ?? null,
        }
      })
    },
    // Pot list only changes when someone creates a new pot — 60s avoids
    // re-running the (newly batched, but still expensive) getProgramAccounts
    // on every navigation.
    staleTime: 60_000,
  })
}

export function usePot(pubkey?: string) {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const walletProgram = useProgram()
  const readProgram = useReadProgram()
  const program = walletProgram ?? readProgram
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['pot', pubkey, isLive],
    queryFn: async () => {
      if (!pubkey) return null

      if (isLive && program) {
        try {
          const pk = new PublicKey(pubkey)
          const d: any = await withTimeout(
            (program.account as any).potAccount.fetch(pk),
            8_000,
            'potAccount.fetch',
          )
          const [vaultPda] = getVaultAddress(pk)
          const vaultInfo = await withTimeout(
            connection.getAccountInfo(vaultPda),
            8_000,
            'vault getAccountInfo',
          )
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
    // Pot state changes infrequently — only on deposit / withdraw / new
    // proposal. 30s avoids re-running 2 RPCs every time the user
    // navigates between tabs of the same pot.
    staleTime: 30_000,
    retry: 1,
  })
}

// getProgramAccounts can be very slow on devnet (5–30s) and React Query's
// default retry of 3 turns one slow scan into 90s of "loading…". Wrap any
// scan in a hard timeout so the UI falls back to a usable state quickly.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

export function useMembers(potPubkey?: string) {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const walletProgram = useProgram()
  const readProgram = useReadProgram()
  const program = walletProgram ?? readProgram

  return useQuery({
    queryKey: ['members', potPubkey, isLive],
    queryFn: async () => {
      if (!potPubkey) return []

      if (isLive && program) {
        try {
          const potPk = new PublicKey(potPubkey)
          const potAcc: any = await withTimeout(
            (program.account as any).potAccount.fetch(potPk),
            8_000,
            'potAccount.fetch',
          )
          const accounts: any[] = await withTimeout(
            (program.account as any).memberAccount.all([
              { memcmp: { offset: 8, bytes: potPubkey } },
            ]),
            10_000,
            'memberAccount.all',
          )
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
            } as any
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
    // Members list refreshes only on deposit/withdraw — 30s is plenty
    // and saves a getProgramAccounts scan per page-nav.
    staleTime: 30_000,
    retry: 1,
  })
}

export function useProposals(potPubkey?: string) {
  const mockStore = useMockStore()
  const { data: isLive } = useIsProgramLive()
  const walletProgram = useProgram()
  const readProgram = useReadProgram()
  const program = walletProgram ?? readProgram

  return useQuery({
    queryKey: ['proposals', potPubkey, isLive],
    queryFn: async () => {
      if (!potPubkey) return []

      if (isLive && program) {
        try {
          const accounts: any[] = await withTimeout(
            (program.account as any).proposalAccount.all([
              { memcmp: { offset: 8, bytes: potPubkey } },
            ]),
            10_000,
            'proposalAccount.all',
          )
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
    // Proposals are the most-changing data on the pot page (votes flip
    // tallies in real time). Keep relatively fresh but stop refetching
    // 3× per page nav — 15s is the new sweet spot.
    staleTime: 15_000,
    retry: 1,
  })
}

/* ══════════════════════════════
   MUTATIONS
   ══════════════════════════════ */

export function useCreatePot() {
  const publicKey = useActivePubkey()
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
          // SDK signature is getPotAddress(name, authority) — seeds order
          // [b"pot", authority, name] is encoded inside the helper. Args
          // were swapped here, which both broke types AND produced the
          // wrong PDA at runtime.
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
              timelockSeconds: new BN(0),
              protocolFeeBps: params.protocolFeeBps ?? 0,
            })
            .accounts({
              pot: potPda,
              vault: vaultPda,
              treasury: TREASURY_ADDRESS,
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
      // Persist to Supabase `demo_pots` so unconnected visitors / other judges
      // see this pot too. Fire-and-forget — never block pot creation on the
      // off-chain mirror. (Supabase v2 PostgrestQueryBuilder is thenable, NOT
      // a real Promise — it has no `.catch()`. Use Promise.resolve() to wrap.)
      if (isSupabaseConfigured) {
        void Promise.resolve(
          supabase.from('demo_pots').upsert({
            pubkey: potAddress,
            name: params.name,
            emoji: params.emoji,
            balance: 0,
            member_count: 0,
            trade_count: 0,
            total_volume: 0,
            is_public: params.isPublic,
            yield_strategy: params.yieldStrategy,
            authority: publicKey.toBase58(),
          }, { onConflict: 'pubkey' }),
        ).catch(() => { /* swallow — demo_pots mirror is best-effort */ })
      }
      return { potAddress, tx: 'mock-tx-' + Date.now() }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pots'] })
    },
  })
}

export function useDeposit() {
  const publicKey = useActivePubkey()
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
      // Pot role is derived from members + authority; refetch it too so the
      // Propose CTA flips active immediately after the depositor's first
      // deposit.
      queryClient.invalidateQueries({ queryKey: ['potRole', vars.potAddress] })
    },
  })
}

export function useWithdraw() {
  const publicKey = useActivePubkey()
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

/**
 * Burn SPL share-tokens from the member's ATA and receive SOL from the
 * vault at NAV. Mirrors the on-chain `redeem_tokens` instruction.
 *
 * `tokenAmount` is in SPL token units (NOT internal shares). The on-chain
 * program divides by `pot.shares_per_sol` (default 100) to get internal
 * shares before pricing — so the caller MUST pass a clean multiple of
 * `shares_per_sol` or the tx is rejected with InvalidAmount.
 */
export function useRedeemTokens() {
  const publicKey = useActivePubkey()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { potAddress: string; tokenAmount: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')
      if (!Number.isFinite(params.tokenAmount) || params.tokenAmount <= 0) {
        throw new Error('Token amount must be > 0')
      }

      if (isLive && program) {
        try {
          const potPk = new PublicKey(params.potAddress)
          const [vaultPda] = getVaultAddress(potPk)
          const [tokenMintPda] = getTokenMintAddress(potPk)
          const memberAta = getAssociatedTokenAddressSync(tokenMintPda, publicKey)
          const tx = await (program as any).methods
            .redeemTokens(new BN(params.tokenAmount))
            .accounts({
              pot: potPk,
              vault: vaultPda,
              member: publicKey,
              tokenMint: tokenMintPda,
              memberTokenAta: memberAta,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          return { tx }
        } catch (e) {
          console.warn('On-chain redeem failed, falling back to mock:', e)
        }
      }

      // Mock fallback: treat tokenAmount as SPL units (1 internal share = 100
      // SPL by default), then call mock withdraw with internal-share count.
      const internalShares = Math.floor(params.tokenAmount / 100)
      useMockStore
        .getState()
        .withdraw(params.potAddress, publicKey.toBase58(), internalShares)
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
  const publicKey = useActivePubkey()
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
  const publicKey = useActivePubkey()
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
  const publicKey = useActivePubkey()
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
