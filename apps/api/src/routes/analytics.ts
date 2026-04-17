import { Hono } from 'hono'
import { Connection, PublicKey } from '@solana/web3.js'
import { computeVaultAnalytics } from '../services/pnl-engine.js'
import type { Position } from '../types.js'

export const analyticsRouter = new Hono()

// In-memory positions store (replace with Supabase in production)
const positionsStore = new Map<string, Position[]>()
const analyticsCache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL_MS = 10_000  // 10s

// GET /analytics/:pubkey — vault analytics (NAV, PnL, APY)
analyticsRouter.get('/:pubkey', async (c) => {
  const pubkey = c.req.param('pubkey')

  // Validate pubkey
  try { new PublicKey(pubkey) } catch {
    return c.json({ error: 'Invalid public key' }, 400)
  }

  // Cache hit
  const cached = analyticsCache.get(pubkey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return c.json({ ...cached.data, cached: true })
  }

  const positions = positionsStore.get(pubkey) ?? []

  // Fetch vault SOL balance from RPC
  let solBalanceLamports = 0
  try {
    const rpcUrl = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
    const conn = new Connection(rpcUrl, 'confirmed')
    // Try to find the vault PDA (seeds: ["vault", potPubkey])
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), new PublicKey(pubkey).toBuffer()],
      new PublicKey(process.env.PROGRAM_ID ?? 'ED4zhABMV97obJSD5bzasUPaNVmc3qwA3WhwqoGVCDvH')
    )
    solBalanceLamports = await conn.getBalance(vaultPda)
  } catch (e) {
    console.warn('[analytics] RPC error:', e)
  }

  const analytics = await computeVaultAnalytics(
    pubkey,
    positions,
    solBalanceLamports,
    0,
    []
  )

  analyticsCache.set(pubkey, { data: analytics, ts: Date.now() })
  return c.json(analytics)
})

// POST /analytics/:pubkey/positions — update positions (called after swap execution)
analyticsRouter.post('/:pubkey/positions', async (c) => {
  const pubkey = c.req.param('pubkey')
  try {
    const body = await c.req.json<{ positions: Position[] }>()
    if (!Array.isArray(body.positions)) return c.json({ error: 'positions must be array' }, 400)
    positionsStore.set(pubkey, body.positions)
    analyticsCache.delete(pubkey)  // Invalidate cache
    return c.json({ ok: true, count: body.positions.length })
  } catch {
    return c.json({ error: 'Invalid body' }, 400)
  }
})

// GET /analytics/:pubkey/positions
analyticsRouter.get('/:pubkey/positions', (c) => {
  const pubkey = c.req.param('pubkey')
  const positions = positionsStore.get(pubkey) ?? []
  return c.json({ positions, potPubkey: pubkey })
})
