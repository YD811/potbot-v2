import { BAG_LEGS, isLegLive, legLabel } from '@/lib/bag/config'
import type { BagWeights } from '@/lib/bag/recipes'

/**
 * Stacked bar of a BAG's weights. With `legend`, each asset is a chip that
 * shows what the token is on hover or keyboard focus: symbol, issuer, the
 * issuer's powers. CSS only, no client JavaScript.
 */
export function WeightBar({ weights, legend = false, className = '' }: { weights: BagWeights; legend?: boolean; className?: string }) {
  const legs = BAG_LEGS.filter(l => weights[l.key] > 0)
  const label = legs.map(l => `${weights[l.key]}% ${legLabel(l)}`).join(', ')
  return (
    <div className={className}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-pot-border" role="img" aria-label={label}>
        {legs.map(l => (
          <div key={l.key} style={{ width: `${weights[l.key]}%`, background: l.color }} className="h-full transition-[width] duration-300 ease-out" />
        ))}
      </div>
      {legend && (
        <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-pot-muted">
          {legs.map(l => (
            <li key={l.key} className="group relative">
              <button type="button" className="flex cursor-help items-center gap-1.5 rounded-full px-2 py-1 transition hover:bg-pot-border/40 focus-visible:bg-pot-border/40 focus-visible:outline-none">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.color }} aria-hidden />
                <span className="font-mono text-white">{weights[l.key]}%</span> {legLabel(l)}
              </button>
              <div role="tooltip" className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-64 translate-y-1 rounded-xl border border-pot-border bg-pot-card p-3 text-left opacity-0 shadow-xl transition duration-150 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="font-semibold text-white">{l.symbol} <span className="font-normal text-pot-muted">· {l.name}</span></p>
                <p className="mt-1 text-pot-muted">Issued by {l.issuer}</p>
                {!isLegLive(l) && <p className="mt-1 text-pot-amber">Not live yet</p>}
                <ul className="mt-2 flex flex-wrap gap-1">
                  {l.risks.map(r => <li key={r} className="rounded-full border border-pot-border px-2 py-0.5 text-[10px]">{r}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
