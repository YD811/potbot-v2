'use client'

import toast, { Toast } from 'react-hot-toast'

import { solscanTx, solanaExplorerTx } from '@/lib/explorer'


/** Show a loading toast while a promise resolves */
export function txLoading(message: string): string {
  return toast.loading(message, {
    style: toastStyle,
    iconTheme: { primary: '#8b5cf6', secondary: '#fff' },
  })
}

/** Show a success toast with optional explorer link */
export function txSuccess(message: string, signature?: string): void {
  toast.success(
    (t) => (
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{message}</span>
        {signature && (
          <div className="flex flex-col gap-0.5">
            <a
              href={solanaExplorerTx(signature, 'devnet')}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-pot-green hover:text-pot-green/80 underline"
              onClick={() => toast.dismiss(t.id)}
            >
              🔍 View on Solana Explorer ↗
            </a>
            <a
              href={solscanTx(signature, 'devnet')}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-purple-300 hover:text-purple-100 underline"
              onClick={() => toast.dismiss(t.id)}
            >
              View on Solscan ↗
            </a>
          </div>
        )}
      </div>
    ),
    {
      duration: 5000,
      style: toastStyle,
      iconTheme: { primary: '#00ff88', secondary: '#0a0a0f' },
    }
  )
}

/** Show an error toast */
export function txError(message: string, err?: unknown): void {
  const detail = err instanceof Error ? err.message : String(err ?? '')
  const short = detail.length > 80 ? detail.slice(0, 80) + '…' : detail
  toast.error(
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold">{message}</span>
      {short && <span className="text-xs text-red-300">{short}</span>}
    </div>,
    {
      duration: 6000,
      style: toastStyle,
    }
  )
}

/** Dismiss a toast by id */
export function txDismiss(id: string): void {
  toast.dismiss(id)
}

/**
 * Wraps an async transaction call with loading/success/error toasts.
 *
 * Usage:
 *   const sig = await withTxToast(
 *     () => deposit.mutateAsync(params),
 *     'Depositing SOL…',
 *     'Deposit confirmed!'
 *   )
 */
export async function withTxToast<T>(
  fn: () => Promise<T>,
  loadingMsg: string,
  successMsg: string,
  getSignature?: (result: T) => string | undefined
): Promise<T> {
  const id = txLoading(loadingMsg)
  try {
    const result = await fn()
    txDismiss(id)
    const sig = getSignature ? getSignature(result) : (typeof result === 'string' ? result : undefined)
    txSuccess(successMsg, sig)
    return result
  } catch (err) {
    txDismiss(id)
    txError('Transaction failed', err)
    throw err
  }
}

const toastStyle: React.CSSProperties = {
  background: '#1a1a2e',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '14px',
}
