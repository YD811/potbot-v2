'use client'

import { useEffect, useRef } from 'react'

/**
 * Hero backdrop: two soft brand glows drift slowly, a third follows the cursor.
 * The cursor glow is skipped on touch and under reduced motion; transforms only, so it stays at 60 fps.
 */
export function HeroGlow() {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const host = el.parentElement
    if (!host) return
    let raf = 0
    let tx = 0, ty = 0, x = 0, y = 0
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      tx = e.clientX - r.left
      ty = e.clientY - r.top
      el.style.opacity = '1'
      if (!raf) raf = requestAnimationFrame(step)
    }
    const step = () => {
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0
    }
    const onLeave = () => { el.style.opacity = '0' }
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-orb hero-orb-a" />
      <div className="hero-orb hero-orb-b" />
      <div ref={ref} className="hero-cursor" />
    </div>
  )
}
