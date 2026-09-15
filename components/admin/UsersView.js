'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import { ROLE_LABELS, PERMISSIONS } from '@/lib/admin/auth'
import { inviteStaffUser } from '@/lib/admin/store'

const ROLES = ['admin', 'editor']

function InviteForm({ onClose, onInvited }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required.')
    if (!email.trim()) return setError('Email is required.')
    setSending(true)
    try {
      await inviteStaffUser({ name: name.trim(), email: email.trim(), role })
      onInvited(email.trim())
    } catch (e2) {
      setError(e2.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ad-drawer-scrim" onClick={onClose}>
      <form className="ad-confirm" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3 className="ad-confirm-title">Invite a staff member</h3>
        {error && <div className="ad-form-error">{error}</div>}
        <label className="ad-field">
          <span className="ad-field-label">Name</span>
          <input className="ad-input" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="ad-field">
          <span className="ad-field-label">Email</span>
          <input className="ad-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="ad-field">
          <span className="ad-field-label">Role</span>
          <select className="ad-input" value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </label>
        <div className="ad-confirm-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  )
}

function initials(name) {
  return (name || '?')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(n => n[0].toUpperCase()).join('')
}

/** What each role can do, shown so the choice isn't guesswork. */
function RoleCard({ role }) {
  const p = PERMISSIONS[role]
  const rows = [
    ['Create records', p.create],
    ['Edit records', p.edit],
    ['Delete records', p.delete],
    ['Manage users', p.manageUsers],
  ]
  return (
    <div className="ad-role-card">
      <span className={`ad-role-pill ad-role-pill--${role}`}>{ROLE_LABELS[role]}</span>
      <ul className="ad-role-perms">
        {rows.map(([label, on]) => (
          <li key={label} className={on ? 'is-on' : 'is-off'}>
            <span className="ad-role-perm-ico" aria-hidden="true">{on ? '✓' : '✕'}</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function UsersView() {
  const { users, setUserRole, user, allowed, loading, demoMode, refreshUsers } = useAdmin()
  const [query, setQuery] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState('')

  const canManage = allowed('manageUsers')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => `${u.name} ${u.email} ${u.title}`.toLowerCase().includes(q))
  }, [users, query])

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Users &amp; Roles</h1>
          <p className="ad-view-sub">
            {users.length} {users.length === 1 ? 'account' : 'accounts'}
            {query && ` · showing ${filtered.length}`}
          </p>
        </div>
        {canManage && (
          <button className="ad-btn ad-btn--primary" onClick={() => setInviting(true)}>
            + Invite staff member
          </button>
        )}
      </div>

      {invited && (
        <div className="ad-note">
          <strong>Invite sent.</strong> {invited} can accept it using the link they were sent.
          {' '}They won&apos;t appear in the list below until they do.
        </div>
      )}

      {/* Roles can only be set in preview mode — the real API has no
          endpoint yet to change one after a staff account exists (KA-39),
          so against it, roles display read-only. */}
      <div className="ad-note">
        {demoMode ? (
          <>
            <strong>Preview mode.</strong> These are sample accounts.
          </>
        ) : (
          <>
            <strong>Roles are read-only here for now.</strong> The API can create and
            invite staff, but not yet change an existing account&apos;s role — see KA-39.
          </>
        )}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search people…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th className="ad-th-actions">Change role</th>
            </tr>
          </thead>
          <tbody>
            {loading && !users.length && (
              <tr><td colSpan={3} className="ad-empty">Loading people…</td></tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="ad-empty">
                  {query
                    ? 'No one matches that search.'
                    : "No accounts yet — this screen isn't connected to the backend yet."}
                </td>
              </tr>
            )}

            {filtered.map(u => {
              const isSelf = u.id === user?.id
              return (
                <tr key={u.id}>
                  <td>
                    <div className="ad-user-cell">
                      <span className="ad-avatar ad-avatar--sm">{initials(u.name)}</span>
                      <span className="ad-user-cell-info">
                        <span className="ad-cell-name">
                          {u.name}
                          {isSelf && <span className="ad-self-tag">you</span>}
                        </span>
                        <span className="ad-cell-slug">{u.email || u.title}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`ad-role-pill ad-role-pill--${u.role}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="ad-td-actions">
                    {/* Changing your own role is blocked so the last admin
                        can't lock themselves out of the dashboard. Only
                        possible in preview mode — see the note above. */}
                    {demoMode && canManage && !isSelf ? (
                      <select
                        className="ad-input ad-input--sm"
                        value={u.role}
                        onChange={e => setUserRole(u.id, e.target.value)}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="ad-muted">
                        {isSelf ? 'Your own role' : demoMode ? 'Admins only' : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="ad-panel ad-roles-panel">
        <div className="ad-panel-head">
          <h2 className="ad-panel-title">What each role can do</h2>
        </div>
        <div className="ad-role-cards">
          {ROLES.map(r => <RoleCard key={r} role={r} />)}
        </div>
        <p className="ad-role-foot">
          Permissions are enforced by the database, not just hidden in this
          interface — an editor&apos;s delete is refused even outside the dashboard.
        </p>
      </div>

      {inviting && (
        <InviteForm
          onClose={() => setInviting(false)}
          onInvited={async email => {
            setInviting(false)
            setInvited(email)
            await refreshUsers()
          }}
        />
      )}
    </div>
  )
}
