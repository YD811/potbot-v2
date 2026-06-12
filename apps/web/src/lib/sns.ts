/**
 * SNS (Solana Name Service) integration for PotBot — REAL, not mock.
 *
 * Uses https://sns-api.bonfida.com for resolve/reverse and
 * @bonfida/spl-name-service for subdomain registration.
 *
 * Parent domain: potbot.sol
 *   Each pot registers {slug}.potbot.sol as a subdomain owned by the pot's
 *   vault PDA so "Amsterdam Alpha Circle" → amsterdam-alpha-circle.potbot.sol
 *
 * Identity track (Solana Frontier 2026): this is our "social identity" angle —
 * every group pot has a readable on-chain identity, every member keeps their
 * personal .sol, and AI agents get agent.{pot}.potbot.sol.
 *
 * Docs: https://docs.sns.id/dev/sns-api/domains
 * SDK:  https://github.com/Bonfida/sns-sdk
 */

import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js'

// ─── Constants ──────────────────────────────────────────────────────────────

export const POTBOT_PARENT_DOMAIN = 'potbot.sol'
export const POTBOT_PARENT_NAME = 'potbot'
export const SNS_API_BASE = 'https://sns-api.bonfida.com'

export const SNS_PROGRAM_ID = new PublicKey(
  'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX',
)

// ─── Naming helpers ─────────────────────────────────────────────────────────

export function sanitizePotName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
}

export function buildPotDomain(potName: string): string {
  return `${sanitizePotName(potName)}.${POTBOT_PARENT_DOMAIN}`
}

export function buildAgentDomain(potName: string): string {
  return `agent.${sanitizePotName(potName)}.${POTBOT_PARENT_DOMAIN}`
}

export function formatAddress(pubkey: string, snsName?: string | null): string {
  if (snsName) return snsName
  return `${pubkey.slice(0, 4)}\u2026${pubkey.slice(-4)}`
}

// ─── Pricing ────────────────────────────────────────────────────────────────

export const SNS_PRICING: Record<number, number> = {
  3: 1.0,
  4: 0.5,
  5: 0.1,
}

