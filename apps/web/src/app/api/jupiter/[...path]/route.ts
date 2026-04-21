/**
 * Jupiter API Proxy
 *
 * All api.jup.ag calls go through here so the API key stays server-side.
 * Frontend uses relative path /api/jupiter/* instead of https://api.jup.ag/*
 *
 * .env.local:
 *   JUPITER_API_KEY=jup_...
 */
import { NextRequest, NextResponse } from 'next/server'

const JUP_API_BASE = 'https://api.jup.ag'
const API_KEY = process.env.JUPITER_API_KEY ?? ''

async function proxyRequest(
  req: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const upstreamPath = path.join('/')
  const upstreamUrl  = `${JUP_API_BASE}/${upstreamPath}${req.nextUrl.search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  }
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`

  const init: RequestInit = { method: req.method, headers }
  if (req.method === 'POST' || req.method === 'PUT') {
    init.body = await req.text()
  }

  try {
    const upstream = await fetch(upstreamUrl, init)
    const body     = await upstream.text()
    return new NextResponse(body, {
      status:  upstream.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Jupiter API unreachable', detail: String(err) },
      { status: 502 },
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params.path)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params.path)
}
