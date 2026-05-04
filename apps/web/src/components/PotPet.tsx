'use client'

import { type PlantStage } from '@/lib/tamagotchi/plant'

interface Props {
  stage: PlantStage
  health: number      // 0-100
  size?: number       // viewBox units, default 200
  animate?: boolean
}

/** Animated SVG plant — 5 stages, purely CSS animations, no heavy deps */
export function PotPet({ stage, health, size = 200, animate = true }: Props) {
  const wilt = health < 30
  const pulse = animate && health > 50

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      aria-label={`${stage.name} plant, health ${health}%`}
    >
      <defs>
        <radialGradient id="glow-green" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
        </radialGradient>
        <filter id="blur-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {pulse && (
          <style>{`
            @keyframes sway { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
            @keyframes leaf-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
            @keyframes root-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
            @keyframes glow-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
            .sway { transform-origin:50% 90%; animation:sway 3s ease-in-out infinite; }
            .leaf-bob { animation:leaf-bob 2s ease-in-out infinite; }
            .root-pulse { animation:root-pulse 4s ease-in-out infinite; }
            .glow-pulse { animation:glow-pulse 3s ease-in-out infinite; }
          `}</style>
        )}
      </defs>

      {/* Glow under the pot */}
      {health > 40 && (
        <ellipse cx={size/2} cy={size*0.88} rx={size*0.28} ry={size*0.06}
          fill="url(#glow-green)" className={pulse ? 'glow-pulse' : ''} />
      )}

      {/* Stage 0: Seed 🌰 */}
      {stage.id === 0 && <SeedSVG s={size} wilt={wilt} pulse={pulse} />}
      {/* Stage 1: Sprout 🌱 */}
      {stage.id === 1 && <SproutSVG s={size} wilt={wilt} pulse={pulse} />}
      {/* Stage 2: Seedling 🪴 */}
      {stage.id === 2 && <SeedlingSVG s={size} wilt={wilt} pulse={pulse} />}
      {/* Stage 3: Plant 🌿 */}
      {stage.id === 3 && <PlantSVG s={size} wilt={wilt} pulse={pulse} />}
      {/* Stage 4: Tree 🌳 */}
      {stage.id === 4 && <TreeSVG s={size} wilt={wilt} pulse={pulse} />}
    </svg>
  )
}

/* ── Stage SVGs ─────────────────────────────────────────────────────────────── */

function Pot({ s, h = 0.78 }: { s: number; h?: number }) {
  const cx = s / 2, cy = s * h
  return (
    <g>
      {/* Pot body */}
      <path
        d={`M ${cx - s*0.18} ${cy} Q ${cx - s*0.22} ${cy + s*0.14} ${cx} ${cy + s*0.16} Q ${cx + s*0.22} ${cy + s*0.14} ${cx + s*0.18} ${cy} Z`}
        fill="#5c4033" stroke="#3e2723" strokeWidth="1.5"
      />
      {/* Rim */}
      <rect x={cx - s*0.20} y={cy - s*0.035} width={s*0.40} height={s*0.055} rx={s*0.02}
        fill="#795548" stroke="#3e2723" strokeWidth="1"
      />
      {/* Soil */}
      <ellipse cx={cx} cy={cy - s*0.01} rx={s*0.175} ry={s*0.025} fill="#4a2f1a" />
    </g>
  )
}

function Leaf({ x, y, rx=18, ry=9, angle=0, wilt=false, color='#22c55e', cls='' }: {
  x: number; y: number; rx?: number; ry?: number; angle?: number; wilt?: boolean; color?: string; cls?: string
}) {
  const fill = wilt ? '#a3a3a3' : color
  return (
    <ellipse cx={x} cy={y} rx={rx} ry={ry}
      fill={fill} stroke={wilt ? '#737373' : '#16a34a'} strokeWidth="1"
      transform={`rotate(${angle} ${x} ${y})`}
      className={cls}
      style={{ opacity: wilt ? 0.7 : 1 }}
    />
  )
}

function SeedSVG({ s, wilt, pulse }: { s:number; wilt:boolean; pulse:boolean }) {
  const cx = s/2, potY = s*0.78
  return (
    <g>
      <Pot s={s} h={0.78} />
      {/* Single tiny bump */}
      <ellipse cx={cx} cy={potY - s*0.055} rx={s*0.05} ry={s*0.045}
        fill={wilt ? '#a3a3a3' : '#92400e'} className={pulse ? 'leaf-bob' : ''} />
    </g>
  )
}

function SproutSVG({ s, wilt, pulse }: { s:number; wilt:boolean; pulse:boolean }) {
  const cx = s/2, potY = s*0.78
  const stemColor = wilt ? '#a3a3a3' : '#4ade80'
  return (
    <g className={pulse ? 'sway' : ''}>
      <Pot s={s} h={0.78} />
      {/* Stem */}
      <line x1={cx} y1={potY - s*0.04} x2={cx} y2={potY - s*0.22}
        stroke={stemColor} strokeWidth="3" strokeLinecap="round" />
      {/* Two small leaves */}
      <Leaf x={cx - s*0.08} y={potY - s*0.18} rx={s*0.07} ry={s*0.04} angle={-30} wilt={wilt} cls={pulse ? 'leaf-bob' : ''} />
      <Leaf x={cx + s*0.08} y={potY - s*0.18} rx={s*0.07} ry={s*0.04} angle={30} wilt={wilt} cls={pulse ? 'leaf-bob' : ''} />
    </g>
  )
}

