'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { Wallet } from '@coral-xyz/anchor'
import { usePrivyAnchorWallet } from '@/hooks/usePrivyAnchorWallet'
import {
  ata,
  buildCreatePot,
  buildDeposit,
  buildExit,
  fetchAllPots,
  fetchConfig,
  fetchPot,
  fetchPotBalances,
  makePotIndexProgram,
  navUsd,
  type CreatePotArgs,
  type PotView,
} from '@/lib/pot-index/client'
import { buildWithPythUpdates, fetchHermesPrices } from '@/lib/pot-index/pyth-post'
import { POT_INDEX_ASSETS, POT_INDEX_SETTINGS, assetByMint } from '@/lib/pot-index/registry'

/** Signer-aware program + wallet (wallet-adapter or Privy). */
export function usePotIndexProgram() {
  const { connection } = useConnection()
  const adapter = useAnchorWallet()
  const privy = usePrivyAnchorWallet()
  const wallet = (adapter ?? privy) as Wallet | null
  const program = useMemo(() => (wallet ? makePotIndexProgram(connection, wallet) : null), [connection, wallet])
  return { connection, wallet, program, pubkey: wallet?.publicKey ?? null }
}

export function usePots() {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['pot-index', 'pots'],
    queryFn: () => fetchAllPots(connection),
    refetchInterval: 20_000,
  })
}

export function usePotIndexConfig() {
  const { connection } = useConnection()
  return useQuery({ queryKey: ['pot-index', 'config'], queryFn: () => fetchConfig(connection), staleTime: 60_000 })
}

export function usePot(indexMint: string | null) {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['pot-index', 'pot', indexMint],
    queryFn: () => fetchPot(connection, new PublicKey(indexMint!)),
    enabled: !!indexMint,
    refetchInterval: 15_000,
  })
}

/** Prices for every registered asset, keyed by mint (USD). */
export function useAssetPrices() {
  return useQuery({
    queryKey: ['pot-index', 'prices'],
    queryFn: async () => {
      const feeds = POT_INDEX_ASSETS.map((a) => a.feedId)
      const byFeed = await fetchHermesPrices(feeds)
      const byMint: Record<string, number> = {}
      for (const a of POT_INDEX_ASSETS) byMint[a.mint] = byFeed[a.feedId]?.price ?? 0
      return byMint
    },
    refetchInterval: 10_000,
  })
}

/** Balances + NAV + index price for one Pot. */
export function usePotStats(pot: PotView | null | undefined) {
  const { connection } = useConnection()
  const prices = useAssetPrices()
  return useQuery({
    queryKey: ['pot-index', 'stats', pot?.address.toBase58(), prices.dataUpdatedAt],
    enabled: !!pot && !!prices.data,
    queryFn: async () => {
      const bal = await fetchPotBalances(connection, pot!)
      const nav = navUsd(pot!, bal, prices.data!)
      const supply = bal.supply / 1e6
      return {
        ...bal,
        navUsd: nav,
        supply,
        indexPrice: supply > 0 ? nav / supply : 1,
        legsUsd: pot!.legs.map((l, i) => (bal.legs[i] / 10 ** l.decimals) * (prices.data![l.mint.toBase58()] ?? 0)),
      }
    },
    refetchInterval: 15_000,
  })
}

export function useMyIndexBalance(pot: PotView | null | undefined) {
  const { connection, pubkey } = usePotIndexProgram()
  return useQuery({
    queryKey: ['pot-index', 'mybal', pot?.indexMint.toBase58(), pubkey?.toBase58()],
    enabled: !!pot && !!pubkey,
    queryFn: async () => {
      try {
        const b = await connection.getTokenAccountBalance(ata(pubkey!, pot!.indexMint))
        return Number(b.value.amount)
      } catch {
        return 0
      }
    },
    refetchInterval: 15_000,
  })
}