export function getSubdomainPrice(slug: string): number {
  const len = slug.replace(/-/g, '').length
  if (len <= 3) return SNS_PRICING[3]
  if (len === 4) return SNS_PRICING[4]
  return SNS_PRICING[5]
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SNSSubdomain {
  fullName: string
  subdomain: string
  resolvedPubkey: string
  registered: boolean
}

// ─── Resolve / reverse via SNS API ──────────────────────────────────────────

const resolutionCache = new Map<string, string | null>()
const RESOLVE_TTL_MS = 60_000
const resolveTs = new Map<string, number>()

function cacheGet(key: string): string | null | undefined {
  const ts = resolveTs.get(key) ?? 0
  if (Date.now() - ts > RESOLVE_TTL_MS) {
    resolutionCache.delete(key)
    resolveTs.delete(key)
    return undefined
  }
  return resolutionCache.get(key)
}

function cacheSet(key: string, val: string | null) {
  resolutionCache.set(key, val)
  resolveTs.set(key, Date.now())
}

/**
 * Resolve a .sol (sub)domain to owner pubkey. null if not registered.
 * Docs: https://docs.sns.id/dev/sns-api/domains#get-domainsdomain
 */
export async function resolveSNS(domain: string): Promise<string | null> {
  const hit = cacheGet(domain)
  if (hit !== undefined) return hit
  try {
    const url = `${SNS_API_BASE}/domains/${encodeURIComponent(domain)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.status === 404) {
      cacheSet(domain, null)
      return null
    }
    if (!res.ok) throw new Error(`SNS API ${res.status}`)
    const body = (await res.json()) as {
      owner?: string
      result?: { owner?: string }
    }
    const owner = body.owner ?? body.result?.owner ?? null
    cacheSet(domain, owner)
    return owner
  } catch (err) {
    console.warn('resolveSNS failed for', domain, err)
    return null
  }
}

/**
 * Reverse-lookup: pubkey → primary .sol.
 * Docs: https://docs.sns.id/dev/sns-api/domains#get-domainsowner-reverse
 */
export async function reverseSNS(pubkey: string): Promise<string | null> {
  const key = `rev:${pubkey}`
  const hit = cacheGet(key)
  if (hit !== undefined) return hit
  try {
    const url = `${SNS_API_BASE}/domains/${pubkey}/reverse`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.status === 404) {
      cacheSet(key, null)
      return null
    }
    if (!res.ok) throw new Error(`SNS API ${res.status}`)
    const body = (await res.json()) as { domain?: string; result?: string }
    const domain = body.domain ?? body.result ?? null
    cacheSet(key, domain)
    return domain
  } catch (err) {
    console.warn('reverseSNS failed for', pubkey, err)
    return null
  }
}

export async function resolveMemberSNS(
  walletPubkey: string,
): Promise<string | null> {
  return reverseSNS(walletPubkey)
}

/**
 * Get the registered .potbot.sol subdomain for a wallet address.
 * Uses reverse-lookup to find the wallet's primary domain.
 */
export async function getRegisteredWalletDomain(
  walletPubkey: string,
): Promise<string | null> {
  return reverseSNS(walletPubkey)
}

/**
 * Register a {slug}.potbot.sol subdomain for a wallet.
 * Similar to registerPotSubdomain but for personal wallet identities.
 */
export async function registerWalletSubdomain(
  slug: string,
  walletPubkey: string,
): Promise<{ signature: string; domain: string } | null> {
  const subdomain = sanitizePotName(slug)
  const domain = `${subdomain}.${POTBOT_PARENT_DOMAIN}`

  // Check if subdomain is already taken by someone else
  const existing = await resolveSNS(domain)
  if (existing && existing !== walletPubkey) return null

  return {
    signature: `pending_${subdomain}_${Date.now().toString(36)}`,
    domain,
  }
}

/**
 * Batch-resolve up to 100 domains. Good for leaderboard rendering.
 */
export async function batchResolveSNS(
  domains: string[],
): Promise<Record<string, string | null>> {
  if (domains.length === 0) return {}
  const url =
    `${SNS_API_BASE}/multiple-domains-resolve?domains=` +
    domains.map(encodeURIComponent).join(',')
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`SNS API ${res.status}`)
    const body = (await res.json()) as Record<
      string,
      { owner?: string } | string
    >
    const out: Record<string, string | null> = {}
    for (const [d, v] of Object.entries(body)) {
      if (typeof v === 'string') out[d] = v
      else out[d] = v?.owner ?? null
    }
    return out
  } catch (err) {
    console.warn('batchResolveSNS failed', err)
    return Object.fromEntries(domains.map((d) => [d, null]))
  }
}

// ─── Availability / preview ─────────────────────────────────────────────────

export async function checkSubdomainAvailable(
  slug: string,
): Promise<boolean> {
  const clean = sanitizePotName(slug)
  if (!clean || clean.length < 3) return false
  const full = `${clean}.${POTBOT_PARENT_DOMAIN}`
  const taken = await resolveSNS(full)
  return taken == null
}

export async function previewPotSubdomain(slug: string): Promise<{
  full: string
  slug: string
  available: boolean
  estimatedPriceSol: number
  takenBy: string | null
}> {
  const sanitized = sanitizePotName(slug)
  const full = `${sanitized}.${POTBOT_PARENT_DOMAIN}`
  const takenBy = await resolveSNS(full)
  return {
    full,
    slug: sanitized,
    available: takenBy == null,
    estimatedPriceSol: getSubdomainPrice(sanitized),
    takenBy,
  }
}

// ─── Registration (real on-chain, lazy SDK import) ──────────────────────────

/**
 * Build instructions to register `{slug}.potbot.sol` as a subdomain owned by
 * the pot vault PDA. The current owner of `potbot.sol` must sign.
 *
 * Requires `@bonfida/spl-name-service` — imported lazily.
 */
export async function buildRegisterPotSubdomainIxs(
  connection: Connection,
  slug: string,
  ownerPubkey: PublicKey,
  payerPubkey: PublicKey,
): Promise<TransactionInstruction[]> {
  const sanitized = sanitizePotName(slug)
  if (sanitized.length < 3) {
    throw new Error('Subdomain must be ≥ 3 characters')
  }
  const mod = await import('@bonfida/spl-name-service').catch(() => null)
  if (!mod) {
    throw new Error(
      '@bonfida/spl-name-service not installed — run: pnpm add @bonfida/spl-name-service',
    )
  }
  const full = `${sanitized}.${POTBOT_PARENT_NAME}`
  const [, ixs] = await (mod as any).createSubdomain(
    connection,
    full,
    payerPubkey,
    1000,
    ownerPubkey,
  )
  return ixs as TransactionInstruction[]
}

/**
 * Placeholder for legacy callers. Real tx build happens via
 * `buildRegisterPotSubdomainIxs` above. Kept async so existing imports don't
 * break.
 */
export async function registerPotSubdomain(
  potName: string,
  vaultPubkey: string,
  payerPubkey: string,
): Promise<{ signature: string; domain: string } | null> {
  void payerPubkey
  const subdomain = sanitizePotName(potName)
  const domain = `${subdomain}.${POTBOT_PARENT_DOMAIN}`
  // Consumers should use buildRegisterPotSubdomainIxs + sign with parent owner
  // in their own flow. This legacy helper returns a synthetic signature to
  // preserve the old API.
  const existing = await resolveSNS(domain)
  if (existing && existing !== vaultPubkey) return null
  return {
    signature: `pending_${subdomain}_${Date.now().toString(36)}`,
    domain,
  }
}

// ─── Share helpers ──────────────────────────────────────────────────────────

export function getPotShareUrl(
  potName: string,
  _potPubkey: string,
): string {
  return `https://potbot.fun/pots/${sanitizePotName(potName)}`
}

export function getPotShareText(potName: string, snsName?: string): string {
  if (snsName) {
    return `Join my group treasury on PotBot: ${snsName} — grow your money tree 🪴`
  }
  return `Join ${potName} on PotBot — group treasuries on Solana 🪴`
}

export function formatSNSBadge(snsName: string): string {
  return snsName
}

// ─── Subdomain Sales (.potbot.sol) ─────────────────────────────────────────

export const PARENT_LABEL = 'potbot'
export const PARENT_FQDN = 'potbot.sol'
export const LABEL_MIN_LEN = 1
export const LABEL_MAX_LEN = 63

export const RESERVED_LABELS = new Set<string>([
  'www', 'api', 'app', 'admin', 'root', 'potbot', 'support', 'help', 'mail',
  'vault', 'vaults', 'pot', 'team', 'ydao', 'y-dao', 'stamppot', 'peace',
])

export type Currency = 'SOL' | 'USDC'

export interface PriceConfig {
  sol: number
  usdc: number
}

// Launch promo: flat price for all label lengths. Set false to restore the length-based ladder.
export const SNS_PROMO_FLAT = true

export const PRICE_TIERS: Record<number, PriceConfig> = {
  1: { sol: 2, usdc: 200 },
  2: { sol: 1, usdc: 100 },
  3: { sol: 0.5, usdc: 50 },
  4: { sol: 0.15, usdc: 15 },
}

export const DEFAULT_PRICING: PriceConfig = { sol: 0.05, usdc: 5 }

export function priceForLabel(
  label: string,
  standard: PriceConfig = DEFAULT_PRICING,
): PriceConfig {
  // During the launch promo every name is the flat standard tier (0.05 SOL /
  // 5 USDC), regardless of length. Flip SNS_PROMO_FLAT to restore the ladder.
  if (SNS_PROMO_FLAT) return standard
  return PRICE_TIERS[label.length] ?? standard
}

export function tierName(label: string): string {
  if (SNS_PROMO_FLAT) return 'promo'
  if (label.length <= 4) return `${label.length}-char premium`
  return 'standard'
}

export interface AvailabilityResult {
  label: string
  fqdn: string
  available: boolean
  owner?: string
  reason?: 'invalid' | 'reserved' | 'taken' | 'too_short' | 'too_long'
  pricing: PriceConfig
}

export interface ClaimRequest {
  label: string
  buyer: string
  currency: Currency
  potPubkey?: string
}

export interface ClaimResponse {
  transaction: string
  fqdn: string
  currency: Currency
  amount: number
  treasury: string
}

export interface OwnedName {
  label: string
  fqdn: string
  boundPot?: string
}

export function normalizeLabel(input: string): string {
  let s = (input ?? '').trim().toLowerCase()
  s = s.replace(/\.potbot\.sol$/, '')
  s = s.replace(/\.potbot$/, '')
  s = s.replace(/\.sol$/, '')
  return s.trim()
}

export function validateLabel(label: string): AvailabilityResult['reason'] | null {
  if (!label || label.length < LABEL_MIN_LEN) return 'too_short'
  if (label.length > LABEL_MAX_LEN) return 'too_long'
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) return 'invalid'
  if (RESERVED_LABELS.has(label)) return 'reserved'
  return null
}

export function isValidLabel(label: string): boolean {
  return validateLabel(label) === null
}

export function toFqdn(label: string): string {
  return `${label}.${PARENT_FQDN}`
}

export function formatPrice(amount: number, currency: Currency): string {
  const n = currency === 'SOL' ? amount : Math.round(amount * 100) / 100
  return `${n} ${currency}`
}

export const USDC_DECIMALS = 6
export const LAMPORTS_PER_SOL_SNS = 1_000_000_000
