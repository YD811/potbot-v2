'use client'

/**
 * Signature animation, one 3.6 s loop:
 * five listed assets arc into the Pot one by one, the pot settles under each,
 * then glows and one token rises with a soft ring. Transforms and opacity only.
 * Under prefers-reduced-motion everything rests in its final pose.
 */
const COINS = [
  { label: 'SOL', color: '#E07A4F', x: -96, delay: 0 },
  { label: 'BTC', color: '#E9C46A', x: -48, delay: 0.22 },
  { label: 'TSLA', color: '#9CCB6E', x: 0, delay: 0.44 },
  { label: 'ETH', color: '#7FA7C9', x: 48, delay: 0.66 },
  { label: 'QQQ', color: '#B08BC9', x: 96, delay: 0.88 },
]

const CSS = `
.pa-root { --pa-loop: 3.6s; }
.pa-coin { position:absolute; left:50%; top:46%; width:36px; height:36px; margin:-18px 0 0 -18px; border-radius:50%;
  display:flex; align-items:center; justify-content:center; font:500 9px var(--font-mono), monospace; letter-spacing:.02em; color:#1A120C;
  box-shadow: inset 0 0 0 2px rgba(26,18,12,.12), inset 0 -3px 0 rgba(26,18,12,.12), 0 6px 14px -8px rgba(26,18,12,.6);
  will-change: transform, opacity; backface-visibility:hidden; animation: pa-coin var(--pa-loop) cubic-bezier(.45,0,.55,1) infinite; }
.pa-pot { transform-origin: 50% 100%; animation: pa-pot var(--pa-loop) var(--ease-pot) infinite; }
.pa-glow { position:absolute; left:50%; top:62%; width:64%; height:26%; transform:translate(-50%,-50%); border-radius:9999px;
  background: radial-gradient(ellipse, rgba(224,122,79,.55), transparent 70%); filter: blur(16px); opacity:.15;
  animation: pa-glow var(--pa-loop) var(--ease-pot) infinite; }
.pa-token { position:absolute; left:50%; top:52%; width:60px; height:60px; margin:-30px 0 0 -30px; border-radius:50%;
  background: radial-gradient(circle at 35% 30%, #F0A27F, #E07A4F 60%, #C9653D); color:#1A120C;
  display:flex; align-items:center; justify-content:center; font:600 10px var(--font-mono), monospace; letter-spacing:.02em;
  box-shadow: inset 0 0 0 2px rgba(26,18,12,.18), 0 14px 26px -14px rgba(224,122,79,.9);
  will-change: transform, opacity; animation: pa-token var(--pa-loop) var(--ease-pot) infinite; }
.pa-ring { position:absolute; left:50%; top:52%; width:60px; height:60px; margin:-30px 0 0 -30px; border-radius:50%;
  border:2px solid rgba(224,122,79,.6); opacity:0; animation: pa-ring var(--pa-loop) var(--ease-pot) infinite; }
.pa-shadow { position:absolute; left:50%; bottom:4%; width:56%; height:6%; transform:translateX(-50%); border-radius:9999px;
  background: rgba(26,18,12,.18); filter: blur(6px); }

@keyframes pa-coin {
  0%   { transform: translate3d(var(--x), -150px, 0) rotate(-40deg); opacity: 0; }
  8%   { opacity: 1; }
  30%  { transform: translate3d(calc(var(--x) * .25), 20px, 0) rotate(0deg); opacity: 1; }
  36%  { transform: translate3d(0, 46px, 0) scale(.7); opacity: 0; }
  100% { transform: translate3d(0, 46px, 0) scale(.7); opacity: 0; }
}
@keyframes pa-pot {
  0%, 29% { transform: none; }
  31% { transform: scale(1.02, .97); } 34% { transform: none; }
  37% { transform: scale(1.02, .97); } 40% { transform: none; }
  43% { transform: scale(1.02, .97); } 46% { transform: none; }
  49% { transform: scale(1.02, .97); } 52% { transform: none; }
  55% { transform: scale(1.04, .95); } 60% { transform: scale(.99, 1.01); } 64% { transform: none; }
  100% { transform: none; }
}
@keyframes pa-glow { 0%, 50% { opacity: .12; } 62% { opacity: .95; } 90%, 100% { opacity: .18; } }
@keyframes pa-token {
  0%, 56% { transform: translate3d(0, 30px, 0) scale(.5); opacity: 0; }
  68% { transform: translate3d(0, -78px, 0) scale(1.06); opacity: 1; }
  76% { transform: translate3d(0, -70px, 0) scale(1); opacity: 1; }
  90% { transform: translate3d(0, -74px, 0) scale(1); opacity: 1; }
  100% { transform: translate3d(0, -84px, 0) scale(.96); opacity: 0; }
}
@keyframes pa-ring {
  0%, 67% { transform: translate3d(0, -70px, 0) scale(1); opacity: 0; }
  69% { opacity: .8; }
  90%, 100% { transform: translate3d(0, -70px, 0) scale(2.1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .pa-coin { animation: none; opacity: 0; }
  .pa-pot, .pa-glow, .pa-ring { animation: none; }
  .pa-token { animation: none; transform: translate3d(0, -72px, 0); opacity: 1; }
}
`

export function PotAnimation({ className = '' }: { className?: string }) {
  return (
    <div className={`pa-root relative mx-auto aspect-[280/260] w-full max-w-[340px] ${className}`} aria-hidden>
      <style>{CSS}</style>
      <span className="pa-shadow" />
      <span className="pa-glow" />
      <span className="pa-ring" />
      <span className="pa-token">1 token</span>
      {COINS.map((c) => (
        <span
          key={c.label}
          className="pa-coin"
          style={{ background: c.color, animationDelay: `${c.delay}s`, ['--x' as string]: `${c.x}px` } as React.CSSProperties}
        >
          {c.label}
        </span>
      ))}
      <svg viewBox="0 0 280 260" className="pa-pot absolute inset-0 h-full w-full" fill="none">
        <path d="M70 150 h140 l-10 70 a12 12 0 0 1 -12 10 h-96 a12 12 0 0 1 -12 -10 z" fill="var(--c-card)" stroke="var(--c-border-2)" strokeWidth="2" />
        <path d="M84 170 h112" stroke="var(--c-border-2)" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
        <rect x="62" y="140" width="156" height="16" rx="8" fill="var(--c-card-2)" stroke="var(--c-border-2)" strokeWidth="2" />
      </svg>
    </div>
  )
}
