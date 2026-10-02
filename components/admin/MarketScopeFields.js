'use client'
import { useAdmin } from './AdminContext'
import { sortCountries } from '@/lib/admin/content'

/**
 * Countries (required, at least one) and clinics (optional) a vertical or
 * treatment is offered in — the website only shows it to visitors in one of
 * these countries. `countries` holds country codes, `clinics` clinic ids;
 * only clinics in a selected country are offered, and unticking a country
 * drops its clinics too (the backend rejects a clinic outside the countries).
 */
export default function MarketScopeFields({ countries, clinics, onChange }) {
  const { countryRecords, locations } = useAdmin()
  const clinicOptions = locations.filter(l => countries.includes(l.country))

  function toggleCountry(code) {
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
          {sortCountries(countryRecords).map(c => (
            <label key={c.code} className={`ad-check${countries.includes(c.code) ? ' active' : ''}`}>
              <input type="checkbox" checked={countries.includes(c.code)}
                onChange={() => toggleCountry(c.code)} />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div className="ad-field">
        <span className="ad-field-label">Clinics (optional)</span>
        {clinicOptions.length === 0 ? (
          <p className="ad-muted">
            {countries.length ? 'No clinics in the selected countries yet.' : 'Pick a country to choose clinics.'}
          </p>
        ) : (
          <div className="ad-check-grid">
            {clinicOptions.map(l => (
              <label key={l.id} className={`ad-check${clinics.includes(l.id) ? ' active' : ''}`}>
                <input type="checkbox" checked={clinics.includes(l.id)}
                  onChange={() => toggleClinic(l.id)} />
                {l.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  )
}
