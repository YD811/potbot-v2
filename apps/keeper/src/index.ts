import 'dotenv/config'
import http from 'node:http'

const CLUSTER = process.env.SOLANA_CLUSTER ?? 'devnet'
const PROGRAM_ID = process.env.POTBOT_PROGRAM_ID ?? '2ywztkP4gaJr2HtmBvqMXrBWab3FLd3uG6TjGXvVogJL'
const PORT = Number(process.env.KEEPER_PORT ?? 8787)
const ENABLE_WORKER = (process.env.KEEPER_ENABLE_WORKER ?? 'true').toLowerCase() !== 'false'

const strategyPubkeys = new Set<string>()
let lastCheckTs = Math.floor(Date.now() / 1000)

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

  res.statusCode = 404
  res.end('Not Found')
})

server.listen(PORT, () => {
  updateHealthTick()
  // eslint-disable-next-line no-console
  console.log(`[keeper] listening on :${PORT} (cluster=${CLUSTER})`)

  if (ENABLE_WORKER) {
    // Lazy-import to avoid pulling @solana/web3.js if the worker is disabled
    // (e.g. in pure HTTP-health deployments).
    import('./worker')
      .then(({ startWorker }) => {
        startWorker()
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[keeper] worker failed to start:', (err as Error).message)
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
