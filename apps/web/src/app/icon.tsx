import { ImageResponse } from 'next/og'

// Next.js App Router picks this file up automatically as the favicon.
// Renders the PotBot 🪴 mark on a dark circle with a subtle green glow.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 50% 45%, rgba(20,241,149,0.35) 0%, rgba(13,17,23,1) 65%)',
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>🪴</span>
      </div>
    ),
    size
  )
}
