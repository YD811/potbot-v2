'use client'

import { STAGES, plantSrc, potSeries, stageForUsd } from '@/lib/pot-index/garden'
import type { PotView } from '@/lib/pot-index/client'

/** Small plant next to a POTFolio's name: stage is derived from the value held in the Pot. */
export function PlantBadge({ pot, navUsd, size = 44 }: { pot: PotView; navUsd?: number; size?: number }) {
  const stage = stageForUsd(navUsd ?? 0)
  const st = STAGES[stage - 1]
  return (
    <div
      className="flex shrink-0 items-end justify-center rounded-xl"
      style={{ width: size, height: size, background: 'rgba(156,203,110,0.08)', border: '1px solid var(--c-border)' }}
      title={`Level ${st.level} · ${st.name}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={plantSrc(potSeries(pot), stage)} alt={st.name} draggable={false} className="max-h-[86%] max-w-[86%] object-contain" />
    </div>
  )
}
