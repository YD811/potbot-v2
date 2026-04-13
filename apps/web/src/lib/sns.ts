/**
 * SNS (Solana Name Service) integration for PotBot
 *
 * potbot.sol parent domain — each vault gets {potname}.potbot.sol
 *
 * Docs: https://docs.bonfida.org/collection/solana-name-service
 * SDK: @bonfida/spl-name-service
 * Bounty: SNS ($5,000)
 */

export const POTBOT_PARENT_DOMAIN = 'potbot.sol'
export const POTBOT_PARENT_NAME   = 'potbot'

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
  return `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`
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
  if (snsName) return `Join my group trading vault on PotBot: ${snsName} 🪴`
  return `Join ${potName} on PotBot — group trading vaults on Solana 🪴`
}

export function formatSNSBadge(snsName: string): string {
  return snsName.replace('.potbot.sol', '') + '.potbot.sol'
}
