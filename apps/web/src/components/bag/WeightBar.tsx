import { BAG_LEGS, legLabel } from '@/lib/bag/config'
import type { BagWeights } from '@/lib/bag/recipes'

/** Stacked bar of a BAG's weights, with an optional legend. */
export function WeightBar({ weights, legend = false, className = '' }: { weights: BagWeights; legend?: boolean; className?: string }) {
  const legs = BAG_LEGS.filter(l => weights[l.key] > 0)
  const label = legs.map(l => `${weights[l.key]}% ${legLabel(l)}`).join(', ')
  return (
    <div className={className}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-pot-border" role="img" aria-label={label}>
        {legs.map(l => (
          <div key={l.key} style={{ width: `${weights[l.key]}%`, background: l.color }} className="h-full transition-[width] duration-200" />
        ))}
      </div>
      {legend && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pot-muted">
          {legs.map(l => (
            <li key={l.key} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.color }} aria-hidden />
              <span className="font-mono text-white">{weights[l.key]}%</span> {legLabel(l)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
