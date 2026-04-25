export default function StatusPage() {
  const checks = [
    { name: 'Web API Health', href: '/api/health', note: 'Next.js route health check' },
    { name: 'Prices API', href: '/api/prices', note: 'Live price feed endpoint' },
    { name: 'Leaderboard API', href: '/api/leaderboard', note: 'Public rankings endpoint' },
  ]

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-black text-white mb-3">PotBot Status</h1>
      <p className="text-pot-muted mb-8">
        Quick operational checks for public endpoints.
      </p>

      <div className="space-y-3">
        {checks.map((check) => (
          <a
            key={check.href}
            href={check.href}
            className="card p-4 flex items-center justify-between hover:border-pot-green/30 transition"
          >
            <div>
              <div className="font-semibold text-white">{check.name}</div>
              <div className="text-sm text-pot-muted">{check.note}</div>
            </div>
            <span className="text-pot-green text-sm">Open →</span>
          </a>
        ))}
      </div>
    </div>
  )
}
