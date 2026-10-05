'use client'
import { useAdmin } from '@/shared/context/AdminContext'
import { sortCountries } from '@/shared/lib/content'

/**
 * Countries (required, at least one) and clinics (optional) a vertical or
 * treatment is offered in — the website only shows it to visitors in one of
 * these countries. `countries` holds country codes, `clinics` clinic ids;
 * only clinics in a selected country are offered, and unticking a country
 * drops its clinics too (the backend rejects a clinic outside the countries).
 *
 * Only countries the user can access are offered. A link to a country they
 * can't access (another team's market) is kept in the value and shown ticked
 * but read-only — never dropped on save.
 */
export default function MarketScopeFields({ countries, clinics, onChange }) {
  const { countryRecords, accessibleCountries, locations } = useAdmin()
  const accessible = new Set(accessibleCountries.map(c => c.code))
  const locked = countries.filter(code => !accessible.has(code))
  const shown = sortCountries([
    ...accessibleCountries,
    ...locked.map(code => countryRecords.find(c => c.code === code) || { code, name: code }),
  ])
  const clinicOptions = locations.filter(l => countries.includes(l.country))

  function toggleCountry(code) {
    if (!accessible.has(code)) return
    const next = countries.includes(code) ? countries.filter(c => c !== code) : [...countries, code]
    const keep = new Set(locations.filter(l => next.includes(l.country)).map(l => l.id))
    onChange({ countries: next, clinics: clinics.filter(id => keep.has(id)) })
  }
  function toggleClinic(id) {
    onChange({
      countries,
      clinics: clinics.includes(id) ? clinics.filter(c => c !== id) : [...clinics, id],
    })
  }

  return (
    <fieldset className="ad-fieldset">
      <legend>Availability</legend>
      <div className="ad-field">
        <span className="ad-field-label">Countries *</span>
        <div className="ad-check-grid">
          {shown.map(c => {
            const isLocked = !accessible.has(c.code)
            return (
              <label key={c.code} className={`ad-check${countries.includes(c.code) ? ' active' : ''}`}
                title={isLocked ? 'Managed by another country team' : undefined}>
                <input type="checkbox" checked={countries.includes(c.code)} disabled={isLocked}
                  onChange={() => toggleCountry(c.code)} />
                {c.name}
              </label>
            )
          })}
        </div>
        {locked.length > 0 && (
          <span className="ad-field-hint">
            {locked.join(', ')} {locked.length === 1 ? 'is' : 'are'} managed by another country team and can&apos;t be changed here.
          </span>
        )}
      </div>
      <div className="ad-field">
        <span className="ad-field-label">Clinics (optional)</span>
        {clinicOptions.length === 0 ? (
          <p className="ad-muted">
            {countries.length ? 'No clinics in the selected countries yet.' : 'Pick a country to choose clinics.'}
          </p>
        ) : (
          <div className="ad-check-grid">
            {clinicOptions.map(l => {
              // Another team's clinic: keep its tick as it is.
              const isLocked = !accessible.has(l.country)
              return (
                <label key={l.id} className={`ad-check${clinics.includes(l.id) ? ' active' : ''}`}
                  title={isLocked ? 'Managed by another country team' : undefined}>
                  <input type="checkbox" checked={clinics.includes(l.id)} disabled={isLocked}
                    onChange={() => toggleClinic(l.id)} />
                  {l.name}
                </label>
              )
            })}
          </div>
        )}
      </div>
    </fieldset>
  )
}
