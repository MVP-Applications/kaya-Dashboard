'use client'
import { useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import AccessFields from '@/features/users/components/AccessFields'
import { accessError, accessPayload } from '@/features/users/lib/access'

/** Edit a staff member's role / countries / clinics (?edit=<id>). */
export default function EditUserDrawer({ person, onClose }) {
  const { user, saveUser } = useAdmin()
  const [access, setAccess] = useState({
    role: person.role,
    countries: person.countries || [],
    clinics: person.clinics || [],
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const problem = accessError(access, user)
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    try {
      await saveUser(person.id, accessPayload(access))
      onClose()
    } catch (e2) {
      setError(e2.message)
      setBusy(false)
    }
  }

  return (
    <div className="ad-drawer-scrim" onClick={busy ? undefined : onClose}>
      <form className="ad-drawer ad-drawer--sm" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="ad-drawer-head">
          <div>
            <div className="ad-drawer-title">{person.name}</div>
            <div className="ad-cell-slug">{person.email}</div>
          </div>
          <button type="button" className="ad-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ad-drawer-body">
          {error && <div className="ad-form-error">{error}</div>}
          <AccessFields value={access} onChange={setAccess} />
        </div>
        <div className="ad-drawer-foot">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
