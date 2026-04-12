/**
 * Scam & Risk Detection
 *
 * Two layers of protection:
 * 1. ScamSniffer domain blacklist — known phishing/scam websites
 *    Source: github.com/scamsniffer/scam-database (via jsDelivr CDN)
 *
 * 2. RugCheck.xyz token risk API — Solana-native token safety scores
 *    Checks: mint authority, freeze authority, liquidity, top holders, etc.
 */

import { useQuery } from '@tanstack/react-query'

/* ── ScamSniffer Domain Blacklist ── */

// jsDelivr mirrors GitHub without the egress restrictions
const SCAMSNIFFER_DOMAINS_URL =
  'https://cdn.jsdelivr.net/gh/scamsniffer/scam-database@main/blacklist/domains.json'

/**
 * Fetches the ScamSniffer domain blacklist.
 * Returns a Set of known scam domains for O(1) lookup.
 * Cached for 1 hour.
 */
export function useScamDomains() {
  return useQuery({
    queryKey: ['scam-domains'],
    queryFn: async (): Promise<Set<string>> => {
      try {
        const res = await fetch(SCAMSNIFFER_DOMAINS_URL)
        if (!res.ok) throw new Error('fetch failed')
        // Format: { "domain.com": ["0x..."], ... }
        const json: Record<string, string[]> = await res.json()
        return new Set(Object.keys(json).map((d) => d.toLowerCase()))
      } catch {
        // Fail gracefully — don't block the UI
        return new Set()
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  })
}

/**
 * Check if a URL/domain is in the ScamSniffer blacklist.
 */
export function isDomainScam(domain: string, blacklist: Set<string>): boolean {
  const cleaned = domain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
  return blacklist.has(cleaned)
}

/* ── RugCheck.xyz Token Risk ── */

const RUGCHECK_API = 'https://api.rugcheck.xyz/v1/tokens'

export type RiskLevel = 'safe' | 'warn' | 'danger' | 'unknown'

export interface TokenRisk {
  mint: string
  score: number           // 0–1000, lower = safer
  level: RiskLevel
  risks: RiskItem[]
  topHoldersPct: number  // % held by top 10 wallets
  hasMintAuthority: boolean
  hasFreezeAuthority: boolean
  isKnown: boolean        // known token (e.g. SOL, USDC)
}

export interface RiskItem {
  name: string
  description: string
  level: 'warn' | 'danger'
  score: number
}

// Known safe tokens — skip RugCheck for these
const KNOWN_SAFE_MINTS = new Set([
  'So11111111111111111111111111111111111111112',   // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // JitoSOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  // mSOL
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk',  // WEN
])

function scoreToLevel(score: number): RiskLevel {
  if (score <= 200) return 'safe'
  if (score <= 500) return 'warn'
  return 'danger'
}

async function fetchTokenRisk(mint: string): Promise<TokenRisk> {
  if (KNOWN_SAFE_MINTS.has(mint)) {
    return {
      mint,
      score: 0,
      level: 'safe',
      risks: [],
      topHoldersPct: 0,
      hasMintAuthority: false,
      hasFreezeAuthority: false,
      isKnown: true,
    }
  }

  try {
    const res = await fetch(`${RUGCHECK_API}/${mint}/report/summary`)
    if (!res.ok) throw new Error(`RugCheck API error: ${res.status}`)
    const data = await res.json()

    const risks: RiskItem[] = (data.risks ?? []).map((r: any) => ({
      name: r.name ?? 'Unknown risk',
      description: r.description ?? '',
      level: (r.level === 'danger' ? 'danger' : 'warn') as 'warn' | 'danger',
      score: r.score ?? 0,
    }))

    const score = data.score ?? 999
    return {
      mint,
      score,
      level: scoreToLevel(score),
      risks,
      topHoldersPct: data.topHolders
        ? data.topHolders.reduce((s: number, h: any) => s + (h.pct ?? 0), 0)
        : 0,
      hasMintAuthority: !!data.mintAuthority,
      hasFreezeAuthority: !!data.freezeAuthority,
      isKnown: false,
    }
  } catch {
    // If RugCheck is unavailable, return unknown
    return {
      mint,
      score: -1,
      level: 'unknown',
      risks: [],
      topHoldersPct: 0,
      hasMintAuthority: false,
      hasFreezeAuthority: false,
      isKnown: false,
    }
  }
}

/** Hook to check a single token's risk via RugCheck */
export function useTokenRisk(mint: string | null) {
  return useQuery({
    queryKey: ['token-risk', mint],
    queryFn: () => fetchTokenRisk(mint!),
    enabled: !!mint,
    staleTime: 5 * 60 * 1000,  // 5 min
    retry: 1,
  })
}

/** Hook to check multiple tokens at once */
export function useTokenRisks(mints: string[]) {
  return useQuery({
    queryKey: ['token-risks', ...mints.sort()],
    queryFn: () => Promise.all(mints.map(fetchTokenRisk)),
    enabled: mints.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (results) => {
      const map: Record<string, TokenRisk> = {}
      results.forEach((r) => { map[r.mint] = r })
      return map
    },
  })
}

/* ── UI Helpers ── */

export const RISK_CONFIG = {
  safe: {
    label: '✅ Safe',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: '✅',
  },
  warn: {
    label: '⚠️ Caution',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: '⚠️',
  },
  danger: {
    label: '🚨 High Risk',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '🚨',
  },
  unknown: {
    label: '❓ Unverified',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    icon: '❓',
  },
} as const
