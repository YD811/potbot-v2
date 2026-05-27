import 'server-only'

import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction, TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  getDomainKeySync, NameRegistryState, resolve, createSubdomain, findSubdomains,
} from '@bonfida/spl-name-service'
import bs58 from 'bs58'

import {
  PARENT_LABEL, DEFAULT_PRICING, PRICE_TIERS, type PriceConfig, type Currency,
  type AvailabilityResult, type OwnedName, toFqdn, validateLabel, USDC_DECIMALS,
  LAMPORTS_PER_SOL_SNS,
} from './sns'

const DEFAULT_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

let _conn: Connection | null = null
export function getServerConnection(): Connection {
  if (_conn) return _conn
  const url =
    process.env.POTBOT_SNS_RPC_URL ??
    process.env.NEXT_PUBLIC_RPC_URL ??
    'https://api.mainnet-beta.solana.com'
  _conn = new Connection(url, 'confirmed')
  return _conn
}

export function getParentKey(): PublicKey {
  return getDomainKeySync(PARENT_LABEL).pubkey
}

export function getOwnerKeypair(): Keypair {
  const raw = process.env.POTBOT_SNS_OWNER_SECRET
  if (!raw) throw new Error('POTBOT_SNS_OWNER_SECRET is not set')
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)))
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed))
}

export function getTreasury(): PublicKey {
  const t = process.env.POTBOT_SNS_TREASURY
  if (t) return new PublicKey(t)
  return getOwnerKeypair().publicKey
}

export function getUsdcMint(): PublicKey {
  return new PublicKey(process.env.POTBOT_SNS_USDC_MINT ?? DEFAULT_USDC_MINT)
}

export function getPricing(): PriceConfig {
  const sol = process.env.POTBOT_SNS_PRICE_SOL
    ? Number(process.env.POTBOT_SNS_PRICE_SOL) : DEFAULT_PRICING.sol
  const usdc = process.env.POTBOT_SNS_PRICE_USDC
    ? Number(process.env.POTBOT_SNS_PRICE_USDC) : DEFAULT_PRICING.usdc
  return { sol, usdc }
}

export function priceForLabelServer(label: string): PriceConfig {
  return PRICE_TIERS[label.length] ?? getPricing()
}

export async function checkAvailability(rawLabel: string): Promise<AvailabilityResult> {
  const label = rawLabel
  const fqdn = toFqdn(label)
  const pricing = priceForLabelServer(label)

  const reason = validateLabel(label)
  if (reason) return { label, fqdn, available: false, reason, pricing }

  const connection = getServerConnection()
  const key = getDomainKeySync(`${label}.${PARENT_LABEL}`).pubkey
  try {
    const { registry } = await NameRegistryState.retrieve(connection, key)
    return { label, fqdn, available: false, reason: 'taken', owner: registry?.owner?.toBase58?.(), pricing }
  } catch {
    return { label, fqdn, available: true, pricing }
  }
}

interface BuildClaimArgs { label: string; buyer: PublicKey; currency: Currency }

export async function buildClaimTransaction({ label, buyer, currency }: BuildClaimArgs):
  Promise<{ transaction: string; amount: number; treasury: string }> {
  const connection = getServerConnection()
  const owner = getOwnerKeypair()
  const treasury = getTreasury()
  const pricing = priceForLabelServer(label)

  const ixs: TransactionInstruction[] = []
  let amount: number
  if (currency === 'SOL') {
    amount = pricing.sol
    ixs.push(SystemProgram.transfer({
      fromPubkey: buyer, toPubkey: treasury,
      lamports: Math.round(pricing.sol * LAMPORTS_PER_SOL_SNS),
    }))
  } else {
    amount = pricing.usdc
    const mint = getUsdcMint()
    const buyerAta = getAssociatedTokenAddressSync(mint, buyer, true)
    const treasuryAta = getAssociatedTokenAddressSync(mint, treasury, true)
    const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta)
    if (!treasuryAtaInfo) {
      ixs.push(createAssociatedTokenAccountInstruction(buyer, treasuryAta, treasury, mint))
    }
    ixs.push(createTransferCheckedInstruction(
      buyerAta, mint, treasuryAta, buyer,
      Math.round(pricing.usdc * 10 ** USDC_DECIMALS), USDC_DECIMALS, [], TOKEN_PROGRAM_ID,
    ))
  }

  const subIxs = await createSubdomain(connection, `${label}.${PARENT_LABEL}`, buyer, undefined, buyer)
  for (const ix of flattenInstructions(subIxs)) ixs.push(ix)

  const tx = new Transaction()
  tx.feePayer = buyer
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.add(...ixs)
  tx.partialSign(owner)

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
  return { transaction: serialized, amount, treasury: treasury.toBase58() }
}

export async function listOwned(wallet: PublicKey): Promise<OwnedName[]> {
  const connection = getServerConnection()
  const parentKey = getParentKey()
  const labels: string[] = await findSubdomains(connection, parentKey)
  const out: OwnedName[] = []
  const target = wallet.toBase58()
  for (const label of labels.slice(0, 300)) {
    try {
      const ownerPk = await resolve(connection, `${label}.${PARENT_LABEL}`)
      if (ownerPk?.toBase58?.() === target) out.push({ label, fqdn: toFqdn(label) })
    } catch { /* not owned by this wallet */ }
  }
  return out
}

function flattenInstructions(res: TransactionInstruction[] | TransactionInstruction[][]): TransactionInstruction[] {
  const out: TransactionInstruction[] = []
  for (const item of res as any[]) {
    if (Array.isArray(item)) out.push(...item)
    else if (item) out.push(item)
  }
  return out
}
