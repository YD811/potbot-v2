import { NextRequest, NextResponse } from 'next/server'
import { getPots, upsertPot } from '@/lib/db'

/** GET /api/pots — list all pots */
export async function GET() {
  try {
    const pots = await getPots()
    return NextResponse.json({ pots })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/** POST /api/pots — create or update a pot */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.pubkey || !body.name || !body.authority) {
      return NextResponse.json({ error: 'pubkey, name, authority required' }, { status: 400 })
    }
    await upsertPot(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
