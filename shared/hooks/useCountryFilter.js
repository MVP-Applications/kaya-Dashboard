'use client'
import { useCallback } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import { useQueryParam } from '@/shared/hooks/useUrlState'

/**
 * The `?country=` list filter. It is the same URL param the top-bar
 * CountrySwitcher mirrors, so a list's country filter and the global
 * "Editing" country stay in step: picking one in a list moves the switcher
 * too, and an empty param falls back to the switcher's country.
 *
 * Returns [code, setCode, options]: `code` is the effective filter
 * ('' = all of the user's countries), `options` the countries the user can
 * access — the only ones a filter should offer.
 */
export function useCountryFilter({ resets = [] } = {}) {
  const { activeCountry, setActiveCountry, accessibleCountries } = useAdmin()
  const [urlCountry, setUrlCountry] = useQueryParam('country', '', { resets })
  const code = String(urlCountry || activeCountry || '').toUpperCase()

  const setCode = useCallback(next => {
    // Context first (like CountrySwitcher), so its URL sync doesn't mistake
    // "All countries" for a dropped param and put the old country back.
    setActiveCountry(next)
    setUrlCountry(next)
  }, [setActiveCountry, setUrlCountry])

  return [code, setCode, accessibleCountries]
}