function SeedlingSVG({ s, wilt, pulse }: { s:number; wilt:boolean; pulse:boolean }) {
  const cx = s/2, potY = s*0.78
  const stemColor = wilt ? '#a3a3a3' : '#22c55e'
  return (
    <g className={pulse ? 'sway' : ''}>
      <Pot s={s} h={0.78} />
      {/* Main stem */}
      <line x1={cx} y1={potY - s*0.04} x2={cx} y2={potY - s*0.38}
        stroke={stemColor} strokeWidth="3.5" strokeLinecap="round" />
      {/* Branch left */}
      <line x1={cx} y1={potY - s*0.28} x2={cx - s*0.12} y2={potY - s*0.32}
        stroke={stemColor} strokeWidth="2" strokeLinecap="round" />
      {/* Branch right */}
      <line x1={cx} y1={potY - s*0.22} x2={cx + s*0.12} y2={potY - s*0.26}
        stroke={stemColor} strokeWidth="2" strokeLinecap="round" />
      {/* Leaves */}
      <Leaf x={cx - s*0.14} y={potY - s*0.33} rx={s*0.09} ry={s*0.05} angle={-35} wilt={wilt} cls={pulse ? 'leaf-bob' : ''} />
      <Leaf x={cx + s*0.14} y={potY - s*0.27} rx={s*0.09} ry={s*0.05} angle={35} wilt={wilt} cls={pulse ? 'leaf-bob' : ''} />
      <Leaf x={cx} y={potY - s*0.39} rx={s*0.08} ry={s*0.045} angle={0} wilt={wilt} color="#16a34a" cls={pulse ? 'leaf-bob' : ''} />
    </g>
  )
}

function PlantSVG({ s, wilt, pulse }: { s:number; wilt:boolean; pulse:boolean }) {
  const cx = s/2, potY = s*0.78
  const stemColor = wilt ? '#9ca3af' : '#16a34a'
  return (
    <g className={pulse ? 'sway' : ''}>
      <Pot s={s} h={0.78} />
      {/* Trunk */}
      <line x1={cx} y1={potY - s*0.04} x2={cx} y2={potY - s*0.52}
        stroke={stemColor} strokeWidth="4" strokeLinecap="round" />
      {/* Branches */}
      {[
        { x1: cx, y1: potY-s*0.4,  x2: cx-s*0.16, y2: potY-s*0.46 },
        { x1: cx, y1: potY-s*0.34, x2: cx+s*0.16, y2: potY-s*0.40 },
        { x1: cx, y1: potY-s*0.26, x2: cx-s*0.13, y2: potY-s*0.30 },
        { x1: cx, y1: potY-s*0.20, x2: cx+s*0.12, y2: potY-s*0.24 },
      ].map((b, i) => (
        <line key={i} {...b} stroke={stemColor} strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {/* Leaf clusters */}
      <Leaf x={cx-s*0.19} y={potY-s*0.47} rx={s*0.11} ry={s*0.06} angle={-40} wilt={wilt} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx+s*0.19} y={potY-s*0.41} rx={s*0.11} ry={s*0.06} angle={40} wilt={wilt} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx-s*0.16} y={potY-s*0.31} rx={s*0.09} ry={s*0.055} angle={-35} wilt={wilt} cls={pulse?'leaf-bob':''} color="#15803d" />
      <Leaf x={cx+s*0.15} y={potY-s*0.25} rx={s*0.09} ry={s*0.055} angle={35} wilt={wilt} cls={pulse?'leaf-bob':''} color="#15803d" />
      <Leaf x={cx} y={potY-s*0.54} rx={s*0.1} ry={s*0.055} angle={0} wilt={wilt} cls={pulse?'leaf-bob':''} color="#14532d" />
    </g>
  )
}

function TreeSVG({ s, wilt, pulse }: { s:number; wilt:boolean; pulse:boolean }) {
  const cx = s/2, potY = s*0.78
  const trunkColor = wilt ? '#78716c' : '#713f12'
  const leafColor1 = wilt ? '#9ca3af' : '#22c55e'
  const leafColor2 = wilt ? '#6b7280' : '#16a34a'
  const leafColor3 = wilt ? '#4b5563' : '#14532d'
  return (
    <g className={pulse ? 'sway' : ''}>
      <Pot s={s} h={0.78} />
      {/* Thick trunk */}
      <rect x={cx-s*0.04} y={potY-s*0.56} width={s*0.08} height={s*0.52}
        rx={s*0.03} fill={trunkColor} />
      {/* Crown layers — bottom to top */}
      <Leaf x={cx} y={potY-s*0.52} rx={s*0.26} ry={s*0.14} angle={0} wilt={wilt} color={leafColor1} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx-s*0.12} y={potY-s*0.56} rx={s*0.20} ry={s*0.11} angle={-10} wilt={wilt} color={leafColor1} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx+s*0.12} y={potY-s*0.56} rx={s*0.20} ry={s*0.11} angle={10} wilt={wilt} color={leafColor1} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx} y={potY-s*0.64} rx={s*0.22} ry={s*0.12} angle={0} wilt={wilt} color={leafColor2} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx-s*0.10} y={potY-s*0.69} rx={s*0.17} ry={s*0.09} angle={-8} wilt={wilt} color={leafColor2} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx+s*0.10} y={potY-s*0.69} rx={s*0.17} ry={s*0.09} angle={8} wilt={wilt} color={leafColor2} cls={pulse?'leaf-bob':''} />
      <Leaf x={cx} y={potY-s*0.76} rx={s*0.16} ry={s*0.09} angle={0} wilt={wilt} color={leafColor3} cls={pulse?'leaf-bob':''} />
      {/* Star at top for rank 1 */}
      {!wilt && (
        <text x={cx} y={potY - s*0.82} textAnchor="middle" fontSize={s*0.09} className={pulse ? 'glow-pulse' : ''}>
          ✨
        </text>
      )}
    </g>
  )
}
