'use client'

import { useState } from 'react'
import Link from 'next/link'

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

/** One field, one button. Posts to the same /api/waitlist route as before. */
export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setErrorMsg(null)

    const value = email.trim()
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setErrorMsg('That does not look like an email address. Check it and try again.')
      setStatus('error')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'signup' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'The request failed. Try again in a moment.')
        setStatus('error')
        return
      }
      setStatus(data.alreadyRegistered ? 'duplicate' : 'success')
    } catch {
      setErrorMsg('No connection. Check your network and try again.')
      setStatus('error')
    }
  }

  if (status === 'success' || status === 'duplicate') {
    return (
      <div className="rounded-3xl border border-pot-border bg-pot-card p-8 text-center">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">
          {status === 'success' ? 'You are on the list' : 'Already on the list'}
        </h2>
        <p className="mt-2 text-[15px] text-pot-muted">We write when mainnet opens. No spam.</p>
        <div className="mt-6">
          <Link href="/portfolios" className="btn-primary">Explore POTFolios</Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-pot-border bg-pot-card p-6 sm:p-8">
      <label htmlFor="waitlist-email" className="block text-sm font-semibold text-white">
        Email
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="waitlist-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input w-full flex-1"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' ? 'Joining' : 'Join the waitlist'}
        </button>
      </div>
      {errorMsg && (
        <p className="mt-3 rounded-2xl border border-pot-accent/40 bg-pot-accent/10 px-4 py-2 text-sm text-white">{errorMsg}</p>
      )}
      <p className="mt-4 text-sm text-pot-muted">We write when mainnet opens. No spam.</p>
    </form>
  )
}
