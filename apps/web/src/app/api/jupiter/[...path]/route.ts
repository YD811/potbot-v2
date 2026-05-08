/**
 * Jupiter API Proxy
 *
 * All api.jup.ag calls go through here so the API key stays server-side.
 * Frontend uses relative path /api/jupiter/* instead of https://api.jup.ag/*
 *
 * .env.local:
 *   JUPITER_API_KEY=jup_...
 *
 * The Jupiter Price v2 endpoint (`api.jup.ag/price/v2`) was retired in
 * early 2026 — every call now 404s. Instead of rewriting every caller,
 * this proxy intercepts /price/v2 paths and rewrites them to the live
 * `lite-api.jup.ag/price/v3` endpoint, then reshapes the response back
 * into the v2 envelope that callers expect.
 */
import { NextRequest, NextResponse } from 'next/server'

const JUP_API_BASE      = 'https://api.jup.ag'
const JUP_LITE_API_BASE = 'https://lite-api.jup.ag'
const API_KEY = process.env.JUPITER_API_KEY ?? ''

interface JupV3PriceRow {
  usdPrice?: number
  blockId?: number
  decimals?: number
  priceChange24h?: number
}

function rewriteV3ToV2(v3: Record<string, JupV3PriceRow>): unknown {
  const data: Record<string, { id: string; type: string; price: string }> = {}
  for (const [mint, row] of Object.entries(v3 ?? {})) {
    if (typeof row?.usdPrice !== 'number') continue
    data[mint] = {
      id: mint,
      type: 'derivedPrice',
      price: String(row.usdPrice),
    }
  }
  return { data, timeTaken: 0 }
}

async function proxyRequest(
  req: NextRequest,
  path: string[],
): Promise<NextResponse> {
  // Compatibility shim: old Price v2 URL → new lite-api v3 URL
  const isPriceV2 = path[0] === 'price' && path[1] === 'v2'
  const upstreamPath = isPriceV2 ? 'price/v3' : path.join('/')
  const upstreamBase = isPriceV2 ? JUP_LITE_API_BASE : JUP_API_BASE
  const upstreamUrl  = `${upstreamBase}/${upstreamPath}${req.nextUrl.search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  }
  // lite-api is keyless; only the paid api.jup.ag wants the bearer token.
  if (API_KEY && !isPriceV2) headers['Authorization'] = `Bearer ${API_KEY}`

  const init: RequestInit = { method: req.method, headers }
  if (req.method === 'POST' || req.method === 'PUT') {
    init.body = await req.text()
  }

  // Cache policy:
  //   GET /price/* — Vercel Edge cache for 10s (prices barely move at sub-
  //                  second granularity and we were re-fetching ~3×/sec
  //                  before this kicked in).
  //   GET /quote   — short cache (5s) since quotes are time-sensitive but
  //                  rerun anyway when a user actually swaps.
  //   POST /swap   — never cache; signing payload is unique per request.
  const isCacheableGet = req.method === 'GET'
  const isPricePath    = path[0] === 'price'
  const isQuotePath    = path[0] === 'quote'
  const cacheControl =
    isCacheableGet && isPricePath
      ? 'public, s-maxage=10, stale-while-revalidate=30'
      : isCacheableGet && isQuotePath
      ? 'public, s-maxage=5, stale-while-revalidate=10'
      : 'no-store'

  try {
    const upstream = await fetch(upstreamUrl, init)
    const body     = await upstream.text()

    if (isPriceV2 && upstream.ok) {
      try {
        const v3Json = JSON.parse(body) as Record<string, JupV3PriceRow>
        return NextResponse.json(rewriteV3ToV2(v3Json), {
          status: 200,
          headers: { 'Cache-Control': cacheControl },
        })
      } catch {
        // Fall through and serve the raw upstream body if parsing fails.
      }
    }

    return new NextResponse(body, {
      status:  upstream.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl },
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
