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
  ENTRY_FEE_BPS,
  buildSetIndexMetadata,
  fetchAllPots,
  fetchConfig,
  fetchPot,
  fetchPotActivity,
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

/** Publish time (unix s) per mint — equity feeds stop outside US market hours, which blocks mint/rebalance. */
export function useAssetPublishTimes() {
  return useQuery({
    queryKey: ['pot-index', 'publish-times'],
    queryFn: async () => {
      const byFeed = await fetchHermesPrices(POT_INDEX_ASSETS.map((a) => a.feedId))
      const out: Record<string, number> = {}
      for (const a of POT_INDEX_ASSETS) out[a.mint] = byFeed[a.feedId]?.publishTime ?? 0
      return out
    },
    refetchInterval: 60_000,
  })
}

/** Recent on-chain events for a Pot (deposits, exits, rebalances). */
export function usePotActivity(pot: PotView | null | undefined) {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['pot-index', 'activity', pot?.address.toBase58()],
    queryFn: () => fetchPotActivity(connection, pot!),
    enabled: !!pot,
    refetchInterval: 45_000,
    staleTime: 30_000,
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

/** Per-Pot stats for the whole list in one query: TVL, price, performance since launch, holders. */
export interface PotListStats {
  navUsd: number
  supply: number
  indexPrice: number
  perf: number // index price − 1 (every token starts at $1.00)
  holders: number
}
export function useAllPotStats(pots: PotView[] | undefined) {
  const { connection } = useConnection()
  const prices = useAssetPrices()
  const key = (pots ?? []).map((p) => p.address.toBase58()).join(',')
  return useQuery({
    queryKey: ['pot-index', 'list-stats', key, prices.dataUpdatedAt],
    enabled: !!pots && pots.length > 0 && !!prices.data,
    staleTime: 20_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const out: Record<string, PotListStats> = {}
      for (const p of pots!) {
        const bal = await fetchPotBalances(connection, p)
        const nav = navUsd(p, bal, prices.data!)
        const supply = bal.supply / 1e6
        const indexPrice = supply > 0 ? nav / supply : 1
        let holders = 0
        try {
          const largest = await connection.getTokenLargestAccounts(p.indexMint)
          holders = largest.value.filter((a) => Number(a.amount) > 0).length
        } catch {
          holders = 0
        }
        out[p.address.toBase58()] = { navUsd: nav, supply, indexPrice, perf: indexPrice - 1, holders }
      }
      return out
    },
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
      // 'finalized' blockhash: wallets simulate against their own RPC, which may lag a 'confirmed'
      // hash by a few slots and reject it with "Blockhash not found".
      const attempt = async () => {
        const tx = new Transaction().add(...ixs)
        tx.feePayer = pubkey
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
        tx.recentBlockhash = blockhash
        if (extraSigners.length) tx.partialSign(...(extraSigners as never[]))
        const signed = await wallet.signTransaction(tx)
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 5 })
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
        return sig
      }
      try {
        return await attempt()
      } catch (e) {
        if (String(e).includes('Blockhash not found')) return attempt()
        throw e
      }
    },
    [connection, wallet, pubkey],
  )

  const createPot = useCallback(
    async (args: CreatePotArgs) => {
      if (!program || !pubkey) throw new Error('Connect a wallet first')
      const { indexMint, instructions } = await buildCreatePot(program, pubkey, new PublicKey(POT_INDEX_SETTINGS.usdcMint), args, { onGrind: args.onGrind })
      // create + legs + finalize: keep legs ≤ 3 in one tx, otherwise split finalize off.
      const metaUri = `${window.location.origin}/api/pot-index/meta/${indexMint.publicKey.toBase58()}`
      const metadata = await buildSetIndexMetadata(program, pubkey, indexMint.publicKey, metaUri)
      const sigs: string[] = []
      if (args.legs.length <= 3) {
        sigs.push(await sendLegacy(instructions, [indexMint]))
        sigs.push(await sendLegacy([metadata]))
      } else {
        const [create, ...rest] = instructions
        const finalize = rest.pop()!
        sigs.push(await sendLegacy([create, ...rest.slice(0, 2)], [indexMint]))
        sigs.push(await sendLegacy([...rest.slice(2), finalize, metadata]))
      }
      await invalidate()
      return { indexMint: indexMint.publicKey, sigs }
    },
    [program, pubkey, sendLegacy],
  )

  const deposit = useCallback(
    async (pot: PotView, amountUsdc: number, referrer: PublicKey | null, minSharesOut = 0, opts: { allocate?: boolean } = {}) => {
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
      // One wallet prompt for the whole bundle (post prices → deposit → refund rent): fresh blockhash
      // on every tx right before signing, sign all at once, then send strictly in order.
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
      const vtxs = txs.map(({ tx }) => {
        const v = tx as VersionedTransaction
        v.message.recentBlockhash = blockhash
        return v
      })
      txs.forEach(({ signers }, i) => {
        if (signers.length) vtxs[i].sign(signers as never[])
      })

      // Deposit and allocate: buy the basket right after the deposit, in the same prompt. Best effort:
      // if the planner is unavailable (stale prices, market closed) the deposit still goes through
      // and keepers allocate later.
      let allocTxs: VersionedTransaction[] = []
      let allocated = 0
      if (opts.allocate !== false) {
        try {
          const res = await fetch('/api/pot-index/allocate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              wallet: pubkey.toBase58(),
              mint: pot.indexMint.toBase58(),
              depositNetUsdc: Math.floor(amountUsdc * 1e6 * (1 - ENTRY_FEE_BPS / 10_000)),
            }),
          })
          const data = (await res.json()) as { txs?: string[]; plan?: unknown[] }
          if (res.ok && data.txs?.length) {
            allocTxs = data.txs.map((b64) => VersionedTransaction.deserialize(Buffer.from(b64, 'base64')))
            allocated = data.plan?.length ?? 0
          }
        } catch {
          /* deposit only */
        }
      }

      const all = [...vtxs, ...allocTxs]
      const signed = wallet.signAllTransactions
        ? ((await wallet.signAllTransactions(all)) as VersionedTransaction[])
        : await Promise.all(all.map(async (v) => (await wallet.signTransaction(v)) as VersionedTransaction))
      const sigs: string[] = []
      for (let i = 0; i < signed.length; i++) {
        const v = signed[i]
        const sig = await connection.sendRawTransaction(v.serialize(), { maxRetries: 5 })
        if (i < vtxs.length) await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
        else await connection.confirmTransaction(sig, 'confirmed')
        sigs.push(sig)
      }
      await invalidate()
      return Object.assign(sigs, { allocated })
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

  /** Exit straight to USDC. Devnet: the server builds the bundle with the market maker's fill
   *  (program enforces the minimum on-chain); the holder signs everything in one prompt. */
  const exitUsdc = useCallback(
    async (pot: PotView, shares: number) => {
      if (!wallet || !pubkey) throw new Error('Connect a wallet first')
      const res = await fetch('/api/pot-index/exit-usdc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet: pubkey.toBase58(), mint: pot.indexMint.toBase58(), shares: String(shares) }),
      })
      const data = (await res.json()) as { ok?: boolean; txs?: string[]; error?: string }
      if (!res.ok || !data.txs) throw new Error(data.error ?? 'market maker unavailable')
      const vtxs = data.txs.map((b64) => VersionedTransaction.deserialize(Buffer.from(b64, 'base64')))
      const signed = wallet.signAllTransactions
        ? ((await wallet.signAllTransactions(vtxs)) as VersionedTransaction[])
        : await Promise.all(vtxs.map(async (v) => (await wallet.signTransaction(v)) as VersionedTransaction))
      const sigs: string[] = []
      for (const v of signed) {
        const sig = await connection.sendRawTransaction(v.serialize(), { maxRetries: 5 })
        await connection.confirmTransaction(sig, 'confirmed')
        sigs.push(sig)
      }
      await invalidate()
      return sigs
    },
    [wallet, pubkey, connection],
  )

  return { createPot, deposit, exit, exitUsdc, connected: !!pubkey, pubkey }
}

export { assetByMint, POT_INDEX_ASSETS, POT_INDEX_SETTINGS }
