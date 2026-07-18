// Index-vault hooks: NAV/price reads + deposit/redeem mutations for pots
// with an initialized index layer (pot.index_mint != default).
//
// Mirrors the usePots.ts pattern: on-chain when the program is live, no mock
// fallback here — the index layer is a real-money surface; mock demos keep
// using the existing SOL deposit flow.

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import {
  getStrategyConfigAddress,
  getIndexMintAddress,
  buildDepositBaseTx,
  buildRedeemInstantTx,
  buildRequestRedeemTx,
  fetchPendingRedeems,
} from '@potbot/sdk'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useProgram, useIsProgramLive, useActivePubkey } from './usePots'

export interface IndexVaultState {
  initialized: boolean
  paused: boolean
  baseMint: string
  indexMint: string
  navBase: bigint | null
  supply: bigint
  /** Base units per 1e6 index units (1_000_000 = 1.0). */
  pricePerShareE6: bigint | null
  idleBase: bigint
  tvlCap: bigint
  depositMin: bigint
  depositMax: bigint
  pendingRedeems: number
}

export function useIndexVault(potAddress: string | undefined) {
  const { connection } = useConnection()
  const program = useProgram()
  const { data: isLive } = useIsProgramLive()

  return useQuery<IndexVaultState | null>({
    queryKey: ['index-vault', potAddress, isLive],
    enabled: Boolean(potAddress && isLive && program),
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!potAddress || !program) return null
      const pot = new PublicKey(potAddress)
      const [configPda] = getStrategyConfigAddress(pot)
      const cfg: any = await (program as any).account.strategyConfig.fetchNullable(configPda)
      if (!cfg) return null

      const potState: any = await (program as any).account.potAccount.fetch(pot)
      const [indexMint] = getIndexMintAddress(pot)
      const supplyInfo = await connection.getTokenSupply(indexMint)
      const supply = BigInt(supplyInfo.value.amount)
      const navBase = potState.navSnapshot
        ? BigInt(potState.navSnapshot.valueBase.toString())
        : null

      let idleBase = 0n
      try {
        const [vaultAta] = PublicKey.findProgramAddressSync(
          [
            PublicKey.findProgramAddressSync([Buffer.from('vault'), pot.toBuffer()], program.programId)[0].toBuffer(),
            new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
            new PublicKey(cfg.baseMint).toBuffer(),
          ],
          new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        )
        const bal = await connection.getTokenAccountBalance(vaultAta)
        idleBase = BigInt(bal.value.amount)
      } catch {
        // vault base ATA not created yet
      }

      const pending = await fetchPendingRedeems(program as any, pot).catch(() => [])

      return {
        initialized: true,
        paused: cfg.paused,
        baseMint: cfg.baseMint.toBase58(),
        indexMint: indexMint.toBase58(),
        navBase,
        supply,
        pricePerShareE6:
          navBase !== null && supply > 0n ? (navBase * 1_000_000n) / supply : navBase !== null ? 1_000_000n : null,
        idleBase,
        tvlCap: BigInt(cfg.tvlCap.toString()),
        depositMin: BigInt(cfg.depositMin.toString()),
        depositMax: BigInt(cfg.depositMax.toString()),
        pendingRedeems: pending.length,
      }
    },
  })
}

/** Preview: how many iPOT a base deposit mints at the current snapshot. */
export function previewShares(state: IndexVaultState | null | undefined, amountBase: bigint): bigint {
  if (!state) return 0n
  if (state.supply === 0n || !state.navBase || state.navBase === 0n) return amountBase
  return (amountBase * state.supply) / state.navBase
}

/** Preview: base payout for burning iPOT at the current snapshot. */
export function previewPayout(state: IndexVaultState | null | undefined, indexAmount: bigint): bigint {
  if (!state || state.supply === 0n || state.navBase === null) return 0n
  return (indexAmount * state.navBase) / state.supply
}

export function useDepositBase() {
  const publicKey = useActivePubkey()
  const program = useProgram()
  const { connection } = useConnection()
  const { sendTransaction } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      baseMint: string
      amountBase: bigint
      minSharesOut?: bigint
    }) => {
      if (!publicKey || !program) throw new Error('Wallet not connected')
      const tx = await buildDepositBaseTx(
        program as any,
        new PublicKey(params.potAddress),
        publicKey,
        new PublicKey(params.baseMint),
        new BN(params.amountBase.toString()),
        new BN((params.minSharesOut ?? 0n).toString()),
      )
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      return { tx: sig }
    },
    onSuccess: (_r, v) => {
      void queryClient.invalidateQueries({ queryKey: ['index-vault', v.potAddress] })
    },
  })
}

export function useRedeemIndex() {
  const publicKey = useActivePubkey()
  const program = useProgram()
  const { connection } = useConnection()
  const { sendTransaction } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      potAddress: string
      baseMint: string
      indexAmount: bigint
      minOutBase?: bigint
    }): Promise<{ tx: string; queued: boolean }> => {
      if (!publicKey || !program) throw new Error('Wallet not connected')
      const pot = new PublicKey(params.potAddress)
      const baseMint = new PublicKey(params.baseMint)
      const amount = new BN(params.indexAmount.toString())
      const minOut = new BN((params.minOutBase ?? 0n).toString())

      // Instant from the idle buffer first; on RedemptionInsufficientVault
      // fall back to the queue (escrow now, keeper settles when liquid).
      try {
        const tx = await buildRedeemInstantTx(program as any, pot, publicKey, baseMint, amount, minOut)
        const sig = await sendTransaction(tx, connection)
        await connection.confirmTransaction(sig, 'confirmed')
        return { tx: sig, queued: false }
      } catch (e: any) {
        const msg = String(e?.message ?? e)
        if (!msg.includes('RedemptionInsufficientVault') && !msg.includes('6082')) throw e
      }
      const { tx } = await buildRequestRedeemTx(program as any, pot, publicKey, amount, minOut)
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      return { tx: sig, queued: true }
    },
    onSuccess: (_r, v) => {
      void queryClient.invalidateQueries({ queryKey: ['index-vault', v.potAddress] })
    },
  })
}
