/** Placeholder with the same shape as PotCard, shown while Pots load from the chain. */
export function PotCardSkeleton() {
  return (
    <div className="card block rounded-3xl p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="v3-skeleton h-12 w-12 !rounded-2xl" />
          <div>
            <div className="v3-skeleton h-5 w-36" />
            <div className="v3-skeleton mt-2 h-3 w-16" />
          </div>
        </div>
        <div className="v3-skeleton h-6 w-16 !rounded-full" />
      </div>
      <div className="v3-skeleton mt-5 h-2 w-full !rounded-full" />
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="v3-skeleton h-9" />
        <div className="v3-skeleton h-9" />
        <div className="v3-skeleton h-9" />
      </div>
    </div>
  )
}

export function PotCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => <PotCardSkeleton key={i} />)}
    </>
  )
}
