/**
 * API-backed data layer — the foundation, not the integrations.
 *
 * kaya-nest-api's domain model doesn't map one-to-one onto this dashboard's
 * collections yet (e.g. "Vouchers" here isn't the same thing as the
 * backend's voucher-requests module), so wiring each one up is separate,
 * deliberate work still to come. Until a given function below is connected,
 * it throws a clear, readable error rather than silently returning fake
 * data — AdminContext.js already turns that into the visible error banner
 * (or an empty list, for the couple of reads it treats that way already).
 *
 * Only auth (lib/admin/auth.js) is connected to the real backend today.
 */
function notConnected(what) {
  throw new Error(`${what} isn't connected to the new backend yet.`)
}

export async function fetchAll() {
  return notConnected('Dashboard content')
}

export async function refetchRequests() {
  return notConnected('The enquiry inbox')
}

export const persistServices = () => notConnected('Services')
export const persistVerticals = () => notConnected('Verticals')
export const persistDoctors = () => notConnected('Doctors')
export const persistReviews = () => notConnected('Reviews')
export const persistVouchers = () => notConnected('Vouchers')
export const persistLocations = () => notConnected('Locations')

export const removeService = () => notConnected('Services')
export const removeVertical = () => notConnected('Verticals')
export const removeDoctor = () => notConnected('Doctors')
export const removeReview = () => notConnected('Reviews')
export const removeVoucher = () => notConnected('Vouchers')
export const removeLocation = () => notConnected('Locations')

export const persistPageSection = () => notConnected('Page content')
export const persistSiteSection = () => notConnected('Site content')

export const persistRequestPatch = () => notConnected('The enquiry inbox')
export const removeRequest = () => notConnected('The enquiry inbox')

export async function fetchOverrides() {
  return notConnected('Country overrides')
}
export const persistOverrideSection = () => notConnected('Country overrides')

export async function fetchUsers() {
  return notConnected('Users & roles')
}
export const updateUserRole = () => notConnected('Users & roles')

/**
 * Unused inside this repo (nothing here calls it — it exists for the
 * separate public-website project), and its contract is to never throw, so
 * it reports failure the same way rather than crashing a caller.
 */
export async function submitRequest() {
  return { ok: false, error: "Enquiry submission isn't connected to a backend yet." }
}

/**
 * There is no realtime channel on the backend at all yet (confirmed: no
 * websocket/SSE anywhere in kaya-nest-api). Called unguarded from a
 * useEffect in AdminContext.js, so this must not throw — a no-op
 * subscription is the correct "nothing to hook up yet" state.
 */
export function subscribeToRequests() {
  return () => {}
}

/**
 * No backend endpoint exists for triggering a site rebuild, and one
 * shouldn't be invented. Mirrors the exact "not configured" message the app
 * already showed before the Supabase Edge Function was deployed.
 */
export async function triggerPublish() {
  return { ok: false, error: "Publishing isn't connected to a backend yet." }
}
