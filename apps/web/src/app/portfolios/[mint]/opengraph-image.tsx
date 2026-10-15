import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { Connection, PublicKey } from '@solana/web3.js'
import { fetchPot } from '@/lib/pot-index/client'
import { assetByMint } from '@/lib/pot-index/registry'
import { potSeries } from '@/lib/pot-index/garden'

/** Share card for one POTFolio (X, Telegram, Discord): plant, name, ticker, composition, 7d change. */
export const runtime = 'nodejs'
export const revalidate = 900
export const alt = 'POTFolio on PotBot'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const COLORS = ['#E07A4F', '#E9C46A', '#9CCB6E', '#7FA7C9', '#B08BC9']
const SITE = 'https://potbot.fun'

async function change7d(mint: string): Promise<number | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const r = await fetch(`${SITE}/api/pot-index/nav?mint=${mint}&range=7d`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!r.ok) return null
    const j = (await r.json()) as { stats?: { change7d?: number | null } }
    return j.stats?.change7d ?? null
  } catch {
    return null
  }
}

export default async function PotfolioOgImage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params
  let name = 'POTFolio'
  let symbol = ''
  let legs: { sym: string; pct: number }[] = []
  let series = 'pink'
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed')
    const pot = await fetchPot(connection, new PublicKey(mint))
    if (pot) {
      name = pot.name
      symbol = pot.symbol
      legs = pot.legs.map((l) => ({ sym: assetByMint(l.mint.toBase58())?.symbol ?? l.mint.toBase58().slice(0, 4), pct: l.weightBps / 100 }))
      series = potSeries(pot)
    }
  } catch {
    /* render the generic card */
  }
  const ch = legs.length ? await change7d(mint) : null
  const plant = await readFile(path.join(process.cwd(), `public/garden/${series}-5.png`))
    .then((b) => `data:image/png;base64,${b.toString('base64')}`)
    .catch(() => null)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#14120F', position: 'relative', fontFamily: 'Georgia, serif' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 50%, rgba(224,122,79,0.14) 0%, transparent 55%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 0 64px 72px', width: 760 }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#C9C0B0', fontFamily: 'monospace', letterSpacing: 3 }}>POTFOLIO ON POTBOT</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: name.length > 18 ? 64 : 80, fontWeight: 600, lineHeight: 1.02, color: '#F2ECE0', letterSpacing: -2 }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 18, gap: 24 }}>
              {symbol ? <div style={{ display: 'flex', fontSize: 32, color: '#C9C0B0', fontFamily: 'monospace' }}>${symbol}</div> : null}
              {ch != null ? (
                <div style={{ display: 'flex', fontSize: 32, color: ch >= 0 ? '#9CCB6E' : '#C9C0B0', fontFamily: 'monospace' }}>
                  {`${ch >= 0 ? '+' : ''}${ch.toFixed(1)}% 7d`}
                </div>
              ) : null}
            </div>
            {legs.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
                <div style={{ display: 'flex', width: 620, height: 18, borderRadius: 9, overflow: 'hidden' }}>
                  {legs.map((l, i) => (
                    <div key={l.sym + i} style={{ display: 'flex', width: `${l.pct}%`, height: 18, background: COLORS[i % COLORS.length], marginRight: i < legs.length - 1 ? 4 : 0 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 18, gap: 28, fontSize: 26, color: '#F2ECE0', fontFamily: 'monospace' }}>
                  {legs.map((l, i) => (
                    <div key={l.sym + 'l' + i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                      {`${l.sym} ${l.pct}%`}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#C9C0B0', fontFamily: 'system-ui, sans-serif' }}>One token. Leave any time. potbot.fun</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: 440, paddingBottom: 40 }}>
          {plant ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={plant} width={400} height={400} style={{ objectFit: 'contain' }} />
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  )
}
