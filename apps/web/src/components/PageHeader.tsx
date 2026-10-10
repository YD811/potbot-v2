import type { ReactNode } from 'react'

/**
 * One header for every product page: eyebrow, title, lede, optional action on the right.
 * Same scale everywhere (3xl on phones, 5xl on desktop) so the site reads as one product.
 */
export function PageHeader({ eyebrow, title, lede, action, className = '' }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={`mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="max-w-3xl">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-pot-accent">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">{title}</h1>
        {lede && <p className="mt-4 text-base text-white/80 sm:text-lg">{lede}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
