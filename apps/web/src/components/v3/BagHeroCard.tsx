import Link from 'next/link'
import { BagArt } from '@/components/bag/BagArt'
import { WeightBar } from '@/components/bag/WeightBar'
import { CLASSIC_WEIGHTS, OFFICIAL_SLUG } from '@/lib/bag/recipes'

/** Home hero card: the PotBot BAG (Bitcoin · Anthropic · Gold). */
export function BagHeroCard() {
  return (
    <div className="v3-rise rounded-[28px] border border-pot-border bg-pot-card p-6 sm:p-8" style={{ animationDelay: '260ms' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">The first BAG</p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-white">PotBot BAG</h2>
          <p className="mt-1 text-sm text-pot-muted">Bitcoin · Anthropic · Gold</p>
        </div>
        <BagArt className="h-28 w-auto shrink-0 sm:h-32" title="A basket holding three coins" />
      </div>
      <WeightBar weights={CLASSIC_WEIGHTS} legend className="mt-6" />
      <p className="mt-5 text-sm text-pot-muted">Three assets in equal parts. Join it, invite people with your link, or set your own mix.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/bag/${OFFICIAL_SLUG}`} className="btn-primary px-5 py-2.5 text-sm">Join the BAG</Link>
        <Link href="/bag" className="btn-secondary px-5 py-2.5 text-sm">Build your own</Link>
      </div>
    </div>
  )
}
