import { clsx } from 'clsx'

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={clsx(
      'animate-spin rounded-full border-2 border-[#1A2332] border-t-[#9945FF]',
      sizes[size],
      className
    )} />
  )
}
