import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PotBot — Group Trading Vaults on Solana'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
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
          background: 'linear-gradient(135deg, #0a0e17 0%, #0d1520 50%, #0a0e17 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,255,136,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Top accent line */}
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

        {/* Season badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 32,
            padding: '8px 20px',
            borderRadius: 100,
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.2)',
            color: '#00ff88',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          🌱 Season 1: The Garden
        </div>

        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: 'rgba(0,255,136,0.08)',
              border: '2px solid rgba(0,255,136,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 52,
            }}
          >
            🪴
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
              Pot<span style={{ color: '#00ff88' }}>Bot</span>
            </span>
            <span style={{ fontSize: 22, color: '#6b7280', marginTop: 4 }}>v2 · Solana</span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#d1d5db',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
            marginBottom: 48,
          }}
        >
          Group Trading Vaults on Solana
        </div>

        {/* Three feature pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { icon: '💰', label: 'Pool Funds' },
            { icon: '🗳️', label: 'Vote Together' },
            { icon: '🌱', label: 'Grow Your Plant' },
          ].map((f) => (
            <div
              key={f.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 24px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#ffffff',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 26 }}>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            color: '#4b5563',
            fontSize: 18,
            letterSpacing: 1,
          }}
        >
          potbot.fun
        </div>
      </div>
    ),
    { ...size }
  )
}
