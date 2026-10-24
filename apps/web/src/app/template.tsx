/**
 * Remounts on every navigation (unlike layout.tsx), so the new page gets the
 * enter animation each time: fade in and rise 12 px, 500 ms, the site easing.
 * Reduced motion turns it off in globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="v3-page">{children}</div>
}
