import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  if (process.env.POTBOT_SNS_BIND_ENABLED !== '1') {
    return NextResponse.json({
      error: 'not_enabled', phase: 2,
      message: 'SNS→pot binding ships once pots are live on mainnet. Names currently resolve to the owner wallet.',
    }, { status: 501 })
  }
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
