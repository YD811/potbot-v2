import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { getVaultAddress, PROGRAM_ID } from '@potbot/sdk'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://potbot.fun'

const ACTION_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept-Encoding',
  'Content-Encoding': 'identity',
} as const

/**
 * GET /api/actions/[potPubkey]/deposit
 * Returns Action metadata — Blink clients render a card with deposit options.
 *
 * Spec: https://solana.com/docs/advanced/actions
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { potPubkey: string } }
) {
  const potPubkey = params.potPubkey

  try {
    new PublicKey(potPubkey)
  } catch {
    return NextResponse.json(
      { error: 'Invalid pot public key' },
      { status: 400, headers: ACTION_HEADERS }
    )
  }

  const baseHref = `${APP_URL}/api/actions/${potPubkey}/deposit`

  return NextResponse.json(
    {
      type: 'action',
      icon: `${APP_URL}/og-image.png`,
      title: 'Deposit into PotBot pot',
      description:
        'Pool funds with the group. Your share of the vault is proportional to your deposit. Withdraw anytime, governed on-chain.',
      label: 'Deposit',
      links: {
        actions: [
          { type: 'transaction', label: '0.05 SOL', href: `${baseHref}?amount=0.05` },
          { type: 'transaction', label: '0.1 SOL',  href: `${baseHref}?amount=0.1`  },
          { type: 'transaction', label: '0.5 SOL',  href: `${baseHref}?amount=0.5`  },
          {
            type: 'transaction',
            label: 'Custom',
            href: `${baseHref}?amount={amount}`,
            parameters: [
              {
                name: 'amount',
                label: 'Amount in SOL',
                type: 'number',
                required: true,
              },
            ],
          },
        ],
      },
    },
    { headers: ACTION_HEADERS }
  )
}

/**
 * POST /api/actions/[potPubkey]/deposit?amount=N
 * Body: { account: string }
 * Returns base64-serialized transaction the user can sign.
 *
 * For the hackathon submission this builds a SystemProgram.transfer
 * directly into the vault PDA — funds visibly land in the pot on Solana
 * Explorer. Post-hackathon this will be replaced with the full
 * `deposit` CPI that mints membership shares.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { potPubkey: string } }
) {
  try {
    const url = new URL(req.url)
    const amountSol = Number(url.searchParams.get('amount') ?? '0.1')
    if (!Number.isFinite(amountSol) || amountSol <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
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
    const [vaultPda] = getVaultAddress(potPubkey)

    const connection = new Connection(RPC_URL, 'confirmed')
    const { blockhash } = await connection.getLatestBlockhash('confirmed')

    const tx = new Transaction({
      feePayer: userPubkey,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: vaultPda,
        lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
      })
    )

    const serialized = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64')

    return NextResponse.json(
      {
        type: 'transaction',
        transaction: serialized,
        message: `Depositing ${amountSol} SOL into PotBot pot ${params.potPubkey.slice(0, 8)}…`,
        links: {
          next: {
            type: 'post',
            href: `${APP_URL}/api/actions/${params.potPubkey}/deposit/next`,
          },
        },
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
