'use client'

import { useEffect, useState } from 'react'
import type { OwnedName } from '@/lib/sns'
import { useClaimWallet } from '@/hooks/useClaimWallet'

const MUTED = '#6B7280'
const GREEN = '#14F195'

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
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>Your names</div>
      {loading && <div style={{ color: MUTED }}>Loading...</div>}
      {!loading && names && names.length === 0 && <div style={{ color: MUTED, fontSize: 14 }}>No .potbot.sol names yet</div>}
      {!loading && names && names.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {names.map((n) => (
            <div key={n.fqdn} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#0D1117', border: '1px solid #1A2332', borderRadius: 12 }}>
              <span style={{ color: GREEN }}>{'🌿'}</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{n.fqdn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
