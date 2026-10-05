'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import { ROLE_LABELS } from '@/shared/lib/auth'
import { useQuery, useQueryText } from '@/shared/hooks/useUrlState'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import MissingRecord from '@/shared/components/MissingRecord'
import InviteForm from '@/features/users/components/InviteForm'
import EditUserDrawer from '@/features/users/components/EditUserDrawer'
import RoleCard from '@/features/users/components/RoleCard'
import { ROLE_ORDER, canManage } from '@/features/users/lib/access'

function initials(name) {
  return (name || '?')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(n => n[0].toUpperCase()).join('')
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Countries + clinics cells, shared by the people and invites tables. */
function AccessCells({ person, clinicName }) {
  if (person.role === 'super_admin') {
    return (
      <>
        <td><span className="ad-muted">All countries</span></td>
        <td><span className="ad-muted">All clinics</span></td>
      </>
    )
  }
  const countries = person.countries || []
  const clinics = person.clinics || []
  return (
    <>
      <td>
        {countries.length
          ? <span className="ad-users-codes">{countries.join(', ')}</span>
          : <span className="ad-muted">—</span>}
      </td>
      <td>
        {clinics.length
          ? <span className="ad-users-clinics">{clinics.map(clinicName).join(', ')}</span>
          : <span className="ad-muted">All clinics</span>}
      </td>
    </>
  )
}

export default function UsersView() {
  const {
    users, invites, user, allowed, loading, demoMode, refreshUsers, locations,
    deleteUser, revokeInvite,
  } = useAdmin()
  // Search (?q), the invite dialog (?invite=1) and the edit drawer (?edit=<id>) live in the URL.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const [invited, setInvited] = useState('')
  // Confirm dialogs stay local: { kind: 'user' | 'invite', record }.
  const [confirm, setConfirm] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const canManageUsers = allowed('manageUsers')
  const inviting = canManageUsers && get('invite') === '1'
  const editId = canManageUsers ? get('edit') : ''
  const editing = editId ? users.find(u => u.id === editId) : null

  const clinicName = id => locations.find(l => l.id === id)?.name || 'Unknown clinic'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => `${u.name} ${u.email} ${u.title}`.toLowerCase().includes(q))
  }, [users, query])

  if (!canManageUsers) {
    return (
      <div className="ad-view">
        <h1 className="ad-view-title">Users &amp; Roles</h1>
        <div className="ad-panel ad-muted">Only admins can manage staff accounts.</div>
      </div>
    )
  }

  // Not loaded yet, gone, or someone this user may not manage.
  if (editId && !(editing && canManage(user, editing))) {
    return (
      <MissingRecord
        loading={loading && users.length === 0}
        label="staff member"
        backHref={href({ edit: '' })}
        backLabel="← Back to Users & Roles"
      />
    )
  }

  async function runConfirm() {
    setConfirmBusy(true)
    setConfirmError('')
    try {
      if (confirm.kind === 'user') await deleteUser(confirm.record.id)
      else await revokeInvite(confirm.record.id)
      setConfirm(null)
    } catch (e) {
      setConfirmError(e.message)
    } finally {
      setConfirmBusy(false)
    }
  }

  const now = Date.now()

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
        <Link className="ad-btn ad-btn--primary" href={href({ invite: 1 })} scroll={false}>
          + Invite staff member
        </Link>
      </div>

      {invited && (
        <div className="ad-note">
          {demoMode ? (
            <><strong>Account added.</strong> {invited} is in the list below (preview mode skips the invite email).</>
          ) : (
            <>
              <strong>Invite sent.</strong> {invited} can accept it using the link they were sent.
              {' '}It shows under Pending invites until they do.
            </>
          )}
        </div>
      )}

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
              <th>Countries</th>
              <th>Clinics</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !users.length && (
              <tr><td colSpan={5} className="ad-empty">Loading people…</td></tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="ad-empty">
                  {query ? 'No one matches that search.' : 'No accounts yet.'}
                </td>
              </tr>
            )}

            {filtered.map(u => {
              const isSelf = u.id === user?.id
              const manageable = canManage(user, u)
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
                  <AccessCells person={u} clinicName={clinicName} />
                  <td className="ad-td-actions">
                    {manageable ? (
                      <div className="ad-users-actions">
                        <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: u.id })} scroll={false}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="ad-btn ad-btn--ghost ad-btn--sm ad-users-remove"
                          onClick={() => { setConfirmError(''); setConfirm({ kind: 'user', record: u }) }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="ad-muted">{isSelf ? 'Your account' : '—'}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {invites.length > 0 && (
        <div className="ad-panel ad-users-invites">
          <div className="ad-panel-head">
            <h2 className="ad-panel-title">Pending invites</h2>
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Countries</th>
                  <th>Clinics</th>
                  <th>Expires</th>
                  <th className="ad-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map(inv => {
                  const expired = inv.expiresAt && new Date(inv.expiresAt).getTime() < now
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span className="ad-user-cell-info">
                          <span className="ad-cell-name">{inv.name}</span>
                          <span className="ad-cell-slug">{inv.email}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`ad-role-pill ad-role-pill--${inv.role}`}>
                          {ROLE_LABELS[inv.role] || inv.role}
                        </span>
                      </td>
                      <AccessCells person={inv} clinicName={clinicName} />
                      <td>
                        {expired
                          ? <span className="ad-users-expired">Expired</span>
                          : formatDate(inv.expiresAt)}
                      </td>
                      <td className="ad-td-actions">
                        {canManage(user, inv) ? (
                          <button
                            type="button"
                            className="ad-btn ad-btn--ghost ad-btn--sm ad-users-remove"
                            onClick={() => { setConfirmError(''); setConfirm({ kind: 'invite', record: inv }) }}
                          >
                            Revoke
                          </button>
                        ) : <span className="ad-muted">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="ad-panel ad-roles-panel">
        <div className="ad-panel-head">
          <h2 className="ad-panel-title">What each role can do</h2>
        </div>
        <div className="ad-role-cards">
          {ROLE_ORDER.map(r => <RoleCard key={r} role={r} />)}
        </div>
        <p className="ad-role-foot">
          Permissions are enforced by the API, not just hidden in this interface — a
          staff member&apos;s delete is refused even outside the dashboard. Admins can only
          invite and manage staff in their own countries and clinics.
        </p>
      </div>

      {inviting && (
        <InviteForm
          onClose={() => set({ invite: '' })}
          onInvited={async email => {
            set({ invite: '' })
            setInvited(email)
            await refreshUsers()
          }}
        />
      )}

      {editing && (
        <EditUserDrawer key={editing.id} person={editing} onClose={() => set({ edit: '' })} />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'user' ? `Remove ${confirm.record.name}?` : `Revoke the invite for ${confirm.record.email}?`}
          confirmLabel={confirm.kind === 'user' ? 'Remove' : 'Revoke'}
          busy={confirmBusy}
          error={confirmError}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirm}
        >
          {confirm.kind === 'user'
            ? 'They will no longer be able to sign in to the dashboard.'
            : 'The invite link they were sent will stop working.'}
        </ConfirmDialog>
      )}
    </div>
  )
}
