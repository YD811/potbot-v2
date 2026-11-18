import 'server-only'
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { isOfficial, validateWeights, type BagRecipe } from './recipes'

export interface RecipeStats extends BagRecipe {
  joins: number
  /** USDC bought on this recipe's page (0 until buying is open). */
  volumeUsd: number
}

export function bagDbReady(): boolean {
  return isSupabaseConfigured && !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

function toRecipe(row: any): BagRecipe | null {
  if (!row || !validateWeights(row.weights)) return null
  return { slug: row.slug, name: row.name, creator: row.creator, weights: row.weights, created_at: row.created_at }
}

export async function getRecipe(slug: string): Promise<RecipeStats | null> {
  if (!bagDbReady()) return null
  const db = createServerSupabase()
  const { data } = await db.from('bag_recipes').select('*').eq('slug', slug).maybeSingle()
  const recipe = toRecipe(data)
  if (!recipe) return null
  const [joins, buys] = await Promise.all([
    db.from('bag_joins').select('wallet', { count: 'exact', head: true }).eq('slug', slug),
    db.from('bag_buys').select('usdc_in').eq('bag_slug', slug),
  ])
  const volumeUsd = (buys.data ?? []).reduce((s, b) => s + Number(b.usdc_in), 0)
  return { ...recipe, joins: joins.count ?? 0, volumeUsd: Math.round(volumeUsd * 100) / 100 }
}

/** The official BAG first, then all recipes ranked by volume, then joins, then age (oldest first). */
export async function listRecipes(limit = 50): Promise<RecipeStats[]> {
  if (!bagDbReady()) return []
  const db = createServerSupabase()
  const [recipes, joins, buys] = await Promise.all([
    db.from('bag_recipes').select('*').order('created_at', { ascending: true }).limit(1000),
    db.from('bag_joins').select('slug').limit(10_000),
    db.from('bag_buys').select('bag_slug, usdc_in').not('bag_slug', 'is', null).limit(10_000),
  ])
  const joinCount = new Map<string, number>()
  for (const j of joins.data ?? []) joinCount.set(j.slug, (joinCount.get(j.slug) ?? 0) + 1)
  const volume = new Map<string, number>()
  for (const b of buys.data ?? []) volume.set(b.bag_slug, (volume.get(b.bag_slug) ?? 0) + Number(b.usdc_in))

  return (recipes.data ?? [])
    .map(toRecipe)
    .filter((r): r is BagRecipe => r !== null)
    .map(r => ({ ...r, joins: joinCount.get(r.slug) ?? 0, volumeUsd: Math.round((volume.get(r.slug) ?? 0) * 100) / 100 }))
    .sort((a, b) => Number(isOfficial(b)) - Number(isOfficial(a)) || b.volumeUsd - a.volumeUsd || b.joins - a.joins || a.created_at.localeCompare(b.created_at))
    .slice(0, limit)
}
