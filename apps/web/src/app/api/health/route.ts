import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Simple health check — used by DemoModeBanner and admin panel.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'potbot-web',
    version: '2.0.0',
    network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet',
    timestamp: Date.now(),
  })
}
