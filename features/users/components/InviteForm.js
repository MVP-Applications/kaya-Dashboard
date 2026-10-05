'use client'
import { useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import { inviteStaffUser } from '@/shared/lib/store'
import AccessFields from '@/features/users/components/AccessFields'
import { assignableRoles, accessError, accessPayload } from '@/features/users/lib/access'

/** Invite dialog (?invite=1). The draft stays local; the URL only says it's open. */
export default function InviteForm({ onClose, onInvited }) {
  const { user, accessibleCountries } = useAdmin()
  const roles = assignableRoles(user)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [access, setAccess] = useState(() => ({
    role: roles.includes('staff') ? 'staff' : roles[0] || '',
    // One country to pick from? Pre-tick it.
    countries: accessibleCountries.length === 1 ? [accessibleCountries[0].code] : [],
    clinics: [],
  }))
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required.')
    if (!email.trim()) return setError('Email is required.')
    const problem = accessError(access, user)
    if (problem) return setError(problem)
    setSending(true)
    setError('')
    try {
      await inviteStaffUser({ name: name.trim(), email: email.trim(), ...accessPayload(access) })
      onInvited(email.trim())
    } catch (e2) {
      setError(e2.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ad-drawer-scrim" onClick={sending ? undefined : onClose}>
      <form className="ad-drawer ad-drawer--sm" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="ad-drawer-head">
          <div className="ad-drawer-title">Invite a staff member</div>
          <button type="button" className="ad-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ad-drawer-body">
          {error && <div className="ad-form-error">{error}</div>}
          <label className="ad-field">
            <span className="ad-field-label">Name</span>
            <input className="ad-input" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">Email</span>
            <input className="ad-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <AccessFields value={access} onChange={setAccess} />
        </div>
        <div className="ad-drawer-foot">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  )
}
