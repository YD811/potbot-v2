'use client'

/**
 * Signature animation: five assets drop into the Pot, one token rises.
 * Pure CSS keyframes, loops every 8 s, stops under prefers-reduced-motion.
 */
const COINS = [
  { label: 'SOL', color: '#E07A4F', x: 60, delay: 0 },
  { label: 'JUP', color: '#E9C46A', x: 100, delay: 0.25 },
  { label: 'TSLA', color: '#9CCB6E', x: 140, delay: 0.5 },
  { label: 'QQQ', color: '#7FA7C9', x: 180, delay: 0.75 },
  { label: 'BONK', color: '#B08BC9', x: 220, delay: 1.0 },
]

export function PotAnimation({ className = '' }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[320px] ${className}`} aria-hidden>
      <style>{`
        .v3pot-coin { animation: v3-coin 2.4s var(--ease-pot) infinite; transform-origin: center; }
        .v3pot-token { animation: v3-token 2.4s var(--ease-pot) infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) { .v3pot-coin, .v3pot-token { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <svg viewBox="0 0 280 260" className="h-auto w-full" fill="none">
        {/* coins */}
        {COINS.map((c) => (
          <g key={c.label} className="v3pot-coin" style={{ animationDelay: `${c.delay}s`, transformBox: 'fill-box' }}>
            <circle cx={c.x} cy={120} r={16} fill={c.color} />
            <text x={c.x} y={124} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono), monospace" fontWeight="500" fill="#1A120C">{c.label}</text>
          </g>
        ))}
        {/* pot */}
        <path d="M70 150 h140 l-10 70 a12 12 0 0 1 -12 10 h-96 a12 12 0 0 1 -12 -10 z" fill="var(--c-card)" stroke="var(--c-border-2)" strokeWidth="2" />
        <rect x="62" y="140" width="156" height="16" rx="8" fill="var(--c-card-2)" stroke="var(--c-border-2)" strokeWidth="2" />
        {/* token */}
        <g className="v3pot-token" style={{ animationDelay: '1.4s', transformBox: 'fill-box' }}>
          <circle cx="140" cy="198" r="22" fill="#E07A4F" />
          <circle cx="140" cy="198" r="22" stroke="#1A120C" strokeOpacity=".25" strokeWidth="2" />
          <text x="140" y="203" textAnchor="middle" fontSize="12" fontFamily="var(--font-mono), monospace" fontWeight="500" fill="#1A120C">1 token</text>
        </g>
      </svg>
    </div>
  )
}
