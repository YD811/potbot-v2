import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'PotBot POTFolio: your portfolio, one token'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Shared-link card (X, Telegram, Discord). One line of product, one picture, the URL. */
export default async function OgImage() {
  const load = (rel: string) => readFile(path.join(process.cwd(), rel)).then((b) => `data:image/png;base64,${b.toString('base64')}`).catch(() => null)
  const [plant, wordmark] = await Promise.all([load('public/garden/pink-4.png'), load('public/brand/wordmark-cream.png')])
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#14120F', fontFamily: 'Georgia, serif', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 78% 55%, rgba(224,122,79,0.14) 0%, transparent 55%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 0 80px', width: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {wordmark ? <img src={wordmark} alt="" width={143} height={36} /> : <span style={{ fontSize: 30, fontWeight: 600, color: '#F2ECE0' }}>PotBot</span>}
            <span style={{ marginLeft: 16, color: '#C9C0B0', fontFamily: 'monospace', fontSize: 22 }}>POTFolio</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28, fontSize: 74, fontWeight: 600, lineHeight: 1.02, color: '#F2ECE0', letterSpacing: -2 }}>
            <span>Your portfolio.</span>
            <span style={{ color: '#E07A4F', fontStyle: 'italic' }}>One token.</span>
          </div>
          <div style={{ display: 'flex', marginTop: 30, fontSize: 26, color: '#C9C0B0', fontFamily: 'system-ui, sans-serif' }}>Up to 5 assets in a Pot. Hold one token, leave any time.</div>
          <div style={{ display: 'flex', marginTop: 40, fontSize: 22, color: '#C9C0B0', fontFamily: 'monospace' }}>potbot.fun</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 480 }}>
          {plant ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={plant} width={380} height={380} style={{ objectFit: 'contain' }} />
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  )
}
