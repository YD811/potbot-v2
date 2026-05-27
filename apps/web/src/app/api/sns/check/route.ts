import { NextRequest, NextResponse } from 'next/server'
import { normalizeLabel } from '@/lib/sns'
import { checkAvailability } from '@/lib/sns-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('name') ?? ''
  const label = normalizeLabel(raw)
  try {
    const result = await checkAvailability(label)
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    console.error('[sns/check]', err)
    return NextResponse.json({ error: 'availability_check_failed' }, { status: 500 })
  }
}
