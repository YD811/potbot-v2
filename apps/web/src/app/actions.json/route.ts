import { NextResponse } from 'next/server'

/**
 * GET /actions.json
 * Solana Actions registry — declares which paths on this domain are valid Actions.
 * Spec: https://docs.solana.com/actions
 */
export function GET() {
  return NextResponse.json(
    {
      rules: [
        // Pot deposit Blink — `https://potbot.fun/api/actions/<potPubkey>/deposit`
        {
          pathPattern: '/api/actions/*/deposit',
          apiPath: '/api/actions/*/deposit',
        },
        // Pot vote Blink — `https://potbot.fun/api/actions/<potPubkey>/vote`
        {
          pathPattern: '/api/actions/*/vote',
          apiPath: '/api/actions/*/vote',
        },
      ],
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=3600',
      },
    }
  )
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
