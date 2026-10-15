import { assetByMint } from './registry'
import type { PotView } from './client'

/**
 * Garden mode: every POTFolio is a plant. Its level is a pure function of the
 * value held in the Pot (supply × NAV), so it can be read from chain and never faked.
 */
export type PlantSeries = 'pink' | 'purple' | 'blue' | 'coral'
export type PlantStage = 1 | 2 | 3 | 4 | 5 | 6

/** `unlocks`: what reaching the level gives the POTFolio. Rolling out after the Fair (off-chain first, fee tier in program v2). */
export const STAGES: { level: PlantStage; name: string; minUsd: number; label: string; unlocks: string }[] = [
  { level: 1, name: 'Seedling', minUsd: 0, label: '$0', unlocks: 'Shareable by link' },
  { level: 2, name: 'Sprout', minUsd: 1_000, label: '$1k', unlocks: 'Public catalog and leaderboard' },
  { level: 3, name: 'Bud', minUsd: 10_000, label: '$10k', unlocks: 'Verified badge, share card' },
  { level: 4, name: 'Bloom', minUsd: 50_000, label: '$50k', unlocks: 'Featured, DEX pool seeded' },
  { level: 5, name: 'Full Bloom', minUsd: 250_000, label: '$250k', unlocks: 'Managed mode for the creator' },
  { level: 6, name: 'Mature Tree', minUsd: 1_000_000, label: '$1M', unlocks: 'Community mode, lower protocol fee' },
]

export function stageForUsd(navUsd: number): PlantStage {
  let s: PlantStage = 1
  for (const st of STAGES) if (navUsd >= st.minUsd) s = st.level
  return s
}

const SERIES_BY_CATEGORY: Record<string, PlantSeries> = {
  crypto: 'pink',
  solana: 'purple',
  stock: 'blue',
  meme: 'coral',
}

/** A Pot's category = the category carrying the most weight. */
export function potCategory(p: PotView): 'crypto' | 'solana' | 'stock' | 'meme' {
  const w: Record<string, number> = {}
  for (const l of p.legs) {
    const c = assetByMint(l.mint.toBase58())?.category ?? 'crypto'
    w[c] = (w[c] ?? 0) + l.weightBps
  }
  return (Object.entries(w).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'crypto') as 'crypto' | 'solana' | 'stock' | 'meme'
}

export function potSeries(p: PotView): PlantSeries {
  return SERIES_BY_CATEGORY[potCategory(p)] ?? 'pink'
}

/** Tight square crop: badges, icons, cards. */
export function plantSrc(series: PlantSeries, stage: PlantStage): string {
  return `/garden/${series}-${stage}.webp`
}

/** Same pot size at every level, only the plant grows: the Garden ladder and big displays. */
export function plantFullSrc(series: PlantSeries, stage: PlantStage): string {
  return `/garden/full/${series}-${stage}.webp`
}
