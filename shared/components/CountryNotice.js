'use client'
import { useAdmin } from '@/shared/context/AdminContext'
import { useQuery } from '@/shared/hooks/useUrlState'

/**
 * Says which copy is being edited: the shared version, or one market's
 * differences.
 *
 * Without this the two modes look identical, and an editor who forgot the
 * switcher would either change every market by accident or wonder why their
 * edit never reached the others. Worth a permanent line rather than a subtlety.
 */
export default function CountryNotice() {
  const { activeCountry, setActiveCountry, countryRecords } = useAdmin()
  const { set } = useQuery()
  const activeCountryName = countryRecords.find(c => c.code === activeCountry)?.name || activeCountry

  if (!activeCountry) {
    return (
      <div className="ad-note ad-note--shared">
        <strong>Editing shared copy.</strong> Changes apply to every country
        unless that country has its own version.
      </div>
    )
  }

  return (
    <div className="ad-note ad-note--country">
      <span>
        <strong>Editing {activeCountryName} only.</strong>{' '}
        A section you change here gets its own {activeCountryName} copy in that
        language; sections you leave alone keep following the shared copy.
      </span>
      <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => { setActiveCountry(''); set({ country: '' }) }}>
        Edit shared instead
      </button>
    </div>
  )
}
