import { solanaExplorerTx, solanaExplorerAccount } from '@/lib/explorer'

type Cluster = 'mainnet' | 'devnet'

type Variant = 'compact' | 'inline' | 'pill'

interface BaseProps {
  cluster?: Cluster
  variant?: Variant
  label?: string
  className?: string
}

interface TxProps extends BaseProps {
  txSig: string
  address?: never
}

interface AddressProps extends BaseProps {
  address: string
  txSig?: never
}

type Props = TxProps | AddressProps

const baseStyles =
  'text-pot-green hover:underline font-mono inline-flex items-center gap-1'

const styleByVariant: Record<Variant, string> = {
  compact: 'text-xs',
  inline: 'text-sm',
  pill: 'text-xs px-2 py-1 rounded-full bg-pot-green/10 hover:bg-pot-green/20 no-underline hover:no-underline',
}

function shortSig(s: string) {
  if (s.length <= 12) return s
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

/**
 * Canonical "View on Explorer" link used after every tx the user signs.
 * Defaults to devnet (PotBot v2 deploys to devnet today).
 */
export function ExplorerLink(props: Props) {
  const cluster: Cluster = props.cluster ?? 'devnet'
  const variant: Variant = props.variant ?? 'inline'

  const isTx = 'txSig' in props && !!props.txSig
  const target = isTx ? props.txSig! : (props as AddressProps).address
  const href = isTx ? solanaExplorerTx(target, cluster) : solanaExplorerAccount(target, cluster)
  const fallbackLabel = isTx ? `tx ${shortSig(target)}` : shortSig(target)
  const label = props.label ?? `View on Explorer · ${fallbackLabel}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyles} ${styleByVariant[variant]} ${props.className ?? ''}`.trim()}
      title={target}
    >
      <span aria-hidden>🔍</span>
      <span>{label}</span>
      <span aria-hidden>↗</span>
    </a>
  )
}

export default ExplorerLink
