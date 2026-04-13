import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'purple' | 'green' | 'red' | 'none'
  hover?: boolean
}

const GLOWS = {
  none:   '',
  purple: 'hover:shadow-[0_0_30px_rgba(153,69,255,0.25)]',
  green:  'hover:shadow-[0_0_30px_rgba(20,241,149,0.25)]',
  red:    'hover:shadow-[0_0_30px_rgba(255,69,69,0.25)]',
}

export function Card({ children, className, glow = 'none', hover = false }: CardProps) {
  return (
    <div className={clsx(
      'bg-[#0D1117] border border-[#1A2332] rounded-2xl',
      hover && 'transition-all duration-200 cursor-pointer hover:border-[#9945FF]/50',
      GLOWS[glow],
      className
    )}>
      {children}
    </div>
  )
}
