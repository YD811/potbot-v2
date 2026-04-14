/**
 * SNS (Solana Name Service) integration for PotBot
 *
 * potbot.sol parent domain — each vault gets {potname}.potbot.sol
 * Wallets can also claim {name}.potbot.sol as a personal identity (paid).
 *
 * Docs: https://docs.bonfida.org/collection/solana-name-service
 * SDK: @bonfida/spl-name-service
 * Bounty: SNS ($5,000)
 */

export const POTBOT_PARENT_DOMAIN = 'potbot.sol'
export const POTBOT_PARENT_NAME   = 'potbot'

// ── Pricing ─────────────────────────────────────────────────────────────────
// Shorter names are rarer → more expensive
export const SNS_PRICING: Record<number, number> = {
  3: 1.0,   // 3-char name  → 1 SOL / year
  4: 0.5,   // 4-char name  → 0.5 SOL / year
  5: 0.1,   // 5+ char name → 0.1 SOL / year
}

export function getSubdomainPrice(slug: string): number {
  const len = slug.replace(/-/g, '').length
  if (len <= 3) return SNS_PRICING[3]
  if (len === 4) return SNS_PRICING[4]
  return SNS_PRICING[5]
}

export interface SNSSubdomain {
  fullName: string
  subdomain: string
  resolvedPubkey: string
  registered: boolean
}

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

const resolutionCache = new Map<string, string | null>()

const MOCK_REGISTRY: Record<string, string> = {
  'moonboys.potbot.sol':     'DemoPoT1111111111111111111111111111111111111',
  'solsurfers.potbot.sol':   'DemoPoT2222222222222222222222222222222222222',
  'degen-dao.potbot.sol':    'DemoPoT3333333333333333333333333333333333333',
  'alphahunters.potbot.sol': 'DemoPoT4444444444444444444444444444444444444',
  'jlpvault.potbot.sol':     'DemoPoT7777777777777777777777777777777777777',
}

const MOCK_REVERSE: Record<string, string> = {
  'DemoPoT1111111111111111111111111111111111111': 'moonboys.potbot.sol',
  'DemoPoT2222222222222222222222222222222222222': 'solsurfers.potbot.sol',
  'DemoPoT3333333333333333333333333333333333333': 'degen-dao.potbot.sol',
  'DemoPoT4444444444444444444444444444444444444': 'alphahunters.potbot.sol',
  'DemoPoT7777777777777777777777777777777777777': 'jlpvault.potbot.sol',
}

// ── Wallet subdomain registry (in-memory for mock) ───────────────────────────
// Maps slug → walletPubkey and walletPubkey → slug
const walletSubdomainBySlug = new Map<string, string>()
const walletSubdomainByPubkey = new Map<string, string>()

// Pre-seed some demo wallet domains
const DEMO_WALLET_DOMAINS: Array<[string, string]> = [
  ['moonleader', 'SeedAuth1111111111111111111111111111111111'],
  ['yd',         'SeedAuth4444444444444444444444444444444444'],
]
DEMO_WALLET_DOMAINS.forEach(([slug, pk]) => {
  walletSubdomainBySlug.set(slug, pk)
  walletSubdomainByPubkey.set(pk, slug)
})

/**
 * Check if a personal wallet subdomain slug is available.
 * Returns true if available, false if taken.
 */
export async function checkSubdomainAvailable(slug: string): Promise<boolean> {
  const clean = sanitizePotName(slug)
  if (!clean || clean.length < 3) return false
  // Simulate async lookup (would call SNS on-chain)
  await new Promise(r => setTimeout(r, 300))
  // Also check pot registry
  const potKey = `${clean}.${POTBOT_PARENT_DOMAIN}`
  if (MOCK_REGISTRY[potKey]) return false
  return !walletSubdomainBySlug.has(clean)
}

