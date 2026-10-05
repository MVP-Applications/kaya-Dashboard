'use client'
import { useAdmin } from '@/shared/context/AdminContext'
import { ROLE_LABELS } from '@/shared/lib/auth'
import { sortCountries } from '@/shared/lib/content'
import { assignableRoles, clinicsFor } from '@/features/users/lib/access'

/**
 * Role + countries + clinics for an invite or an existing account, limited
 * to what the signed-in user may hand out. `value` is { role, countries,
 * clinics } (country codes / clinic ids); unticking a country drops its
 * clinics, since the API rejects a clinic outside the chosen countries.
 */
export default function AccessFields({ value, onChange }) {
  const { user, accessibleCountries, locations } = useAdmin()
  const { role, countries, clinics } = value
  const roles = assignableRoles(user)
  const superAdmin = role === 'super_admin'
  const offered = clinicsFor(user, locations)
  const clinicOptions = offered.filter(l => countries.includes(l.country))
  // A clinic-limited admin can't grant "every clinic" (that would reach past their own).
  const clinicsRequired = !superAdmin && (user?.clinics || []).length > 0

  function toggleCountry(code) {
    const next = countries.includes(code) ? countries.filter(c => c !== code) : [...countries, code]
    const keep = new Set(locations.filter(l => next.includes(l.country)).map(l => l.id))
    onChange({ ...value, countries: next, clinics: clinics.filter(id => keep.has(id)) })
  }
  function toggleClinic(id) {
    onChange({ ...value, clinics: clinics.includes(id) ? clinics.filter(c => c !== id) : [...clinics, id] })
  }

  return (
    <>
      <label className="ad-field">
        <span className="ad-field-label">Role</span>
        <select className="ad-input" value={role} onChange={e => onChange({ ...value, role: e.target.value })}>
          {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </label>

      {superAdmin ? (
        <p className="ad-muted ad-users-hint">Super admins can access every country and clinic.</p>
      ) : (
        <>
          <div className="ad-field">
            <span className="ad-field-label">Countries *</span>
            {accessibleCountries.length === 0 ? (
              <p className="ad-muted">No countries available.</p>
            ) : (
              <div className="ad-check-grid">
                {sortCountries(accessibleCountries).map(c => (
                  <label key={c.code} className={`ad-check${countries.includes(c.code) ? ' active' : ''}`}>
                    <input type="checkbox" checked={countries.includes(c.code)} onChange={() => toggleCountry(c.code)} />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="ad-field">
            <span className="ad-field-label">Clinics {clinicsRequired ? '*' : '(optional)'}</span>
            <p className="ad-fieldset-hint ad-users-hint">
              {clinicsRequired
                ? 'Pick the clinics they can work on.'
                : 'No clinics = every clinic in the selected countries.'}
            </p>
            {clinicOptions.length === 0 ? (
              <p className="ad-muted">
                {countries.length ? 'No clinics in the selected countries yet.' : 'Pick a country to choose clinics.'}
              </p>
            ) : (
              <div className="ad-check-grid">
                {clinicOptions.map(l => (
                  <label key={l.id} className={`ad-check${clinics.includes(l.id) ? ' active' : ''}`}>
                    <input type="checkbox" checked={clinics.includes(l.id)} onChange={() => toggleClinic(l.id)} />
                    {l.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
