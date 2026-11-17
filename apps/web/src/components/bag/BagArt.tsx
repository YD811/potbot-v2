/**
 * The BAG: a woven basket holding three coins (B, A, G). Original artwork,
 * drawn in the site palette. Decorative unless a title is passed.
 */
export function BagArt({ className = '', title }: { className?: string; title?: string }) {
  const weave = [0, 1, 2, 3]
  return (
    <svg viewBox="0 0 240 220" className={className} role={title ? 'img' : 'presentation'} aria-hidden={title ? undefined : true} xmlns="http://www.w3.org/2000/svg">
      {title && <title>{title}</title>}
      {/* handle */}
      <path d="M62 112 C62 30, 178 30, 178 112" fill="none" stroke="#B5633C" strokeWidth="9" strokeLinecap="round" />
      <path d="M62 112 C62 30, 178 30, 178 112" fill="none" stroke="#E07A4F" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9" />
      {/* coins */}
      <g fontFamily="Georgia, serif" fontWeight="700" fontSize="26" textAnchor="middle">
        <g transform="rotate(-12 82 92)">
          <circle cx="82" cy="92" r="30" fill="#F7931A" />
          <circle cx="82" cy="92" r="24" fill="none" stroke="#14120F" strokeOpacity=".25" strokeWidth="2" />
          <text x="82" y="101" fill="#14120F">B</text>
        </g>
        <g transform="rotate(10 160 94)">
          <circle cx="160" cy="94" r="30" fill="#E6C35C" />
          <circle cx="160" cy="94" r="24" fill="none" stroke="#14120F" strokeOpacity=".25" strokeWidth="2" />
          <text x="160" y="103" fill="#14120F">G</text>
        </g>
        <circle cx="121" cy="76" r="32" fill="#D97757" />
        <circle cx="121" cy="76" r="26" fill="none" stroke="#14120F" strokeOpacity=".25" strokeWidth="2" />
        <text x="121" y="85" fill="#14120F">A</text>
      </g>
      {/* basket */}
      <path d="M34 112 H206 L188 194 Q186 204 176 204 H64 Q54 204 52 194 Z" fill="#C98A52" />
      <g stroke="#8F5A30" strokeWidth="3" strokeLinecap="round" fill="none">
        {weave.map(i => (
          <path key={i} d={`M${40 + i * 4} ${132 + i * 18} Q120 ${144 + i * 18} ${200 - i * 4} ${132 + i * 18}`} />
        ))}
        {[70, 95, 120, 145, 170].map(x => (
          <path key={x} d={`M${x} 118 L${120 + (x - 120) * 0.82} 200`} strokeOpacity=".55" />
        ))}
      </g>
      <rect x="28" y="104" width="184" height="16" rx="8" fill="#B5633C" />
      <rect x="28" y="104" width="184" height="6" rx="3" fill="#E07A4F" fillOpacity=".7" />
      {/* leaf */}
      <path d="M196 60 q22 -18 30 4 q-20 12 -30 -4z" fill="#9CCB6E" />
      <path d="M198 60 q14 -4 26 4" fill="none" stroke="#14120F" strokeOpacity=".25" strokeWidth="1.5" />
    </svg>
  )
}
