'use client'

import { useCallback, useMemo } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
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
  fetchWalletPosition,
  makePotIndexProgram,
  navUsd,
  type CreatePotArgs,
  type PotView,
} from '@/lib/pot-index/client'
import { fetchHermesPrices } from '@/lib/pot-index/pyth-post'
import { POT_INDEX_ASSETS, POT_INDEX_SETTINGS, assetByMint } from '@/lib/pot-index/registry'
import { reportClientError } from '@/lib/pot-index/client-log'

/** Signer-aware program + wallet (wallet-adapter or Privy). */
/** A signed bundle is only good while its blockhash lives (~60 s) and, for anything that posts a
 *  Pyth price, while the price is within the program's window (60 s). If the wallet prompt took
 *  longer than that, send would fail with "blockhash not found" / PriceTooOld. Check before sending. */
const BUNDLE_MAX_AGE_MS = 40_000
async function bundleStillFresh(_connection: Connection, _first: VersionedTransaction, builtAt: number): Promise<boolean> {
  return Date.now() - builtAt <= BUNDLE_MAX_AGE_MS
}
function withStage<T>(stage: string, p: Promise<T>): Promise<T> {
  return p.catch((e: unknown) => {
    const err = (e instanceof Error ? e : new Error(String(e))) as Error & { stage?: string }
    if (!err.stage) err.stage = stage
    throw err
  })
}
/** Give the operator its Pyth rent back once a session is over. Fire and forget. */
function releasePrices(accounts: string[]) {
  if (!accounts.length) return
  void fetch('/api/pot-index/cleanup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accounts }), keepalive: true }).catch(() => {})
}
const TOOK_TOO_LONG = 'The wallet prompt took longer than a minute, so the prices in this bundle expired. Nothing changed. Confirm again, within a minute this time.'

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
    placeholderData: keepPreviousData,
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
    // The key changes with every price refresh; keep the last stats on screen so the list never collapses to zeros.
    placeholderData: keepPreviousData,
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

export interface NavPoint { t: number; price: number; nav: number; supply: number }
export interface NavStats { last: number | null; change24h: number | null; change7d: number | null; changeRange: number | null; since: number | null; points: number }

/** NAV history from the server (Supabase snapshots). Opening a page also records a snapshot if the last one is old. */
export function useNavHistory(mint: string | null | undefined, range: '24h' | '7d' | '30d' | 'all') {
  return useQuery({
    queryKey: ['pot-index', 'nav', mint, range],
    enabled: !!mint,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      // Fire-and-forget: ask the server to snapshot now (it skips if the last point is < 10 min old).
      fetch('/api/pot-index/nav', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mint }) }).catch(() => undefined)
      const r = await fetch(`/api/pot-index/nav?mint=${mint}&range=${range}`)
      if (!r.ok) throw new Error('nav history unavailable')
      return (await r.json()) as { points: NavPoint[]; stats: NavStats }
    },
  })
}

/** 7-day series for every Pot, for list cards. */
export function useNavHistoryAll() {
  return useQuery({
    queryKey: ['pot-index', 'nav-all'],
    staleTime: 120_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const r = await fetch('/api/pot-index/nav?all=1')
      if (!r.ok) throw new Error('nav history unavailable')
      return ((await r.json()) as { series: Record<string, NavPoint[]> }).series
    },
  })
}

