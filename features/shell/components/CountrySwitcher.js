'use client'
import { useEffect } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import { useQuery } from '@/shared/hooks/useUrlState'
import { countOverrides } from '@/shared/lib/country-content'

/**
 * Chooses which country the editor is working on.
 *
 * Options are only the countries this user can access (every country for a
 * super admin). Treatments, verticals, doctors and the other lists follow it;
 * page copy records an override for that country only.
 *
 * The choice lives in the URL (`?country=UAE`) so a refresh or a shared link
 * lands on the same country. Moving to another section drops query params,
 * so the switcher writes the current country back onto the new URL.
 */
export default function CountrySwitcher() {
  const { activeCountry, setActiveCountry, allOverrides, accessibleCountries } = useAdmin()
  const { get, set } = useQuery()
  const urlCountry = get('country').toUpperCase()
  const onlyOne = accessibleCountries.length === 1 ? accessibleCountries[0].code : ''

  // URL → context (fresh load, Back/Forward), and context → URL when a
  // section change dropped the param.
  useEffect(() => {
    if (onlyOne) {
      if (activeCountry !== onlyOne) setActiveCountry(onlyOne)
      return
    }
    if (urlCountry && urlCountry !== activeCountry) setActiveCountry(urlCountry)
    else if (!urlCountry && activeCountry) set({ country: activeCountry })
  }, [urlCountry, activeCountry, onlyOne, setActiveCountry, set])

  if (!accessibleCountries.length) return null

  if (onlyOne) {
    return (
      <span className="ad-country">
        <span className="ad-country-label">Editing</span>
        <strong className="ad-country-fixed">{onlyOne}</strong>
      </span>
    )
  }

  function choose(code) {
    // Context first, so the sync above doesn't mistake "All countries" for a
    // dropped param and put the old country back.
    setActiveCountry(code)
    set({ country: code })
  }

  return (
    <label className="ad-country">
      <span className="ad-country-label">Editing</span>
      <select
        className="ad-country-select"
        value={activeCountry}
        onChange={e => choose(e.target.value)}
      >
        <option value="">All my countries</option>
        {accessibleCountries.map(c => {
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
