'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Enters once: translateY 12px + opacity, 500 ms, the site-wide easing. Visible at rest if JS is slow. */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div', style }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li'; style?: React.CSSProperties }) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect() }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 })
    io.observe(el)
    const t = setTimeout(() => el.classList.add('is-in'), 2500) // never leave content hidden
    return () => { io.disconnect(); clearTimeout(t) }
  }, [])
  const Comp = Tag as 'div'
  return (
    <Comp ref={ref as React.RefObject<HTMLDivElement>} className={`v3-reveal ${className}`} style={{ ...(style ?? {}), ...(delay ? { transitionDelay: `${delay}ms` } : {}) }}>
      {children}
    </Comp>
  )
}
