import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { BagClient } from '@/components/bag/BagClient'
import { BagJoin } from '@/components/bag/BagJoin'
import { WeightBar } from '@/components/bag/WeightBar'
import { BagArt } from '@/components/bag/BagArt'
import { BAG_BUY_ENABLED, BAG_LEGS, legLabel, blockedCountries } from '@/lib/bag/config'
import { creatorLabel, encodeWeights, isKnownSlug, isOfficial, shareText } from '@/lib/bag/recipes'
import { getRecipe } from '@/lib/bag/recipes-server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const recipe = isKnownSlug(slug) ? await getRecipe(slug) : null
  if (!recipe) return { title: 'BAG not found | PotBot' }
  const mix = BAG_LEGS.filter(l => recipe.weights[l.key] > 0).map(l => `${recipe.weights[l.key]}% ${legLabel(l)}`).join(' · ')
  return {
    title: `${recipe.name}: ${mix} | PotBot BAG`,
    description: `${recipe.name} is ${isOfficial(recipe) ? 'the official BAG' : 'a community BAG'} on PotBot: ${mix}. Join it or build your own. Beta.`,
    openGraph: { title: `${recipe.name} · a PotBot BAG`, description: mix },
    twitter: { card: 'summary_large_image', title: `${recipe.name} · a PotBot BAG`, description: mix },
  }
}

export default async function BagRecipePage({ params }: Props) {
  const { slug } = await params
  const recipe = isKnownSlug(slug) ? await getRecipe(slug) : null
  if (!recipe) notFound()

  const country = ((await headers()).get('x-vercel-ip-country') ?? '').toUpperCase()
  const blocked = country !== '' && blockedCountries().has(country)
  const official = isOfficial(recipe)
  const link = `https://potbot.fun/bag/${recipe.slug}`
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText(recipe.name, recipe.weights))}&url=${encodeURIComponent(link)}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={official ? 'The official BAG · by PotBot' : `Community BAG · by ${creatorLabel(recipe)}`}
        title={recipe.name}
        lede={official
          ? 'Bitcoin, Anthropic and gold in equal parts. The first BAG and the default one. Not a fund, not a token and not advice.'
          : 'A mix of Bitcoin, Anthropic and gold built by a PotBot user. Not a fund, not a token and not advice.'}
        action={official ? <BagArt className="h-28 w-auto" /> : undefined}
      />

      {blocked ? (
        <div className="card p-6 text-pot-muted">BAG is not available in your region.</div>
      ) : (
        <div className="space-y-6">
          <div className="card p-5 sm:p-6">
            <WeightBar weights={recipe.weights} />
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {BAG_LEGS.filter(l => recipe.weights[l.key] > 0).map(l => (
                <li key={l.key}>
                  <p className="font-mono text-3xl tabular-nums text-white">{recipe.weights[l.key]}%</p>
                  <p className="mt-1 text-sm" style={{ color: l.color }}>{legLabel(l)}</p>
                  <p className="text-xs text-pot-muted">{l.symbol} · {l.issuer}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-pot-border pt-5">
              <BagJoin slug={recipe.slug} creator={recipe.creator} initialJoins={recipe.joins} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <a className="btn-secondary" href={xUrl} target="_blank" rel="noopener noreferrer">Share on X</a>
              <Link className="btn-secondary" href={official ? '/bag' : `/bag?w=${encodeWeights(recipe.weights)}`}>{official ? 'Build your own BAG' : 'Remix this BAG'}</Link>
              <Link className="self-center text-pot-muted underline" href="/bag">All community BAGs</Link>
            </div>
          </div>

          {BAG_BUY_ENABLED ? (
            <BagClient weights={recipe.weights} bagSlug={recipe.slug} title={`Buy ${recipe.name}`} />
          ) : (
            <div className="card p-5 text-sm text-pot-muted">
              <p className="font-semibold text-white">Buying opens after the Anthropic listing</p>
              <p className="mt-1">Join now and you are in this BAG from day one. When buying opens, one click buys this exact mix with USDC, straight into your own wallet.</p>
            </div>
          )}

          <p className="text-xs text-pot-muted">
            Beta. High risk. Each token is issued by a third party that can freeze or claw it back. Tokenized stocks are not available to US persons.
            A BAG is a mix of weights, not a recommendation. Only use money you can afford to lose.
          </p>
        </div>
      )}
    </div>
  )
}
