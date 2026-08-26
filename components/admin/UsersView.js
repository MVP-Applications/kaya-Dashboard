'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import { ROLE_LABELS, PERMISSIONS } from '@/lib/admin/auth'

const ROLES = ['admin', 'editor']

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
  const { users, setUserRole, user, allowed, loading, demoMode } = useAdmin()
  const [query, setQuery] = useState('')

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
      </div>

      {/* Accounts are managed by the backend, which the browser can't do
          directly — so point there rather than showing a dead button. */}
      <div className="ad-note">
        {demoMode ? (
          <>
            <strong>Preview mode.</strong> These are sample accounts. Once connected
            to the backend, real staff are added there and their roles are
            managed here.
          </>
        ) : (
          <>
            <strong>Adding people.</strong> Staff accounts are managed on the backend.
            They appear here once this screen is connected to it, and you&apos;ll be
            able to set their role below.
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
                        can't lock themselves out of the dashboard. */}
                    {canManage && !isSelf ? (
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
                        {isSelf ? 'Your own role' : 'Admins only'}
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
    </div>
  )
}
