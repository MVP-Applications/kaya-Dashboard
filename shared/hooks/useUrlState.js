'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Query-string state. Anything a refresh or a shared link should bring back —
 * the open record, the active tab, filters, the page number — is kept in the
 * URL rather than in useState.
 *
 * Writes go through window.history, which Next keeps in sync with
 * useSearchParams without a server round-trip:
 *   - replace (default) for filters, typing and closing a record, so Back
 *     isn't flooded;
 *   - opening a record is a <Link href={href(...)}> (a push), so Back closes
 *     it and right-click → "Open in new tab" works. Use { push: true } only
 *     when a record has to be opened from code.
 *
 * Empty values ('' / null / false) remove the key, keeping URLs short.
 */
export function useQuery() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const get = useCallback((key, fallback = '') => searchParams.get(key) ?? fallback, [searchParams])

  const set = useCallback((patch, { push = false } = {}) => {
    // Read the live URL, not the render's snapshot, so two writes in the same
    // tick don't overwrite each other.
    const next = merge(new URLSearchParams(window.location.search), patch)
    const qs = next.toString()
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`
    window.history[push ? 'pushState' : 'replaceState'](null, '', url)
  }, [])

  /** A link to this same screen with `patch` applied — for <Link href>. */
  const href = useCallback(patch => {
    const qs = merge(new URLSearchParams(searchParams.toString()), patch).toString()
    return `${pathname}${qs ? `?${qs}` : ''}`
  }, [pathname, searchParams])

  return { get, set, href }
}

/** One query param as [value, setValue]. Setting replaces; pass `resets` to clear e.g. 'page'. */
export function useQueryParam(key, fallback = '', { resets = [] } = {}) {
  const { get, set } = useQuery()
  const value = get(key, fallback)
  const setValue = useCallback(v => {
    const patch = { [key]: v === fallback ? '' : v }
    resets.forEach(r => { patch[r] = '' })
    set(patch)
  }, [key, fallback, set, resets.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  return [value, setValue]
}

/** Page number param; 1 is the default and is left out of the URL. */
export function usePageParam(key = 'page') {
  const [raw, setRaw] = useQueryParam(key)
  const page = Math.max(1, parseInt(raw, 10) || 1)
  const setPage = useCallback(p => {
    const n = typeof p === 'function' ? p(page) : p
    setRaw(n > 1 ? String(n) : '')
  }, [page, setRaw])
  return [page, setPage]
}

/**
 * A text box backed by a query param. The input stays responsive (local
 * state); the URL catches up after `delay` ms. Returns
 * [text, setText, committed] — `committed` is the debounced URL value, handy
 * for server-side searches.
 */
export function useQueryText(key, { delay = 300, resets = [] } = {}) {
  const { get, set } = useQuery()
  const urlValue = get(key)
  const [text, setText] = useState(urlValue)
  const written = useRef(urlValue)

  // The URL changed from outside (Back, "Clear filters") — follow it.
  useEffect(() => {
    if (urlValue !== written.current) {
      written.current = urlValue
      setText(urlValue)
    }
  }, [urlValue])

  useEffect(() => {
    const value = text.trim()
    if (value === written.current) return
    const t = setTimeout(() => {
      written.current = value
      const patch = { [key]: value }
      resets.forEach(r => { patch[r] = '' })
      set(patch)
    }, delay)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  return [text, setText, urlValue]
}

function merge(params, patch) {
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === '' || v == null || v === false) params.delete(k)
    else params.set(k, String(v))
  }
  return params
}
