'use client'

import { useEffect, useState } from 'react'
import type { OwnedName } from '@/lib/sns'
import { useClaimWallet } from '@/hooks/useClaimWallet'

export default function MyNames() {
  const wallet = useClaimWallet()
  const [names, setNames] = useState<OwnedName[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!wallet.connected || !wallet.address) { setNames(null); return }
    let active = true
    setLoading(true)
    fetch(`/api/sns/owned?owner=${wallet.address}`)
      .then((r) => r.json()).then((d) => { if (active) setNames(d.names ?? []) })
      .catch(() => active && setNames([])).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [wallet.connected, wallet.address])

  if (!wallet.connected) return null
  return (
    <div style={{ maxWidth: 560, margin: '32px auto 0', width: '100%' }}>
      <div className="text-pot-muted text-xs mb-2.5">Your names</div>
      {loading && <div className="text-pot-muted">Loading...</div>}
      {!loading && names && names.length === 0 && <div className="text-pot-muted text-sm">No .potbot.sol names yet</div>}
      {!loading && names && names.length > 0 && (
        <div className="flex flex-col gap-2">
          {names.map((n) => (
            <div key={n.fqdn} className="flex items-center gap-2.5 p-3 bg-pot-dark border border-pot-border rounded-xl">
              <span className="text-pot-green">{'🌿'}</span>
              <span className="font-semibold">{n.fqdn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
