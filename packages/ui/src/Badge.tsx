import { clsx } from 'clsx'

type BadgeColor = 'purple' | 'green' | 'red' | 'gray' | 'yellow' | 'blue'

interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  className?: string
}

const COLORS: Record<BadgeColor, string> = {
  purple: 'bg-[#9945FF]/20 text-[#9945FF]',
  green:  'bg-[#14F195]/10 text-[#14F195]',
  red:    'bg-[#FF4545]/10 text-[#FF4545]',
  gray:   'bg-gray-500/20 text-gray-400',
  yellow: 'bg-yellow-400/10 text-yellow-400',
  blue:   'bg-blue-400/10 text-blue-400',
}

export function Badge({ children, color = 'purple', className }: BadgeProps) {
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-mono', COLORS[color], className)}>
      {children}
    </span>
  )
}
