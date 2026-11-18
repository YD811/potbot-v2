/**
 * Build your BAG — recipes.
 *
 * A recipe is a named set of weights over the allowlisted BAG legs, saved
 * by a wallet. It holds no funds and is not a token: it is a shareable
 * template. When buying is open, a buy made on a recipe page is split by
 * the recipe's weights and attributed to its creator for BAG Points.
 *
 * Pure functions only (shared by client and server).
 */
import { BAG_LEGS, legLabel, type BagLeg, type BagLegKey } from './config'

export type BagWeights = Record<BagLegKey, number>

export const LEG_KEYS: BagLegKey[] = BAG_LEGS.map(l => l.key)
export const MIN_LEGS = 2
export const MAX_RECIPES_PER_WALLET = 3
export const NAME_MAX = 32
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,22})[a-z0-9]$/
export const SIGN_WINDOW_MS = 10 * 60_000

/** Slugs that would collide with routes or read as official. */
export const RESERVED_SLUGS = new Set([
  'bag', 'bags', 'api', 'new', 'create', 'admin', 'potbot', 'official', 'anthropic', 'bitcoin',
  'gold', 'coinbase', 'tether', 'paxos', 'jupiter', 'solana', 'leaderboard', 'points', 'classic',
])

/** The PotBot BAG: equal weights, pinned first, stored as a normal recipe row. */
export const OFFICIAL_SLUG = 'potbot'
/** Not a wallet on purpose: the official BAG has no creator who earns from joins. */
export const OFFICIAL_CREATOR = 'potbot'

export interface BagRecipe {
  slug: string
  name: string
  creator: string
  weights: BagWeights
  created_at: string
}

export function shortWallet(w: string): string {
  return `${w.slice(0, 4)}…${w.slice(-4)}`
}

export const CLASSIC_WEIGHTS: BagWeights = { btc: 34, ant: 33, gold: 33 }

export const PRESETS: { label: string; weights: BagWeights }[] = [
  { label: 'Classic', weights: CLASSIC_WEIGHTS },
  { label: 'AI maxi', weights: { btc: 20, ant: 60, gold: 20 } },
  { label: 'Hard money', weights: { btc: 50, ant: 10, gold: 40 } },
  { label: 'Sleep well', weights: { btc: 20, ant: 20, gold: 60 } },
]

/** Whole percents, every known leg present, sum 100, at least MIN_LEGS non-zero. */
export function validateWeights(w: unknown): w is BagWeights {
  if (!w || typeof w !== 'object') return false
  const rec = w as Record<string, unknown>
  if (Object.keys(rec).length !== LEG_KEYS.length) return false
  let sum = 0
  let nonZero = 0
  for (const k of LEG_KEYS) {
    const v = rec[k]
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100) return false
    sum += v
    if (v > 0) nonZero++
  }
  return sum === 100 && nonZero >= MIN_LEGS
}

/**
 * Move one slider and keep the total at 100: the other legs absorb the
 * change in proportion to their current size (equally if they are all 0).
 */
export function rebalance(w: BagWeights, key: BagLegKey, value: number): BagWeights {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const others = LEG_KEYS.filter(k => k !== key)
  const rest = 100 - v
  const otherSum = others.reduce((s, k) => s + w[k], 0)
  const out = { ...w, [key]: v } as BagWeights
  let allocated = 0
  others.forEach((k, i) => {
    const share = i === others.length - 1
      ? rest - allocated
      : Math.round(otherSum > 0 ? (rest * w[k]) / otherSum : rest / others.length)
    out[k] = Math.max(0, Math.min(rest - allocated, share))
    allocated += out[k]
  })
  return out
}

/** "50-30-20" in LEG_KEYS order, for remix links. */
export function encodeWeights(w: BagWeights): string {
  return LEG_KEYS.map(k => w[k]).join('-')
}

export function decodeWeights(s: string | null | undefined): BagWeights | null {
  if (!s || !/^\d{1,3}(-\d{1,3})*$/.test(s)) return null
  const parts = s.split('-').map(Number)
  if (parts.length !== LEG_KEYS.length) return null
  const w = Object.fromEntries(LEG_KEYS.map((k, i) => [k, parts[i]])) as BagWeights
  return validateWeights(w) ? w : null
}

/** Legs with the recipe's weights applied (bps), zero-weight legs dropped. */
export function legsForWeights(w: BagWeights, legs: BagLeg[] = BAG_LEGS): BagLeg[] {
  return legs.filter(l => w[l.key] > 0).map(l => ({ ...l, weightBps: w[l.key] * 100 }))
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/g, '')
}

export function cleanName(name: string): string {
  return name.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug)
}

/**
 * Human-readable messages the wallet signs. No transaction, no funds, no
 * approval: the signature only proves the wallet owns the action.
 */
export function createMessage(p: { slug: string; name: string; weights: BagWeights; wallet: string; ts: number }): string {
  return [
    'PotBot · Build your BAG',
    'Action: create',
    `BAG: ${p.slug}`,
    `Name: ${p.name}`,
    `Weights: ${encodeWeights(p.weights)}`,
    `Wallet: ${p.wallet}`,
    `Time: ${p.ts}`,
    'This signature moves no funds.',
  ].join('\n')
}

export function joinMessage(p: { slug: string; wallet: string; ts: number }): string {
  return [
    'PotBot · Build your BAG',
    'Action: join',
    `BAG: ${p.slug}`,
    `Wallet: ${p.wallet}`,
    `Time: ${p.ts}`,
    'This signature moves no funds.',
  ].join('\n')
}

/** A slug users can create, or the official one. Use for lookups, not for creation. */
export function isKnownSlug(slug: string): boolean {
  return slug === OFFICIAL_SLUG || isValidSlug(slug)
}

export function isOfficial(r: { slug: string }): boolean {
  return r.slug === OFFICIAL_SLUG
}

export function creatorLabel(r: { slug: string; creator: string }): string {
  return isOfficial(r) ? 'PotBot' : shortWallet(r.creator)
}

export function isFreshTs(ts: unknown, now = Date.now()): ts is number {
  return typeof ts === 'number' && Number.isFinite(ts) && Math.abs(now - ts) <= SIGN_WINDOW_MS
}


/** Post text for X. The link is passed separately. */
export function shareText(name: string, weights: BagWeights): string {
  const mix = BAG_LEGS.filter(l => weights[l.key] > 0).map(l => `${weights[l.key]}% ${legLabel(l)}`).join(' · ')
  return `I built my BAG on @PotBot_sol: ${name}\n${mix}\n\nJoin it or build your own:`
}
