'use client'

// Deposit/redeem surface for pots with a live index layer (iPOT).
// Renders nothing when the pot has no StrategyConfig — the classic SOL
// deposit flow stays untouched for those.

import { useMemo, useState } from 'react'
import {
  useIndexVault,
  useDepositBase,
  useRedeemIndex,
  previewShares,
  previewPayout,
} from '@/hooks/useIndexVault'
import { findRegistryToken } from '@/lib/token-registry'

const E6 = 1_000_000n

function fmtBase(v: bigint | null | undefined, symbol = 'USDC'): string {
  if (v === null || v === undefined) return '—'
  const whole = v / E6
  const frac = ((v % E6) * 100n) / E6
  return `${whole.toLocaleString()}.${frac.toString().padStart(2, '0')} ${symbol}`
}

export default function IndexVaultPanel({ potAddress }: { potAddress: string }) {
  const { data: vault, isLoading } = useIndexVault(potAddress)
  const depositMut = useDepositBase()
  const redeemMut = useRedeemIndex()

  const [tab, setTab] = useState<'deposit' | 'redeem'>('deposit')
  const [amount, setAmount] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const baseSymbol = vault ? findRegistryToken(vault.baseMint)?.symbol ?? 'USDC' : 'USDC'
  const amountUnits = useMemo(() => {
    const n = Number.parseFloat(amount)
    return Number.isFinite(n) && n > 0 ? BigInt(Math.round(n * 1e6)) : 0n
  }, [amount])

  if (isLoading || !vault) return null

  const mintPreview = previewShares(vault, amountUnits)
  const payoutPreview = previewPayout(vault, amountUnits)
  const busy = depositMut.isPending || redeemMut.isPending

  const submit = async () => {
    setNotice(null)
    try {
      if (tab === 'deposit') {
        // 1% slippage floor on minted shares vs the snapshot preview
        await depositMut.mutateAsync({
          potAddress,
          baseMint: vault.baseMint,
          amountBase: amountUnits,
          minSharesOut: (mintPreview * 99n) / 100n,
        })
        setNotice(`Deposited ${fmtBase(amountUnits, baseSymbol)} → ~${fmtBase(mintPreview, 'iPOT')}`)
      } else {
        const res = await redeemMut.mutateAsync({
          potAddress,
          baseMint: vault.baseMint,
          indexAmount: amountUnits,
          minOutBase: (payoutPreview * 99n) / 100n,
        })
        setNotice(
          res.queued
            ? 'Redemption queued — the keeper settles it as liquidity frees up (usually < 1h).'
            : `Redeemed instantly: ${fmtBase(payoutPreview, baseSymbol)}`,
        )
      }
      setAmount('')
    } catch (e: any) {
      setNotice(String(e?.message ?? e).slice(0, 200))
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Index vault</h3>
        {vault.paused && (
          <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
            deposits paused · exits open
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-pot-muted">Price / share</div>
          <div className="font-mono text-pot-green">
            {vault.pricePerShareE6 !== null ? `$${(Number(vault.pricePerShareE6) / 1e6).toFixed(4)}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-pot-muted">NAV</div>
          <div className="font-mono text-white">{fmtBase(vault.navBase, baseSymbol)}</div>
        </div>
        <div>
          <div className="text-pot-muted">Instant liquidity</div>
          <div className="font-mono text-white">{fmtBase(vault.idleBase, baseSymbol)}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className={tab === 'deposit' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          onClick={() => setTab('deposit')}
        >
          Deposit {baseSymbol}
        </button>
        <button
          className={tab === 'redeem' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          onClick={() => setTab('redeem')}
        >
          Redeem iPOT
        </button>
      </div>

      <div className="space-y-2">
        <input
          className="input w-full"
          inputMode="decimal"
          placeholder={tab === 'deposit' ? `Amount in ${baseSymbol}` : 'Amount in iPOT'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {amountUnits > 0n && (
          <p className="text-xs text-pot-muted">
            {tab === 'deposit'
              ? `You receive ≈ ${fmtBase(mintPreview, 'iPOT')}`
              : payoutPreview <= vault.idleBase
                ? `Instant payout ≈ ${fmtBase(payoutPreview, baseSymbol)}`
                : `≈ ${fmtBase(payoutPreview, baseSymbol)} — exceeds the idle buffer, will be queued`}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy || amountUnits === 0n || (tab === 'deposit' && vault.paused)} onClick={() => void submit()}>
          {busy ? 'Confirming…' : tab === 'deposit' ? 'Drop in & mint' : 'Burn & withdraw'}
        </button>
        {notice && <p className="text-xs text-pot-muted">{notice}</p>}
      </div>

      {vault.pendingRedeems > 0 && (
        <p className="text-xs text-pot-muted">
          {vault.pendingRedeems} redemption{vault.pendingRedeems > 1 ? 's' : ''} in the queue
        </p>
      )}
    </div>
  )
}
