'use client'
import { useAdmin } from '@/shared/context/AdminContext'
import { countOverrides } from '@/shared/lib/country-content'

/**
 * Chooses which market the editor is working on.
 *
 * "All countries" edits the shared copy every market inherits. Picking a
 * country switches to editing that market's differences only — so a change to
 * something shared is still made once, in one place, rather than three times.
 *
 * The count next to a country is how many fields it currently overrides, which
 * answers the question an editor actually has: does this market differ, and by
 * how much?
 */
export default function CountrySwitcher() {
  const { activeCountry, setActiveCountry, allOverrides, countryRecords } = useAdmin()

  return (
    <label className="ad-country">
      <span className="ad-country-label">Editing</span>
      <select
        className="ad-country-select"
        value={activeCountry}
        onChange={e => setActiveCountry(e.target.value)}
      >
        <option value="">All countries</option>
        {countryRecords.map(c => {
          const n = countOverrides(allOverrides?.[c.code])
          return (
            <option key={c.code} value={c.code}>
              {c.code}{n ? ` (${n} changed)` : ''}
            </option>
          )
        })}
      </select>
    </label>
  )
}
