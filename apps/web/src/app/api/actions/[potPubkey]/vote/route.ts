import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://potbot.fun'

// SPL Memo program — used to record the vote on-chain in the MVP.
// Post-hackathon this will be replaced with a real `vote` CPI into pot_vault.
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

const ACTION_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept-Encoding',
  'Content-Encoding': 'identity',
} as const

/**
 * GET /api/actions/[potPubkey]/vote?proposalId=N
 * Returns Action metadata — Blink clients render a YES / NO card.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { potPubkey: string } }
) {
  const potPubkey = params.potPubkey
  const url = new URL(req.url)
  const proposalId = url.searchParams.get('proposalId') ?? 'latest'

  try {
    new PublicKey(potPubkey)
  } catch {
    return NextResponse.json(
      { error: 'Invalid pot public key' },
      { status: 400, headers: ACTION_HEADERS }
    )
  }

  const baseHref = `${APP_URL}/api/actions/${potPubkey}/vote?proposalId=${proposalId}`

  return NextResponse.json(
    {
      type: 'action',
      icon: `${APP_URL}/og-image.png`,
      title: `Vote on PotBot proposal`,
      description: `Cast your vote on the ${proposalId === 'latest' ? 'latest' : `#${proposalId}`} open proposal in pot ${potPubkey.slice(0, 8)}…. On-chain governance, vote-weight = your share of the vault.`,
      label: 'Vote',
      links: {
        actions: [
          { type: 'transaction', label: '✅ YES', href: `${baseHref}&choice=yes` },
          { type: 'transaction', label: '❌ NO',  href: `${baseHref}&choice=no`  },
        ],
      },
    },
    { headers: ACTION_HEADERS }
  )
}

/**
 * POST /api/actions/[potPubkey]/vote?proposalId=N&choice=yes|no
 * Body: { account: string }
 *
 * MVP: builds a Memo program tx with structured vote payload.
 * Post-hackathon: real `vote` CPI into pot_vault with member shares as weight.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { potPubkey: string } }
) {
  try {
    const url = new URL(req.url)
    const proposalId = url.searchParams.get('proposalId') ?? 'latest'
    const choice = (url.searchParams.get('choice') ?? '').toLowerCase()
    if (choice !== 'yes' && choice !== 'no') {
      return NextResponse.json(
        { error: 'Invalid choice — must be yes or no' },
        { status: 400, headers: ACTION_HEADERS }
      )
    }

    const body = await req.json()
    const account = body?.account
    if (!account || typeof account !== 'string') {
      return NextResponse.json(
        { error: 'Missing account' },
        { status: 400, headers: ACTION_HEADERS }
      )
    }

    const userPubkey = new PublicKey(account)
    const potPubkey = new PublicKey(params.potPubkey)

    const connection = new Connection(RPC_URL, 'confirmed')
    const { blockhash } = await connection.getLatestBlockhash('confirmed')

    const memo = `potbot:vote pot=${potPubkey.toBase58()} proposal=${proposalId} choice=${choice} voter=${userPubkey.toBase58()}`
    const memoIx = new TransactionInstruction({
      keys: [{ pubkey: userPubkey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf8'),
    })

    const tx = new Transaction({
      feePayer: userPubkey,
      recentBlockhash: blockhash,
    }).add(memoIx)

    const serialized = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64')

    return NextResponse.json(
      {
        type: 'transaction',
        transaction: serialized,
        message: `Voting ${choice.toUpperCase()} on proposal ${proposalId} of pot ${params.potPubkey.slice(0, 8)}…`,
      },
      { headers: ACTION_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: ACTION_HEADERS }
    )
  }
}

export function OPTIONS() {
  return new NextResponse(null, { headers: ACTION_HEADERS })
}
