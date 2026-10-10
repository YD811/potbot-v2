import 'server-only'
import { Connection, PublicKey } from '@solana/web3.js'
import { createServerSupabase } from '@/lib/supabase'
import { fetchAllPots, fetchPot, fetchPotBalances, navUsd, type PotView } from '@/lib/pot-index/client'
import { fetchHermesPrices } from '@/lib/pot-index/pyth-post'

/**
 * POTfolio NAV history in Supabase (`potfolio_nav`). Every value is computed here from the chain
 * and Hermes; callers only name a mint. Snapshots are taken at most once per MIN_GAP per Pot, so
 * both the cron and page opens can call `recordNav` freely.
 */

export const MIN_GAP_MS = 10 * 60 * 1000

export interface NavPoint {
  t: number // unix seconds
  price: number // USD per index token
  nav: number // USD
  supply: number
}

export function supabaseReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function rpc() {
  return new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed')
}

async function snapshotRows(connection: Connection, pots: PotView[]) {
  const feedIds = Array.from(new Set(pots.flatMap((p) => p.legs.map((l) => l.feedId))))
  const hermes = await fetchHermesPrices(feedIds)
  const rows = []
  for (const pot of pots) {
    const prices: Record<string, number> = {}
    let missing = false
    pot.legs.forEach((l) => {
      const p = hermes[l.feedId]?.price ?? 0
      if (p <= 0) missing = true
      prices[l.mint.toBase58()] = p
    })
    if (missing) continue // closed market (equities) or feed outage: skip rather than record a wrong NAV
    const bal = await fetchPotBalances(connection, pot)
    const nav = navUsd(pot, bal, prices)
    const supply = bal.supply / 1e6
    rows.push({
      mint: pot.indexMint.toBase58(),
      nav_usd: nav.toFixed(6),
      supply: supply.toFixed(6),
      price_usd: (supply > 0 ? nav / supply : 1).toFixed(8),
      cash_usd: (bal.cash / 1e6).toFixed(6),
      legs_usd: pot.legs.map((l, i) => Number(((bal.legs[i] / 10 ** l.decimals) * prices[l.mint.toBase58()]).toFixed(6))),
    })
  }
  return rows
}

/** Record a snapshot for the given mints (or every live Pot) unless one is younger than MIN_GAP. */
export async function recordNav(mints?: string[]): Promise<{ recorded: string[]; skipped: string[] }> {
  if (!supabaseReady()) return { recorded: [], skipped: mints ?? [] }
  const sb = createServerSupabase()
  const connection = rpc()
  let pots: PotView[]
  if (mints && mints.length) {
    pots = (await Promise.all(mints.map((m) => fetchPot(connection, new PublicKey(m))))).filter((p): p is PotView => !!p)
  } else {
    pots = await fetchAllPots(connection)
  }
  if (pots.length === 0) return { recorded: [], skipped: mints ?? [] }

  const since = new Date(Date.now() - MIN_GAP_MS).toISOString()
  const { data: fresh } = await sb
    .from('potfolio_nav')
    .select('mint')
    .in('mint', pots.map((p) => p.indexMint.toBase58()))
    .gte('snapshotted_at', since)
  const freshSet = new Set((fresh ?? []).map((r) => r.mint as string))
  const due = pots.filter((p) => !freshSet.has(p.indexMint.toBase58()))
  const skipped = pots.filter((p) => freshSet.has(p.indexMint.toBase58())).map((p) => p.indexMint.toBase58())
  if (due.length === 0) return { recorded: [], skipped }

  const rows = await snapshotRows(connection, due)
  if (rows.length) {
    const { error } = await sb.from('potfolio_nav').insert(rows)
    if (error) throw new Error('potfolio_nav insert: ' + error.message)
  }
  return { recorded: rows.map((r) => r.mint), skipped }
}

/** Series for one mint since `fromSec`, thinned to at most `maxPoints` (oldest first). */
export async function readNav(mint: string, fromSec: number, maxPoints = 400): Promise<NavPoint[]> {
  if (!supabaseReady()) return []
  const sb = createServerSupabase()
  const { data, error } = await sb
    .from('potfolio_nav')
    .select('snapshotted_at, price_usd, nav_usd, supply')
    .eq('mint', mint)
    .gte('snapshotted_at', new Date(fromSec * 1000).toISOString())
    .order('snapshotted_at', { ascending: true })
    .limit(5000)
  if (error) throw new Error('potfolio_nav read: ' + error.message)
  const pts: NavPoint[] = (data ?? []).map((r) => ({
    t: Math.floor(new Date(r.snapshotted_at as string).getTime() / 1000),
    price: Number(r.price_usd),
    nav: Number(r.nav_usd),
    supply: Number(r.supply),
  }))
  if (pts.length <= maxPoints) return pts
  const step = pts.length / maxPoints
  const out: NavPoint[] = []
  for (let i = 0; i < maxPoints; i++) out.push(pts[Math.floor(i * step)])
  out.push(pts[pts.length - 1])
  return out
}

/** Latest 7 days for every mint, thinned per mint, for list cards. */
export async function readNavAll(fromSec: number, maxPointsPerMint = 60): Promise<Record<string, NavPoint[]>> {
  if (!supabaseReady()) return {}
  const sb = createServerSupabase()
  const { data, error } = await sb
    .from('potfolio_nav')
    .select('mint, snapshotted_at, price_usd, nav_usd, supply')
    .gte('snapshotted_at', new Date(fromSec * 1000).toISOString())
    .order('snapshotted_at', { ascending: true })
    .limit(20000)
  if (error) throw new Error('potfolio_nav read: ' + error.message)
  const byMint: Record<string, NavPoint[]> = {}
  for (const r of data ?? []) {
    const m = r.mint as string
    ;(byMint[m] ??= []).push({
      t: Math.floor(new Date(r.snapshotted_at as string).getTime() / 1000),
      price: Number(r.price_usd),
      nav: Number(r.nav_usd),
      supply: Number(r.supply),
    })
  }
  for (const m of Object.keys(byMint)) {
    const pts = byMint[m]
    if (pts.length > maxPointsPerMint) {
      const step = pts.length / maxPointsPerMint
      const out: NavPoint[] = []
      for (let i = 0; i < maxPointsPerMint; i++) out.push(pts[Math.floor(i * step)])
      out.push(pts[pts.length - 1])
      byMint[m] = out
    }
  }
  return byMint
}