/**
 * Register a personal wallet subdomain.
 * e.g. registerWalletSubdomain('yd', 'Abc123...') → 'yd.potbot.sol'
 * Returns { signature, domain } or null on failure.
 */
export async function registerWalletSubdomain(
  slug: string,
  walletPubkey: string,
): Promise<{ signature: string; domain: string; pricePaid: number } | null> {
  const clean = sanitizePotName(slug)
  if (!clean || clean.length < 3) return null

  // Simulate network delay
  await new Promise(r => setTimeout(r, 800))

  const available = await checkSubdomainAvailable(clean)
  if (!available) return null

  const price = getSubdomainPrice(clean)
  const domain = `${clean}.${POTBOT_PARENT_DOMAIN}`
  const mockSignature = `sns_wallet_${clean}_${Date.now().toString(36)}`

  // Register in mock store
  walletSubdomainBySlug.set(clean, walletPubkey)
  walletSubdomainByPubkey.set(walletPubkey, clean)

  // Update resolution cache
  resolutionCache.set(domain, walletPubkey)
  resolutionCache.set(`rev:${walletPubkey}`, domain)

  return { signature: mockSignature, domain, pricePaid: price }
}

/**
 * Get the registered .potbot.sol slug for a wallet pubkey.
 * Returns slug (without domain) or null.
 */
export async function getRegisteredWalletDomain(walletPubkey: string): Promise<string | null> {
  await new Promise(r => setTimeout(r, 100))
  return walletSubdomainByPubkey.get(walletPubkey) ?? null
}

// ── Existing pot/member resolution ───────────────────────────────────────────

export async function resolveSNS(name: string): Promise<string | null> {
  if (resolutionCache.has(name)) return resolutionCache.get(name) ?? null
  const result = MOCK_REGISTRY[name.toLowerCase()] ?? null
  resolutionCache.set(name, result)
  return result
}

export async function reverseSNS(pubkey: string): Promise<string | null> {
  const cacheKey = `rev:${pubkey}`
  if (resolutionCache.has(cacheKey)) return resolutionCache.get(cacheKey) ?? null
  const result = MOCK_REVERSE[pubkey] ?? null
  resolutionCache.set(cacheKey, result)
  return result
}

export async function resolveMemberSNS(walletPubkey: string): Promise<string | null> {
  const MOCK_MEMBERS: Record<string, string> = {
    'SeedAuth1111111111111111111111111111111111': 'moonleader.sol',
    'Member1A1111111111111111111111111111111111': 'trader.sol',
    'SeedAuth4444444444444444444444444444444444': 'alphawolf.sol',
  }
  return MOCK_MEMBERS[walletPubkey] ?? null
}

export async function registerPotSubdomain(
  potName: string,
  vaultPubkey: string,
  _payerPubkey: string,
): Promise<{ signature: string; domain: string } | null> {
  const subdomain = sanitizePotName(potName)
  const domain = `${subdomain}.${POTBOT_PARENT_DOMAIN}`
  try {
    await new Promise(r => setTimeout(r, 600))
    const existing = await resolveSNS(domain)
    if (existing && existing !== vaultPubkey) return null
    const mockSignature = `sns_${subdomain}_${Date.now().toString(36)}`
    resolutionCache.set(domain, vaultPubkey)
    resolutionCache.set(`rev:${vaultPubkey}`, domain)
    return { signature: mockSignature, domain }
  } catch {
    return null
  }
}

export function getPotShareUrl(potName: string, _potPubkey: string): string {
  return `https://potbot.xyz/${sanitizePotName(potName)}`
}

export function getPotShareText(potName: string, snsName?: string): string {
  if (snsName) return `Join my group trading vault on PotBot: ${snsName} \uD83C\uDF3F`
  return `Join ${potName} on PotBot \u2014 group trading vaults on Solana \uD83C\uDF3F`
}

export function formatSNSBadge(snsName: string): string {
  return snsName.replace('.potbot.sol', '') + '.potbot.sol'
}
