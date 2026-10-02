/**
 * Every dashboard section is a real route, so a refresh, a bookmark or
 * "Open in new tab" lands on the same screen. Overview lives at the root;
 * every other section is `/<id>/` (trailing slash matches next.config).
 *
 * `app/[view]/page.js` pre-renders one page per id below, so adding a section
 * means adding it here AND to the switch in components/admin/AdminView.js.
 */
export const VIEW_IDS = [
  'overview',
  'requests',
  'voucher-requests',
  'customers',
  'services',
  'verticals',
  'categories',
  'tell-us',
  'doctors',
  'indulgence',
  'reviews',
  'pages',
  'locations',
  'countries',
  'contacts',
  'site',
  'users',
]

/** Path for a section, with optional query params (empty values are dropped). */
export function viewHref(view, params) {
  const path = view === 'overview' ? '/' : `/${view}/`
  return path + queryString(params)
}

/** The section a pathname belongs to — unknown paths fall back to overview. */
export function viewFromPath(pathname) {
  const id = (pathname || '/').split('/').filter(Boolean)[0] || 'overview'
  return VIEW_IDS.includes(id) ? id : 'overview'
}

export function queryString(params) {
  if (!params) return ''
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v != null && v !== false) q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}
