'use client'

/**
 * Signature animation: five assets drop into the Pot, one token rises.
 * Coins and the token are HTML elements (GPU-composited transforms), only
 * the pot is SVG. Loops every 2.4 s, stops under prefers-reduced-motion.
 */
const COINS = [
  { label: 'SOL', color: '#E07A4F', left: '14%', delay: 0 },
  { label: 'JUP', color: '#E9C46A', left: '30%', delay: 0.25 },
  { label: 'TSLA', color: '#9CCB6E', left: '46%', delay: 0.5 },
  { label: 'QQQ', color: '#7FA7C9', left: '62%', delay: 0.75 },
  { label: 'BONK', color: '#B08BC9', left: '78%', delay: 1.0 },
]

export function PotAnimation({ className = '' }: { className?: string }) {
  return (
    <div className={`relative mx-auto aspect-[280/260] w-full max-w-[320px] ${className}`} aria-hidden>
      <style>{`
        .v3pot-coin { position:absolute; top:38%; width:32px; height:32px; margin-left:-16px; border-radius:50%; display:flex; align-items:center; justify-content:center; font:500 9px var(--font-mono), monospace; color:#1A120C; will-change:transform,opacity; animation: v3-coin 2.4s var(--ease-pot) infinite; }
        .v3pot-token { position:absolute; left:50%; top:66%; width:48px; height:48px; margin:-24px 0 0 -24px; border-radius:50%; background:#E07A4F; box-shadow: inset 0 0 0 2px rgba(26,18,12,.25); display:flex; align-items:center; justify-content:center; font:500 11px var(--font-mono), monospace; color:#1A120C; will-change:transform,opacity; animation: v3-token 2.4s var(--ease-pot) infinite; animation-delay:1.4s; }
        @media (prefers-reduced-motion: reduce) { .v3pot-coin, .v3pot-token { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <svg viewBox="0 0 280 260" className="absolute inset-0 h-full w-full" fill="none">
        <path d="M70 150 h140 l-10 70 a12 12 0 0 1 -12 10 h-96 a12 12 0 0 1 -12 -10 z" fill="var(--c-card)" stroke="var(--c-border-2)" strokeWidth="2" />
        <rect x="62" y="140" width="156" height="16" rx="8" fill="var(--c-card-2)" stroke="var(--c-border-2)" strokeWidth="2" />
      </svg>
      {COINS.map((c) => (
        <span key={c.label} className="v3pot-coin" style={{ left: c.left, background: c.color, animationDelay: `${c.delay}s` }}>{c.label}</span>
      ))}
      <span className="v3pot-token">1 token</span>
    </div>
  )
}