/** The connected wallet's cost basis in this Pot, from its own deposit / exit history. */
export function useWalletPosition(pot: PotView | null | undefined) {
  const { connection, pubkey } = usePotIndexProgram()
  return useQuery({
    queryKey: ['pot-index', 'position', pot?.indexMint.toBase58(), pubkey?.toBase58()],
    enabled: !!pot && !!pubkey,
    staleTime: 30_000,
    refetchInterval: 45_000,
    queryFn: () => fetchWalletPosition(connection, pot!, pubkey!),
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
      // 'finalized' blockhash everywhere the wallet signs: wallets simulate against their own RPC,
      // which may lag a 'confirmed' hash by a few slots, spin on "Blockhash not found" and then the
      // hash is expired by the time the holder confirms. Finalized costs ~13 s of validity and is
      // known to every node.
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
      // Canonical origin, never the deployment the creator happened to use (preview URLs are garbage-collected).
      const metaUri = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://potbot.fun'}/api/pot-index/meta/${indexMint.publicKey.toBase58()}`
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

  /**
   * One wallet prompt per action. The server builds the transaction on a recent blockhash, the
   * holder signs it, the server refreshes the Pyth prices, co-signs and submits. When the holder's
   * new token accounts do not fit in that transaction, the server adds a setup transaction that the
   * holder signs in the same prompt and pays for. See operator.server.ts.
   */
  const viaOperator = useCallback(
    async (kind: 'deposit' | 'exit' | 'exit-usdc', body: Record<string, unknown>) => {
      if (!wallet || !pubkey) throw new Error('Connect a wallet first')
      // Two attempts: if the wallet prompt outlived the blockhash, rebuild once and ask again.
      for (let attempt = 0; attempt < 2; attempt++) {
        const t0 = Date.now()
        const br = await withStage(`${kind}:build`, fetch('/api/pot-index/tx/prepare', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind, wallet: pubkey.toBase58(), ...body }),
        }))
        const built = (await br.json()) as { ok?: boolean; tx?: string; setup?: string; token?: string; error?: string; payUsdc?: string }
        if (!br.ok || !built.tx || !built.token) throw new Error(built.error ?? 'could not build the transaction')
        const tx = VersionedTransaction.deserialize(Buffer.from(built.tx, 'base64'))
        const setup = built.setup ? VersionedTransaction.deserialize(Buffer.from(built.setup, 'base64')) : null
        const t1 = Date.now()
        const [signedSetup, signed]: [VersionedTransaction | null, VersionedTransaction] = setup
          ? ((await withStage(`${kind}:sign`, wallet.signAllTransactions([setup, tx]))) as [VersionedTransaction, VersionedTransaction])
          : [null, (await withStage(`${kind}:sign`, wallet.signTransaction(tx))) as VersionedTransaction]
        const t2 = Date.now()
        const sr = await withStage(`${kind}:submit`, fetch('/api/pot-index/tx/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tx: Buffer.from(signed.serialize()).toString('base64'),
            ...(signedSetup ? { setup: Buffer.from(signedSetup.serialize()).toString('base64') } : {}),
            token: built.token,
            timing: { prepareMs: t1 - t0, walletMs: t2 - t1, attempt },
          }),
        }))
        const res = (await sr.json()) as { ok?: boolean; sig?: string; allocated?: string[]; error?: string; expired?: boolean }
        if (sr.ok && res.sig) {
          await invalidate()
          return res
        }
        if (res.expired && attempt === 0) {
          reportClientError(`${kind}:expired`, new Error(`wallet took ${((t2 - t1) / 1000).toFixed(0)} s`), { prepareMs: t1 - t0, walletMs: t2 - t1 })
          continue
        }
        throw new Error(res.error ?? 'the transaction was not accepted')
      }
      throw new Error('That signature took longer than the network allows. Nothing changed.')
    },
    [wallet, pubkey],
  )

  const deposit = useCallback(
    async (pot: PotView, amountUsdc: number, referrer: PublicKey | null, _minSharesOut = 0, _opts: { allocate?: boolean } = {}) => {
      const res = await viaOperator('deposit', { mint: pot.indexMint.toBase58(), amountUsdc, referrer: referrer?.toBase58() ?? null })
      return Object.assign([res.sig!, ...(res.allocated ?? [])], { allocated: res.allocated?.length ?? 0 })
    },
    [viaOperator],
  )

  const exit = useCallback(
    async (pot: PotView, shares: number) => {
      const res = await viaOperator('exit', { mint: pot.indexMint.toBase58(), shares })
      return res.sig!
    },
    [viaOperator],
  )

  const exitUsdc = useCallback(
    async (pot: PotView, shares: number) => {
      const res = await viaOperator('exit-usdc', { mint: pot.indexMint.toBase58(), shares: String(shares) })
      return [res.sig!]
    },
    [viaOperator],
  )

  return { createPot, deposit, exit, exitUsdc, connected: !!pubkey, pubkey }
}

export { assetByMint, POT_INDEX_ASSETS, POT_INDEX_SETTINGS }