export function useMyUsdcBalance() {
  const { connection, pubkey } = usePotIndexProgram()
  return useQuery({
    queryKey: ['pot-index', 'usdc', pubkey?.toBase58()],
    enabled: !!pubkey,
    queryFn: async () => {
      try {
        const b = await connection.getTokenAccountBalance(ata(pubkey!, new PublicKey(POT_INDEX_SETTINGS.usdcMint)))
        return Number(b.value.amount) / 1e6
      } catch {
        return 0
      }
    },
    refetchInterval: 15_000,
  })
}

/** Mutations: create, deposit, exit. Each returns the signature(s). */
export function usePotIndexActions() {
  const { connection, wallet, program, pubkey } = usePotIndexProgram()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['pot-index'] })

  const sendLegacy = useCallback(
    async (ixs: Transaction['instructions'], extraSigners: { publicKey: PublicKey; secretKey: Uint8Array }[] = []) => {
      if (!wallet || !pubkey) throw new Error('Connect a wallet first')
      const tx = new Transaction().add(...ixs)
      tx.feePayer = pubkey
      tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
      if (extraSigners.length) tx.partialSign(...(extraSigners as never[]))
      const signed = await wallet.signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
      await connection.confirmTransaction(sig, 'confirmed')
      return sig
    },
    [connection, wallet, pubkey],
  )

  const createPot = useCallback(
    async (args: CreatePotArgs) => {
      if (!program || !pubkey) throw new Error('Connect a wallet first')
      const { indexMint, instructions } = await buildCreatePot(program, pubkey, new PublicKey(POT_INDEX_SETTINGS.usdcMint), args)
      // create + legs + finalize: keep legs ≤ 3 in one tx, otherwise split finalize off.
      const sigs: string[] = []
      if (args.legs.length <= 3) {
        sigs.push(await sendLegacy(instructions, [indexMint]))
      } else {
        const [create, ...rest] = instructions
        const finalize = rest.pop()!
        sigs.push(await sendLegacy([create, ...rest.slice(0, 2)], [indexMint]))
        sigs.push(await sendLegacy([...rest.slice(2), finalize]))
      }
      await invalidate()
      return { indexMint: indexMint.publicKey, sigs }
    },
    [program, pubkey, sendLegacy],
  )

  const deposit = useCallback(
    async (pot: PotView, amountUsdc: number, referrer: PublicKey | null, minSharesOut = 0) => {
      if (!program || !wallet || !pubkey) throw new Error('Connect a wallet first')
      const feeds = pot.legs.map((l) => l.feedId)
      const txs = await buildWithPythUpdates(connection, wallet, feeds, (priceUpdates) =>
        buildDeposit(program, {
          pot,
          user: pubkey,
          usdcMint: new PublicKey(POT_INDEX_SETTINGS.usdcMint),
          treasury: new PublicKey(POT_INDEX_SETTINGS.treasury),
          amountUsdc,
          minSharesOut,
          referrer,
          priceUpdates,
        }),
      )
      const sigs: string[] = []
      for (const { tx, signers } of txs) {
        if (signers.length) tx.sign(signers as never[])
        const signed = (await wallet.signTransaction(tx as VersionedTransaction)) as VersionedTransaction
        const sig = await connection.sendRawTransaction(signed.serialize())
        await connection.confirmTransaction(sig, 'confirmed')
        sigs.push(sig)
      }
      await invalidate()
      return sigs
    },
    [program, wallet, pubkey, connection],
  )

  const exit = useCallback(
    async (pot: PotView, shares: number) => {
      if (!program || !pubkey) throw new Error('Connect a wallet first')
      const ixs = await buildExit(program, { pot, user: pubkey, usdcMint: new PublicKey(POT_INDEX_SETTINGS.usdcMint), shares })
      const sig = await sendLegacy(ixs)
      await invalidate()
      return sig
    },
    [program, pubkey, sendLegacy],
  )

  return { createPot, deposit, exit, connected: !!pubkey, pubkey }
}

export { assetByMint, POT_INDEX_ASSETS, POT_INDEX_SETTINGS }
