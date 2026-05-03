import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[#9945FF] hover:bg-[#7B35D9] text-white',
  secondary: 'border border-[#1A2332] hover:border-[#9945FF] text-white',
  danger:    'bg-[#FF4545]/20 hover:bg-[#FF4545]/40 text-[#FF4545] border border-[#FF4545]/30',
  ghost:     'text-gray-400 hover:text-white',
}
const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {loading ? <span className="animate-spin">⏳</span> : children}
    </button>
  )
}
