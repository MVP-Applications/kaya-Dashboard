'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { demoUsers } from '@/lib/admin/store'

export default function LoginScreen() {
  const { login, demoMode } = useAdmin()
  const accounts = demoMode ? demoUsers() : []
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await login(email, password)
      if (!res.ok) setError(res.error)
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad-login">
      <div className="ad-login-card">
        <div className="ad-login-brand">
          <img src="/Assets/kaya-logo-vector.svg" alt="Kaya" className="ad-login-logo" />
          <span className="ad-login-badge">CMS</span>
        </div>
        <h1 className="ad-login-title">Content Dashboard</h1>
        <p className="ad-login-sub">Sign in to manage treatments &amp; services.</p>

        <form className="ad-login-form" onSubmit={submit}>
          <label className="ad-field">
            <span className="ad-field-label">Email</span>
            <input
              type="email"
              className="ad-input"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@kaya.ae"
              autoComplete="username"
              required
            />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">Password</span>
            <input
              type="password"
              className="ad-input"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="ad-login-error">{error}</div>}

          <button
            type="submit"
            className="ad-btn ad-btn--primary ad-login-submit"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Preview mode has no real accounts to protect, so offer the sample
            ones directly rather than making someone guess a password. */}
        {demoMode ? (
          <div className="ad-login-demo">
            <span className="ad-login-demo-hd">Preview accounts</span>
            {accounts.map(u => (
              <button
                key={u.id}
                type="button"
                className="ad-login-demo-row"
                onClick={() => login(u.email, '')}
              >
                <span className="ad-avatar ad-avatar--sm">{u.name.charAt(0)}</span>
                <span className="ad-login-demo-info">
                  <span className="ad-login-demo-name">{u.name}</span>
                  <span className="ad-login-demo-role">{u.title} · {u.email}</span>
                </span>
                <span className={`ad-role-pill ad-role-pill--${u.role}`}>{u.role}</span>
              </button>
            ))}
            <p className="ad-login-hint">
              Pick an account to explore the dashboard. Sign in as the editor to
              see how permissions restrict deleting.
            </p>
          </div>
        ) : (
          <p className="ad-login-hint">
            Accounts are managed by an administrator. Ask one to invite you.
          </p>
        )}
      </div>
    </div>
  )
}
