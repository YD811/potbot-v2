import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PotBot Vault'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// In production this would fetch real pot data from Supabase/on-chain
// For demo/hackathon: static fallback using pubkey from params
export default async function PotOgImage({
  params,
}: {
  params: { pubkey: string }
}) {
  const { pubkey } = params
  const shortKey = `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0e17 0%, #111827 60%, #0a0e17 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(0,255,136,0.08) 0%, transparent 65%)',
          }}
        />

        {/* Top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #00ff88, #8b5cf6, #00ff88)',
          }}
        />

        {/* PotBot wordmark */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#6b7280',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          🪴 <span style={{ color: '#ffffff' }}>Pot</span>
          <span style={{ color: '#00ff88' }}>Bot</span>
        </div>

        {/* Pot pubkey badge */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 40,
            padding: '6px 16px',
            borderRadius: 100,
            background: 'rgba(0,255,136,0.06)',
            border: '1px solid rgba(0,255,136,0.15)',
            color: '#00ff88',
            fontSize: 16,
            fontFamily: 'monospace',
          }}
        >
          {shortKey}
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 80 }}>🪴</div>

          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            PotBot Vault
          </div>

          <div
            style={{
              fontSize: 22,
              color: '#9ca3af',
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            Group trading vault on Solana · Vote on swaps, grow together
          </div>

          {/* Stats row (static for OG — real data needs server-side fetch) */}
          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            {[
              { label: 'Non-custodial', icon: '🔐' },
              { label: 'On-chain voting', icon: '🗳️' },
              { label: 'Jupiter swaps', icon: '⚡' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#d1d5db',
                  fontSize: 18,
                }}
              >
                {s.icon} {s.label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 28,
            color: '#374151',
            fontSize: 16,
          }}
        >
          potbot.fun
        </div>
      </div>
    ),
    { ...size }
  )
}
