import { NextResponse } from 'next/server'

/**
 * Same-origin proxy for Pyth Hermes. The public Hermes endpoint does not send CORS headers
 * for browser callers, so the web client talks to /api/pot-index/hermes/... instead and the
 * server forwards to Hermes. Read-only GET passthrough, no auth.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPSTREAM = process.env.PYTH_HERMES_UPSTREAM ?? 'https://hermes.pyth.network'

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const url = new URL(req.url)
  const target = `${UPSTREAM}/${path.join('/')}${url.search}`
  try {
    const res = await fetch(target, { headers: { accept: 'application/json' }, cache: 'no-store' })
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
