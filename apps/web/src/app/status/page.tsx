type Check = {
  name: string
  href: string
  note: string
}

type CheckResult = Check & {
  ok: boolean
  status: number
  latencyMs: number
}

const checks: Check[] = [
  { name: 'Web API Health', href: '/api/health', note: 'Core service heartbeat' },
  {
    name: 'Prices API',
    href: '/api/prices?mints=So11111111111111111111111111111111111111112',
    note: 'Token pricing endpoint',
  },
  { name: 'Leaderboard API', href: '/api/leaderboard', note: 'Public leaderboard endpoint' },
]

async function runCheck(check: Check): Promise<CheckResult> {
  const started = Date.now()
  try {
    const res = await fetch(check.href, { cache: 'no-store' })
    return {
      ...check,
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - started,
    }
  } catch {
    return {
      ...check,
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
    }
  }
}

export const dynamic = 'force-dynamic'

export default async function StatusPage() {
  const results = await Promise.all(checks.map(runCheck))
  const healthy = results.filter((c) => c.ok).length

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-black text-white mb-3">PotBot Status</h1>
      <p className="text-pot-muted mb-2">Live checks for key public endpoints.</p>
      <p className="text-xs text-pot-muted/80 mb-8">
        {healthy}/{results.length} checks passing · Updated {new Date().toLocaleString()}
      </p>

      <div className="space-y-3">
        {results.map((check) => (
          <a
            key={check.href}
            href={check.href}
            className="card p-4 flex items-center justify-between hover:border-pot-green/30 transition"
          >
            <div>
              <div className="font-semibold text-white flex items-center gap-2">
                {check.ok ? '🟢' : '🔴'} {check.name}
              </div>
              <div className="text-sm text-pot-muted">
                {check.note} · HTTP {check.status || 'ERR'} · {check.latencyMs}ms
              </div>
            </div>
            <span className="text-pot-green text-sm">Open →</span>
          </a>
        ))}
      </div>
    </div>
  )
}
