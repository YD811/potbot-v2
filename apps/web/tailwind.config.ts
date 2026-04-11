import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pot-dark': '#0a0e17',
        'pot-card': '#111827',
        'pot-border': '#1f2937',
        'pot-green': '#00ff88',
        'pot-accent': '#8b5cf6',
        'pot-muted': '#6b7280',
        bg: '#0a0e17',
        surface: '#111827',
        border: '#1f2937',
        purple: '#8b5cf6',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
