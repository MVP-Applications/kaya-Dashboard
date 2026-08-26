/**
 * API-backed data layer.
 *
 * Services/Verticals (Treatments/Pillars) are connected to kaya-nest-api —
 * see KA-24. Everything else is still foundation-only: kaya-nest-api's
 * domain model doesn't map one-to-one onto the rest of this dashboard's
 * collections yet, so wiring each one up is separate, deliberate work still
 * to come. Until a given function below is connected, it throws a clear,
 * readable error rather than silently returning fake data — AdminContext.js
 * already turns that into the visible error banner (or an empty list, for
 * the couple of reads it treats that way already).
 */
import { apiRequest } from '@/lib/api/client'
import { ApiEndpoints } from '@/lib/api/endpoints'

function notConnected(what) {
  throw new Error(`${what} isn't connected to the new backend yet.`)
}

// ── Treatments (Services) / Pillars (Verticals) ──────────────────────────
//
// The backend's admin routes key on its own generated `id`, never on
// `slug` — so each side keeps a slug -> id cache, filled by fetchAll() and
// kept current as records are created. There's no bulk "save this whole
// list" endpoint (unlike the old Supabase upsert-by-list), so persisting a
// list here means diffing it into individual create/update calls, plus one
// reorder call for treatments (the only one of the two with a displayOrder
// column and a reorder endpoint at all — see KA-30 for verticals' gaps).

const treatmentIds = new Map() // slug -> backend id
const pillarIds = new Map() // slug -> backend id

/** Page through a paginated admin list endpoint until every item is read. */
async function fetchAllPages(listPath) {
  const items = []
  let page = 1
  for (;;) {
    const { data } = await apiRequest(`${listPath}?page=${page}&pageSize=100`)
    items.push(...data.items)
    if (!data.items.length || items.length >= data.total) break
    page += 1
  }
  return items
}

/** Prefer English; fall back to whatever locale exists, then to nothing. */
function translationOf(translations) {
  return (translations || []).find(t => t.locale === 'EN') || translations?.[0] || {}
}

function pillarToVertical(pillar) {
  pillarIds.set(pillar.slug, pillar.id)
  const { name } = translationOf(pillar.translations)
  return {
    id: pillar.slug, // other screens (DoctorForm, ReviewForm, ...) key off v.id
    slug: pillar.slug,
    label: name || pillar.slug,
    hint: '',
    color: '',
  }
}

function treatmentToService(treatment) {
  treatmentIds.set(treatment.slug, treatment.id)
  const t = translationOf(treatment.translations)
  return {
    slug: treatment.slug,
    name: t.title || treatment.slug,
    verticals: (treatment.pillars || []).map(p => p.slug),
    badge: treatment.badge || '',
    what: t.summary || '',
    mechanism: t.howItWorks || '',
    durationMins: treatment.durationMins ?? '',
    sessions: treatment.sessions ?? '',
    downtimeNotes: treatment.downtimeNotes || '',
    benefits: t.benefits || [],
  }
}

async function fetchVerticals() {
  const pillars = await fetchAllPages(ApiEndpoints.pillars.adminList)
  pillarIds.clear()
  return pillars.map(pillarToVertical)
}

async function fetchServices() {
  const treatments = await fetchAllPages(ApiEndpoints.treatments.adminList)
  treatmentIds.clear()
  return treatments.map(treatmentToService)
}

function toNumberOrUndefined(value) {
  if (value === '' || value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export const persistVerticals = async list => {
  for (const v of list) {
    const slug = v.slug || v.id
    const body = { slug, translations: [{ locale: 'EN', name: v.label }] }
    const existingId = pillarIds.get(slug)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.pillars.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.pillars.adminList, { method: 'POST', body })
    pillarIds.set(data.slug, data.id)
  }
}

export const removeVertical = async slug => {
  const id = pillarIds.get(slug)
  if (!id) throw new Error(`Could not delete "${slug}" — it wasn't found.`)
  await apiRequest(ApiEndpoints.pillars.adminById(id), { method: 'DELETE' })
  pillarIds.delete(slug)
}

export const persistServices = async list => {
  for (const s of list) {
    const body = {
      slug: s.slug,
      pillarIds: (s.verticals || []).map(vSlug => pillarIds.get(vSlug)).filter(Boolean),
      badge: s.badge || undefined,
      durationMins: toNumberOrUndefined(s.durationMins),
      sessions: toNumberOrUndefined(s.sessions),
      downtimeNotes: s.downtimeNotes || undefined,
      isPublished: true,
      translations: [{
        locale: 'EN',
        title: s.name,
        summary: s.what || '',
        howItWorks: s.mechanism || '',
        benefits: (s.benefits || []).filter(Boolean),
      }],
    }
    const existingId = treatmentIds.get(s.slug)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.treatments.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.treatments.adminList, { method: 'POST', body })
    treatmentIds.set(data.slug, data.id)
  }

  // Display order is only ever set through this dedicated endpoint — write
  // the whole list's order every time, mirroring how `sort` used to be
  // rewritten from array position on every save.
  const orders = list
    .map((s, displayOrder) => ({ id: treatmentIds.get(s.slug), displayOrder }))
    .filter(o => o.id)
  if (orders.length) {
    await apiRequest(ApiEndpoints.treatments.adminReorder, { method: 'PATCH', body: { orders } })
  }
}

export const removeService = async slug => {
  const id = treatmentIds.get(slug)
  if (!id) throw new Error(`Could not delete "${slug}" — it wasn't found.`)
  await apiRequest(ApiEndpoints.treatments.adminById(id), { method: 'DELETE' })
  treatmentIds.delete(slug)
}

// ── Everything else — not connected yet ───────────────────────────────────

export async function fetchAll() {
  const [verticals, services] = await Promise.all([fetchVerticals(), fetchServices()])
  return {
    services, verticals,
    doctors: [], reviews: [], vouchers: [], locations: [], requests: [],
    pages: {}, site: {},
  }
}

export async function refetchRequests() {
  return notConnected('The enquiry inbox')
}

export const persistDoctors = () => notConnected('Doctors')
export const persistReviews = () => notConnected('Reviews')
export const persistVouchers = () => notConnected('Vouchers')
export const persistLocations = () => notConnected('Locations')

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
