'use client'

import { useState } from 'react'

/** Sends the admin secret to the server once; the server answers with an httpOnly cookie. */
export function AdminLoginForm() {
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      if (!r.ok) throw new Error(r.status === 429 ? 'Too many attempts. Wait a minute.' : 'Wrong secret.')
      window.location.assign('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form onSubmit={submit} className="card flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="font-display text-2xl font-semibold text-white">Admin sign in</h1>
        <label htmlFor="admin-secret" className="text-sm text-pot-muted">Admin secret</label>
        <input
          id="admin-secret"
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          className="input"
          autoFocus
        />
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy || secret.length === 0}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
