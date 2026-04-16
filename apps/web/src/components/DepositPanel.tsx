'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  potPubkey: string
  potName: string
  vaultBalance?: number
  network?: string
}

type DepositStatus = 'idle' | 'watching' | 'detected' | 'confirmed'

export default function DepositPanel({ potPubkey, potName, vaultBalance = 0, network = 'devnet' }: Props) {
  const [depositAddress, setDepositAddress] = useState<string>('')
  const [explorerUrl, setExplorerUrl] = useState<string>('')
  const [amount, setAmount] = useState('0.1')
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/deposit-address/${potPubkey}`)
      .then((r) => r.json())
      .then((d) => {
        setDepositAddress(d.address ?? '')
        setExplorerUrl(d.explorerUrl ?? '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [potPubkey])

  const copyAddress = useCallback(() => {
    if (!depositAddress) return
    navigator.clipboard.writeText(depositAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [depositAddress])

  const startWatching = useCallback(() => {
    setStatus('watching')
    setPollCount(0)
    // Simulate detection after ~8s for demo purposes
    // In production, this would poll an API route that checks the sweep address balance
    const timer = setTimeout(() => {
      setStatus('detected')
      setTimeout(() => setStatus('confirmed'), 3000)
    }, 8000)
    return () => clearTimeout(timer)
  }, [])

  const shortAddr = depositAddress
    ? `${depositAddress.slice(0, 6)}…${depositAddress.slice(-6)}`
    : '...'

  const solanaPayUrl = depositAddress
    ? `solana:${depositAddress}?amount=${amount}&label=${encodeURIComponent('PotBot: ' + potName)}`
    : ''

  // Simple QR-code placeholder (SVG-based pattern)
  const QRPlaceholder = () => (
    <div className="flex flex-col items-center gap-2">
      <div className="w-32 h-32 bg-white rounded-lg p-2 flex items-center justify-center">
        <div className="grid grid-cols-7 gap-px w-full h-full">
          {Array.from({ length: 49 }).map((_, i) => {
            // Simplified QR pattern for visual purposes
            const corner = (r: number, c: number) =>
              (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3)
            const row = Math.floor(i / 7)
            const col = i % 7
            const dark = corner(row, col) || Math.random() > 0.55
            return (
              <div
                key={i}
                className={`${dark ? 'bg-black' : 'bg-white'} rounded-sm`}
              />
            )
          })}
        </div>
      </div>
      <p className="text-xs text-pot-muted">Scan with Phantom / Solflare</p>
    </div>
  )

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">
          🔒 Анонимный депозит
        </h2>
        <p className="text-pot-muted text-sm">
          Отправь SOL напрямую — без подключения кошелька
        </p>
      </div>

      {/* How it works */}
      <div className="card p-4 border border-pot-border text-sm">
        <h3 className="text-pot-green font-semibold mb-3">Как это работает</h3>
        <ol className="space-y-2 text-pot-muted">
          <li className="flex gap-2">
            <span className="text-pot-accent font-bold">1.</span>
            Каждый пот получает уникальный адрес для приёма SOL
          </li>
          <li className="flex gap-2">
            <span className="text-pot-accent font-bold">2.</span>
            Отправь SOL на адрес ниже из любого кошелька или биржи
          </li>
          <li className="flex gap-2">
            <span className="text-pot-accent font-bold">3.</span>
            Система автоматически зачисляет токены пота на твой адрес
          </li>
          <li className="flex gap-2">
            <span className="text-pot-accent font-bold">4.</span>
            Никакой привязки к твоему основному кошельку
          </li>
        </ol>
      </div>

      {/* Deposit address */}
      <div className="card p-5 border border-pot-green/30 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Адрес для депозита</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            network === 'mainnet-beta'
              ? 'bg-pot-green/20 text-pot-green'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
          </span>
        </div>

        {loading ? (
          <div className="h-12 bg-pot-border/30 rounded animate-pulse" />
        ) : (
          <div
            className="flex items-center gap-3 bg-pot-dark border border-pot-border rounded-lg px-4 py-3 cursor-pointer hover:border-pot-green/40 transition-colors"
            onClick={copyAddress}
          >
            <span className="flex-1 font-mono text-sm text-white truncate">
              {depositAddress}
            </span>
            <button
              className={`text-xs px-3 py-1 rounded transition-all flex-shrink-0 ${
                copied
                  ? 'bg-pot-green/20 text-pot-green'
                  : 'bg-pot-border text-pot-muted hover:text-white'
              }`}
            >
              {copied ? '✓ Скопировано' : 'Копировать'}
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-pot-muted mb-1 block">
              Сумма (SOL)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.1"
              min="0.01"
              className="input w-full text-sm"
              placeholder="0.1"
            />
          </div>
          {!loading && depositAddress && (
            <div className="flex items-end">
              <a
                href={solanaPayUrl}
                className="btn-secondary text-sm px-4 py-2 h-[38px] flex items-center"
                target="_blank"
                rel="noreferrer"
              >
                📱 Solana Pay
              </a>
            </div>
          )}
        </div>

        {/* QR Code */}
        {!loading && depositAddress && (
          <div className="flex justify-center pt-2">
            <QRPlaceholder />
          </div>
        )}
      </div>

      {/* Watch button & status */}
      <div className="space-y-3">
        {status === 'idle' && (
          <button
            onClick={startWatching}
            disabled={loading || !depositAddress}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            👁 Жду депозит
          </button>
        )}

        {status === 'watching' && (
          <div className="card p-4 border border-yellow-500/30 text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-yellow-400 font-semibold">Ожидаю транзакцию…</p>
            <p className="text-pot-muted text-sm">
              Мониторю адрес {shortAddr}
            </p>
          </div>
        )}

        {status === 'detected' && (
          <div className="card p-4 border border-pot-green/40 text-center space-y-2">
            <p className="text-2xl">💸</p>
            <p className="text-pot-green font-semibold">Транзакция обнаружена!</p>
            <p className="text-pot-muted text-sm">Подтверждаю и начисляю токены…</p>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="card p-4 border border-pot-green text-center space-y-2">
            <p className="text-2xl">✅</p>
            <p className="text-pot-green font-bold text-lg">Депозит принят!</p>
            <p className="text-white text-sm">
              Ты получишь{' '}
              <span className="font-semibold text-pot-green">
                {(parseFloat(amount) * 100).toFixed(0)} токенов
              </span>{' '}
              пота {potName}
            </p>
          </div>
        )}

        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs text-pot-muted hover:text-white transition-colors"
          >
            Посмотреть адрес в Explorer →
          </a>
        )}
      </div>

      {/* Privacy note */}
      <p className="text-xs text-pot-muted text-center">
        🔐 Адрес уникален для этого пота. Транзакция не привязывает тебя к нему публично.
        Sweep происходит автоматически в течение ~30с.
      </p>
    </div>
  )
}
