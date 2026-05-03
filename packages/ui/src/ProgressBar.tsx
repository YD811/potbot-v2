interface ProgressBarProps {
  value: number
  color?: 'purple' | 'green' | 'red' | 'yellow'
  label?: string
  className?: string
}

const COLORS = {
  purple: 'bg-[#9945FF]',
  green: 'bg-[#14F195]',
  red: 'bg-[#FF4545]',
  yellow: 'bg-yellow-400',
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function ProgressBar({ value, color = 'purple', label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cx('w-full', className)}>
      {label && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{label}</span>
          <span>{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 bg-[#1A2332] rounded-full overflow-hidden">
        <div
          className={cx('h-full rounded-full transition-all duration-500', COLORS[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
