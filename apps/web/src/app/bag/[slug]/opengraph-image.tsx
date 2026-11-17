import { ImageResponse } from 'next/og'
import { BAG_LEGS, legLabel } from '@/lib/bag/config'
import { creatorLabel, isKnownSlug, isOfficial } from '@/lib/bag/recipes'
import { getRecipe } from '@/lib/bag/recipes-server'

export const runtime = 'nodejs'
export const alt = 'A community BAG on PotBot'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Share card for a community BAG: name, weights bar, the three percentages. */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const recipe = isKnownSlug(slug) ? await getRecipe(slug) : null
  const legs = recipe ? BAG_LEGS.filter(l => recipe.weights[l.key] > 0) : []

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#14120F', padding: '0 80px', fontFamily: 'Georgia, serif' }}>
        <div style={{ display: 'flex', color: '#E07A4F', fontFamily: 'monospace', fontSize: 24, letterSpacing: 3 }}>
          {recipe ? (isOfficial(recipe) ? 'THE OFFICIAL BAG · BY POTBOT' : `COMMUNITY BAG · BY ${creatorLabel(recipe)}`) : 'POTBOT · BUILD YOUR BAG'}
        </div>
        <div style={{ display: 'flex', marginTop: 20, fontSize: 84, fontWeight: 600, color: '#F2ECE0', letterSpacing: -2, lineHeight: 1.05 }}>
          {recipe?.name ?? 'Build your BAG'}
        </div>
        {recipe && (
          <div style={{ display: 'flex', marginTop: 44, height: 28, width: '100%', borderRadius: 14, overflow: 'hidden', background: '#2E2A23' }}>
            {legs.map(l => (
              <div key={l.key} style={{ display: 'flex', width: `${recipe.weights[l.key]}%`, height: '100%', background: l.color }} />
            ))}
          </div>
        )}
        {recipe && (
          <div style={{ display: 'flex', marginTop: 36 }}>
            {legs.map(l => (
              <div key={l.key} style={{ display: 'flex', flexDirection: 'column', marginRight: 72 }}>
                <span style={{ fontSize: 64, color: '#F2ECE0', fontFamily: 'monospace' }}>{recipe.weights[l.key]}%</span>
                <span style={{ fontSize: 28, color: l.color, fontFamily: 'system-ui, sans-serif' }}>{legLabel(l)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', marginTop: 44, fontSize: 24, color: '#C9C0B0', fontFamily: 'monospace' }}>
          potbot.fun/bag{recipe ? `/${recipe.slug}` : ''} · beta
        </div>
      </div>
    ),
    { ...size },
  )
}
