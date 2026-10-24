import Image from 'next/image'

/**
 * The PotBot mark (the B with a leaf) and wordmark. Cream on the dark theme, ink on the light
 * theme; the swap is pure CSS (.brand-dark / .brand-light in globals.css), so there is no flash.
 */
export function BrandMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image src="/brand/mark-cream.png" alt="" width={size} height={size} className="brand-dark h-full w-full object-contain" priority />
      <Image src="/brand/mark-ink.png" alt="" width={size} height={size} className="brand-light absolute inset-0 h-full w-full object-contain" priority />
    </span>
  )
}

export function BrandWordmark({ height = 26, className = '' }: { height?: number; className?: string }) {
  const width = Math.round(height * (960 / 242))
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width, height }}>
      <Image src="/brand/wordmark-cream.png" alt="PotBot" width={width} height={height} className="brand-dark h-full w-full object-contain" priority />
      <Image src="/brand/wordmark-ink.png" alt="PotBot" width={width} height={height} className="brand-light absolute inset-0 h-full w-full object-contain" priority />
    </span>
  )
}
