import type { ReactNode } from 'react'

/**
 * One header for every product page: eyebrow, title, lede, optional action on the right.
 * Same scale everywhere so the site reads as one product (design v3).
 */
export function PageHeader({ eyebrow, title, lede, action, className = '' }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={`mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="max-w-3xl">
        {eyebrow && <p className="font-mono text-xs uppercase tracking-[0.14em] text-pot-accent">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-5xl">{title}</h1>
        {lede && <p className="mt-4 max-w-[36em] text-base text-pot-muted sm:text-lg">{lede}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
