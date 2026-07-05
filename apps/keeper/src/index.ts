import 'dotenv/config'
import http from 'node:http'
import { handleHeliusWebhook } from './webhooks/helius.js'

const CLUSTER = process.env.SOLANA_CLUSTER ?? 'devnet'
const PROGRAM_ID = process.env.POTBOT_PROGRAM_ID ?? 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK'
const PORT = Number(process.env.KEEPER_PORT ?? 8787)
const ENABLE_WORKER = (process.env.KEEPER_ENABLE_WORKER ?? 'true').toLowerCase() !== 'false'

const strategyPubkeys = new Set<string>()
let lastCheckTs = Math.floor(Date.now() / 1000)

interface WorkerMetrics {
  ticks: number
  potsSynced: number
  strategiesSynced: number
  lastTickMs: number
  lastTickAt: number
}

const metrics: WorkerMetrics = {
  ticks: 0,
  potsSynced: 0,
  strategiesSynced: 0,
  lastTickMs: 0,
  lastTickAt: 0,
}

function updateHealthTick(): void {
  lastCheckTs = Math.floor(Date.now() / 1000)
}

setInterval(updateHealthTick, 10_000).unref()

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.statusCode = 400
    res.end('Bad Request')
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    const body = JSON.stringify({
      status: 'ok',
      cluster: CLUSTER,
      program_id: PROGRAM_ID,
      strategies_monitored: strategyPubkeys.size,
      last_check_ts: lastCheckTs,
      worker_enabled: ENABLE_WORKER,
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(body)
    return
  }

  if (req.method === 'POST' && req.url === '/webhooks/helius') {
    void handleHeliusWebhook(req, res)
    return
  }

  if (req.method === 'GET' && req.url === '/metrics') {
    const body = JSON.stringify({
      ticks: metrics.ticks,
      pots_synced: metrics.potsSynced,
      strategies_synced: metrics.strategiesSynced,
      last_tick_ms: metrics.lastTickMs,
      last_tick_at: metrics.lastTickAt,
      strategies_monitored: strategyPubkeys.size,
      worker_enabled: ENABLE_WORKER,
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(body)
    return
  }

  res.statusCode = 404
  res.end('Not Found')
})

server.listen(PORT, () => {
  updateHealthTick()
  // eslint-disable-next-line no-console
  console.log(`[keeper] listening on :${PORT} (cluster=${CLUSTER})`)

  if (ENABLE_WORKER) {
    // Lazy-import to avoid pulling @solana/web3.js if the worker is disabled.
    import('./worker.js')
      .then(({ startWorker }) => {
        startWorker()
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[keeper] worker failed to start:', (err as Error).message)
      })
  }

  // Index-vault cranks (NAV snapshot 60s + redeem settler). No-op unless a
  // keeper keypair is configured via KEEPER_KEYPAIR_PATH / KEEPER_KEYPAIR_JSON.
  if ((process.env.KEEPER_ENABLE_INDEX_CRANK ?? 'true').toLowerCase() !== 'false') {
    Promise.all([import('./index-crank.js'), import('@solana/web3.js')])
      .then(([{ startIndexCrank }, { PublicKey }]) => {
        startIndexCrank(new PublicKey(PROGRAM_ID))
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[keeper] index crank failed to start:', (err as Error).message)
      })
  }
})

export function setStrategiesMonitored(pubkeys: string[]): void {
  strategyPubkeys.clear()
  for (const key of pubkeys) {
    if (key) strategyPubkeys.add(key)
  }
  updateHealthTick()
}

export function recordWorkerMetric(update: {
  ticks?: number
  lastTickMs?: number
  potsSynced?: number
  strategiesSynced?: number
}): void {
  if (typeof update.ticks === 'number') metrics.ticks += update.ticks
  if (typeof update.lastTickMs === 'number') metrics.lastTickMs = update.lastTickMs
  if (typeof update.potsSynced === 'number') metrics.potsSynced = update.potsSynced
  if (typeof update.strategiesSynced === 'number') metrics.strategiesSynced = update.strategiesSynced
  metrics.lastTickAt = Math.floor(Date.now() / 1000)
}
