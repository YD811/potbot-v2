'use client'

import { useState } from 'react'
import Link from 'next/link'

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

interface FormState {
  email: string
  twitter: string
  telegram: string
  solana_wallet: string
}

const EMPTY: FormState = { email: '', twitter: '', telegram: '', solana_wallet: '' }

export default function SignupForm() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setErrorMsg(null)

    const email = form.email.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.')
      setStatus('error')
      return
    }

    const payload = {
      email,
      twitter: form.twitter.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      solana_wallet: form.solana_wallet.trim() || undefined,
      source: 'signup',
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong.')
        setStatus('error')
        return
      }
      setStatus(data.alreadyRegistered ? 'duplicate' : 'success')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-pot-green mb-2">You're on the list!</h2>
        <p className="text-pot-muted mb-6">
          Thanks for signing up. We'll email you as soon as PotBot mainnet is live — plus
          early-access perks for founding members.
        </p>
        <Link href="/" className="btn-secondary inline-block">
          ← Back to home
        </Link>
      </div>
    )
  }

  if (status === 'duplicate') {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-black text-white mb-2">Welcome back!</h2>
        <p className="text-pot-muted mb-6">
          You're already on the waitlist. We've saved any additional details you provided.
        </p>
        <Link href="/" className="btn-secondary inline-block">
          ← Back to home
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email — required */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Email <span className="text-pot-green">*</span>
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="your@email.com"
          className="input w-full py-3 px-4"
          disabled={status === 'loading'}
        />
      </div>

      {/* Twitter */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Twitter / X handle <span className="text-pot-muted font-normal">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pot-muted">@</span>
          <input
            type="text"
            value={form.twitter}
            onChange={(e) => update('twitter', e.target.value.replace(/^@+/, ''))}
            placeholder="potbot_sol"
            className="input w-full py-3 pl-8 pr-4"
            disabled={status === 'loading'}
          />
        </div>
      </div>

      {/* Telegram */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Telegram username <span className="text-pot-muted font-normal">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pot-muted">@</span>
          <input
            type="text"
            value={form.telegram}
            onChange={(e) => update('telegram', e.target.value.replace(/^@+/, ''))}
            placeholder="potbot_user"
            className="input w-full py-3 pl-8 pr-4"
            disabled={status === 'loading'}
          />
        </div>
      </div>

      {/* Solana wallet */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Solana wallet address <span className="text-pot-muted font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.solana_wallet}
          onChange={(e) => update('solana_wallet', e.target.value)}
          placeholder="e.g. 7Np41oeYqPef…D4nLa"
          className="input w-full py-3 px-4 font-mono text-sm"
          disabled={status === 'loading'}
        />
        <p className="text-xs text-pot-muted mt-1.5">
          Providing a wallet makes you eligible for the founding-member NFT drop.
        </p>
      </div>

      {errorMsg && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !form.email.trim()}
        className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Joining…
          </span>
        ) : (
          '🚀 Get Early Access'
        )}
      </button>

      <p className="text-xs text-pot-muted/70 text-center">
        We'll only email you about PotBot. No spam, unsubscribe anytime.
      </p>
    </form>
  )
}
