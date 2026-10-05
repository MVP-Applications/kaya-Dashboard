import { ROLE_LABELS, PERMISSIONS } from '@/shared/lib/auth'

const PERMISSION_ROWS = [
  ['Create & edit content', p => p.create && p.edit],
  ['Delete content', p => p.delete],
  ['Manage staff', p => p.manageUsers],
  ['Manage admins', p => p.manageAdmins],
  ['Global settings', p => p.manageSettings],
  ['Customer accounts', p => p.viewCustomers],
]

const SCOPE = {
  super_admin: 'Every country and clinic',
  admin: 'Their assigned countries / clinics',
  staff: 'Their assigned countries / clinics',
}

/** What each role can do, shown so the choice isn't guesswork. */
export default function RoleCard({ role }) {
  const p = PERMISSIONS[role]
  return (
    <div className="ad-role-card">
      <span className={`ad-role-pill ad-role-pill--${role}`}>{ROLE_LABELS[role]}</span>
      <p className="ad-users-scope">{SCOPE[role]}</p>
      <ul className="ad-role-perms">
        {PERMISSION_ROWS.map(([label, test]) => {
          const on = Boolean(test(p))
          return (
            <li key={label} className={on ? 'is-on' : 'is-off'}>
              <span className="ad-role-perm-ico" aria-hidden="true">{on ? '✓' : '✕'}</span>
              {label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
