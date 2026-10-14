import type { Config } from 'tailwindcss'

// PotBot design system v3 (Oct 2026). Dark is the default palette; the
// light ("Normie") theme is applied through the overrides in globals.css.
// One accent (terracotta). Leaf green is reserved for growth, positive
// change, live status and the plant. No neon, no glow.
const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pot-dark': '#14120F',
        'pot-card': '#1E1B16',
        'pot-border': '#2E2A23',
        'pot-green': '#9CCB6E',   // leaf: growth, positive change, live
        'pot-accent': '#E07A4F',  // terracotta: the only accent
        'pot-amber': '#E9C46A',   // second chart series
        'pot-muted': '#C9C0B0',
        'pot-ink': '#F2ECE0',
        bg: '#14120F',
        surface: '#1E1B16',
        border: '#2E2A23',
        purple: '#E07A4F',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Instrument Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'Menlo', 'monospace'],
      },
      transitionTimingFunction: {
        pot: 'cubic-bezier(.2,.8,.2,1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'breathe 6s ease-in-out infinite',
        breathe: 'breathe 6s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.015)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
