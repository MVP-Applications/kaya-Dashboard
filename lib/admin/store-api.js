/**
 * API-backed data layer.
 *
 * Services/Verticals (Treatments/Pillars, KA-24), Doctors (KA-25),
 * Locations/Clinics (KA-26), Indulgence/Vouchers (KA-27) and Reviews/
 * Pages/Footer/Global (KA-28) are connected to kaya-nest-api. Everything
 * else is still foundation-only:
 * kaya-nest-api's domain model doesn't map one-to-one onto the rest of this dashboard's
 * collections yet, so wiring each one up is separate, deliberate work still
 * to come. Until a given function below is connected, it throws a clear,
 * readable error rather than silently returning fake data — AdminContext.js
 * already turns that into the visible error banner (or an empty list, for
 * the couple of reads it treats that way already).
 */
import { apiRequest } from '@/lib/api/client'
import { ApiEndpoints } from '@/lib/api/endpoints'
import { API_BASE_URL } from '@/lib/api/config'
import { getAccessToken } from '@/lib/api/token'
import { normaliseCountry } from '@/lib/countries'
import { ApiError } from '@/lib/api/errors'

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

/**
 * Page through a paginated admin list endpoint until every item is read.
 *
 * The backend's response-envelope interceptor hoists a paginated result —
 * it never sends `{ items, total, page, pageSize }` as `data`. `data` is the
 * items array itself; `total`/`page`/`pageSize` move to `meta.pagination`.
 */
async function fetchAllPages(listPath) {
  const items = []
  let page = 1
  for (;;) {
    const { data, meta } = await apiRequest(`${listPath}?page=${page}&pageSize=100`)
    items.push(...data)
    if (!data.length || items.length >= (meta?.pagination?.total ?? 0)) break
    page += 1
  }
  return items
}

/** Prefer English; fall back to whatever locale exists, then to nothing. */
function translationOf(translations) {
  return (translations || []).find(t => t.locale === 'EN') || translations?.[0] || {}
}

/**
 * Record a slug -> id mapping, first dropping any other slug already
 * pointing at this same id. Needed after a rename: the old slug's entry
 * would otherwise linger and could later be mistaken for a real, separate
 * record if something new ever reused that slug.
 */
function rememberId(cache, slug, id) {
  for (const [k, v] of cache) {
    if (v === id && k !== slug) cache.delete(k)
  }
  cache.set(slug, id)
}

function pillarToVertical(pillar) {
  pillarIds.set(pillar.slug, pillar.id)
  const en = translationOf(pillar.translations)
  const ar = (pillar.translations || []).find(t => t.locale === 'AR')
  return {
    id: pillar.slug, // other screens (DoctorForm, ReviewForm, ...) key off v.id
    backendId: pillar.id, // real backend id — lets a slug rename PUT in place instead of creating a duplicate
    slug: pillar.slug,
    label: en.name || pillar.slug,
    labelAr: ar?.name || '',
    hint: en.hintText || '',
    hintAr: ar?.hintText || '',
    color: pillar.color || '',
    heroImage: pillar.heroImageUrl || '',
    heroEyebrow: en.heroEyebrow || '',
    heroHeadline: en.heroHeadline || '',
    heroHeadlineEm: en.heroHeadlineEm || '',
    heroSub: en.heroSub || '',
    heroTrustPoints: en.heroTrustPoints || [],
    heroStats: en.heroStats || [],
    heroEyebrowAr: ar?.heroEyebrow || '',
    heroHeadlineAr: ar?.heroHeadline || '',
    heroHeadlineEmAr: ar?.heroHeadlineEm || '',
    heroSubAr: ar?.heroSub || '',
    heroTrustPointsAr: ar?.heroTrustPoints || [],
    heroStatsAr: ar?.heroStats || [],
  }
}

// Backend shape ({icon, title, description}, KA-30) <-> ServiceForm's
// shorthand ({i, t, d}) for the same three fields.
function benefitsToForm(list) {
  return (list || []).map(b => ({ i: b.icon || '', t: b.title || '', d: b.description || '' }))
}

function treatmentToService(treatment) {
  treatmentIds.set(treatment.slug, treatment.id)
  const t = translationOf(treatment.translations)
  const ar = (treatment.translations || []).find(x => x.locale === 'AR')
  return {
    id: treatment.id, // real backend id — lets a slug rename PUT in place instead of delete+recreate
    slug: treatment.slug,
    name: t.title || treatment.slug,
    image: treatment.imageUrl || '',
    thumb: treatment.icon || '',
    category: treatment.categoryId || '',
    verticals: (treatment.pillars || []).map(p => p.slug),
    badge: treatment.badge || '',
    isPopular: treatment.isPopular ?? false,
    sub: t.subtitle || '',
    what: t.summary || '',
    mechanism: t.howItWorks || '',
    durationMins: t.duration ?? '',
    sessions: t.sessions ?? '',
    downtimeNotes: t.downtimeNotes || '',
    downtimeLevel: t.downtimeSeverity || '',
    suitable: t.suitableFor || [],
    benefits: benefitsToForm(t.benefits),
    nameAr: ar?.title || '',
    subAr: ar?.subtitle || '',
    whatAr: ar?.summary || '',
    mechanismAr: ar?.howItWorks || '',
    suitableAr: ar?.suitableFor || [],
    benefitsAr: benefitsToForm(ar?.benefits),
    durationMinsAr: ar?.duration || '',
    sessionsAr: ar?.sessions || '',
    downtimeNotesAr: ar?.downtimeNotes || '',
    downtimeLevelAr: ar?.downtimeSeverity || '',
  }
}

async function fetchVerticals() {
  const pillars = await fetchAllPages(ApiEndpoints.pillars.adminList)
  pillarIds.clear()
  return pillars.map(pillarToVertical)
}

// ── Categories ─────────────────────────────────────────────────────────
//
// Unlike Verticals, Category has its own real `displayOrder` + reorder
// endpoint (like Treatments/Doctors) — CategoriesView's list is reorderable.
// ServiceForm's Category select reads this same `categories` collection
// from AdminContext directly, the same way it already reads `verticals`;
// there's no separate options-fetcher for it.

const categoryIds = new Map() // slug -> backend id

function categoryToRecord(category) {
  categoryIds.set(category.slug, category.id)
  const t = translationOf(category.translations)
  const ar = (category.translations || []).find(x => x.locale === 'AR')
  return {
    id: category.id, // real backend id — lets a slug rename PUT in place instead of delete+recreate
    slug: category.slug,
    name: t.name || category.slug,
    description: t.description || '',
    nameAr: ar?.name || '',
    descriptionAr: ar?.description || '',
  }
}

async function fetchCategories() {
  const categories = await fetchAllPages(ApiEndpoints.categories.adminList)
  categoryIds.clear()
  return categories.map(categoryToRecord)
}

export const persistCategories = async list => {
  for (const c of list) {
    const translations = [{ locale: 'EN', name: c.name, description: c.description || '' }]
    if (c.nameAr) translations.push({ locale: 'AR', name: c.nameAr, description: c.descriptionAr || '' })
    const body = { slug: c.slug, translations }
    // `c.id` (the record's real backend id, carried since it was fetched)
    // takes priority over a slug lookup — same rename-in-place rule as
    // Treatments/Doctors/Vouchers.
    const existingId = c.id || categoryIds.get(c.slug)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.categories.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.categories.adminList, { method: 'POST', body })
    rememberId(categoryIds, data.slug, data.id)
  }

  const orders = list
    .map((c, displayOrder) => ({ id: categoryIds.get(c.slug), displayOrder }))
    .filter(o => o.id)
  if (orders.length) {
    await apiRequest(ApiEndpoints.categories.adminReorder, { method: 'PATCH', body: { orders } })
  }
}

/**
 * Renumber `displayOrder` only, via the dedicated reorder endpoint — unlike
 * persistCategories, this never round-trips every record's full body, so it
 * can't fail on an unrelated field's validation. Used after a delete, where
 * all that's needed is closing the gap left in the order.
 */
export const reorderCategories = async list => {
  const orders = list
    .map((c, displayOrder) => ({ id: categoryIds.get(c.slug), displayOrder }))
    .filter(o => o.id)
  if (orders.length) {
    await apiRequest(ApiEndpoints.categories.adminReorder, { method: 'PATCH', body: { orders } })
  }
}

export const removeCategory = async slug => {
  const id = categoryIds.get(slug)
  if (!id) throw new Error(`Could not delete "${slug}" — it wasn't found.`)
  await apiRequest(ApiEndpoints.categories.adminById(id), { method: 'DELETE' })
  categoryIds.delete(slug)
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
    const heroImageUrl = await uploadImageIfNeeded(v.heroImage)
    const translations = [{
      locale: 'EN',
      name: v.label,
      hintText: v.hint || '',
      heroEyebrow: v.heroEyebrow || '',
      heroHeadline: v.heroHeadline || '',
      heroHeadlineEm: v.heroHeadlineEm || '',
      heroSub: v.heroSub || '',
      heroTrustPoints: v.heroTrustPoints || [],
      heroStats: v.heroStats || [],
    }]
    if (v.labelAr) {
      translations.push({
        locale: 'AR',
        name: v.labelAr,
        hintText: v.hintAr || '',
        heroEyebrow: v.heroEyebrowAr || '',
        heroHeadline: v.heroHeadlineAr || '',
        heroHeadlineEm: v.heroHeadlineEmAr || '',
        heroSub: v.heroSubAr || '',
        heroTrustPoints: v.heroTrustPointsAr || [],
        heroStats: v.heroStatsAr || [],
      })
    }
    const body = { slug, translations, color: v.color || '', heroImageUrl }
    // v.backendId (the real id, carried since fetch) takes priority over a
    // slug lookup — pillarIds is keyed by the *old* slug, so a rename would
    // otherwise miss it and POST a duplicate instead of PUT-ing in place.
    const existingId = v.backendId || pillarIds.get(slug)
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
    const imageUrl = await uploadImageIfNeeded(s.image)

    // ServiceForm's shorthand ({i, t, d}) -> the backend's shape
    // ({icon, title, description}, KA-30). `title` is the one field the
    // backend requires per benefit, so that's what a blank row is judged on.
    const benefitObjects = list => (list || [])
      .map(b => ({ icon: b.i || undefined, title: b.t, description: b.d || undefined }))
      .filter(b => b.title)

    // AR only included when title/summary/howItWorks are all filled — the
    // backend requires a complete translation. Unlike Doctors (KA-40),
    // Treatment updates upsert per locale rather than replacing the whole
    // array, so omitting AR here can never delete an existing one — but the
    // form still loads existing AR values in, so a resave without touching
    // them resends the same content rather than an empty one.
    const translations = [{
      locale: 'EN',
      title: s.name,
      subtitle: s.sub || '',
      summary: s.what || '',
      howItWorks: s.mechanism || '',
      benefits: benefitObjects(s.benefits),
      suitableFor: s.suitable || [],
      duration: s.durationMins || undefined,
      sessions: s.sessions || undefined,
      downtimeNotes: s.downtimeNotes || undefined,
      downtimeSeverity: s.downtimeLevel || undefined,
    }]
    if (s.nameAr && s.whatAr && s.mechanismAr) {
      translations.push({
        locale: 'AR',
        title: s.nameAr,
        subtitle: s.subAr || '',
        summary: s.whatAr,
        howItWorks: s.mechanismAr,
        benefits: benefitObjects(s.benefitsAr),
        suitableFor: s.suitableAr || [],
        duration: s.durationMinsAr || undefined,
        sessions: s.sessionsAr || undefined,
        downtimeNotes: s.downtimeNotesAr || undefined,
        downtimeSeverity: s.downtimeLevelAr || undefined,
      })
    }
    const body = {
      slug: s.slug,
      pillarIds: (s.verticals || []).map(vSlug => pillarIds.get(vSlug)).filter(Boolean),
      // `null`, not omitted — the backend only clears an existing category
      // when it sees `categoryId: null` explicitly; leaving the key out of
      // the request is read as "don't touch it", so picking "— none —"
      // would silently fail to remove a previously-set category otherwise.
      categoryId: s.category || null,
      // `null`, not `''` — the backend's `badge` is now a real enum
      // (TreatmentBadge), which rejects an empty string; `null` explicitly
      // clears a previously-set badge, same as `categoryId` above.
      badge: s.badge || null,
      isPopular: s.isPopular,
      imageUrl,
      icon: s.thumb,
      isPublished: true,
      translations,
    }
    // `s.id` (the record's real backend id, carried since it was fetched)
    // takes priority over a slug lookup — that's what lets a slug edit PUT
    // in place as a rename instead of needing a delete-then-recreate dance.
    const existingId = s.id || treatmentIds.get(s.slug)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.treatments.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.treatments.adminList, { method: 'POST', body })
    rememberId(treatmentIds, data.slug, data.id)
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

/**
 * Renumber `displayOrder` only, via the dedicated reorder endpoint — unlike
 * persistServices, this never round-trips every record's full body (which
 * revalidates fields like `sessions` on records nobody touched), so it can't
 * fail on an unrelated field's validation. Used after a delete, where all
 * that's needed is closing the gap left in the order.
 */
export const reorderServices = async list => {
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

// ── Doctors ────────────────────────────────────────────────────────────
//
// Clinics have no dashboard screen of their own yet (KA-26), but the
// backend's Clinic CRUD (KA-12) already exists — DoctorForm's Clinics field
// reads the real list via fetchClinicOptions() below instead of the free
// text it used to accept, which could never resolve to an actual clinic.
// `tagline` and AR-locale editing have no backend equivalent yet — see
// KA-33, filed alongside this integration.

const doctorIds = new Map() // slug -> backend id
let countryIdByCode = null // uppercase code -> backend id; fetched once, lazily

async function ensureCountryIds() {
  if (countryIdByCode) return countryIdByCode
  const countries = await fetchRequestCountries()
  countryIdByCode = new Map(countries.map(c => [String(c.code).toUpperCase(), c.id]))
  return countryIdByCode
}

/** The real clinics list, for DoctorForm's Clinics checkboxes. Not cached — only read while that form is open. */
export async function fetchClinicOptions() {
  const clinics = await fetchAllPages(ApiEndpoints.clinics.adminList)
  return clinics.map(c => ({ id: c.id, name: c.name }))
}

function doctorToRecord(doctor) {
  doctorIds.set(doctor.slug, doctor.id)
  const t = translationOf(doctor.translations)
  const ar = (doctor.translations || []).find(x => x.locale === 'AR')
  return {
    id: doctor.id, // real backend id — lets a slug rename PUT in place instead of delete+recreate
    slug: doctor.slug,
    name: t.name || '',
    specialist: t.title || '',
    bio: t.bio || '',
    nameAr: ar?.name || '',
    specialistAr: ar?.title || '',
    bioAr: ar?.bio || '',
    image: doctor.photoUrl || '',
    yearsExp: doctor.yearsExperience ?? '',
    languages: doctor.languages || [],
    verticals: (doctor.verticals || []).map(v => v.slug),
    countries: (doctor.countries || []).map(c => normaliseCountry(c.code) || c.code),
    clinics: (doctor.clinics || []).map(c => c.id),
    treatments: (doctor.treatments || []).map(t => t.slug),
  }
}

async function fetchDoctors() {
  const doctors = await fetchAllPages(ApiEndpoints.doctors.adminList)
  doctorIds.clear()
  return doctors.map(doctorToRecord)
}

/**
 * A `data:` URI from an ImagePicker/photo file input, uploaded so the
 * backend gets a real URL to store. A value that's already a URL/path
 * (pasted, or an image left untouched on edit) passes straight through.
 * Shared by Doctors (photoUrl) and Vouchers (imageUrl).
 */
async function uploadImageIfNeeded(image) {
  // Returning the value unchanged (not `|| undefined`) matters here: an
  // explicit '' (the user clicked "Remove") has to reach the request body
  // so the backend actually clears the stored URL, not silently leave the
  // old one in place because an empty string got coerced away.
  if (!image || !image.startsWith('data:')) return image
  let response
  try {
    const blob = await (await fetch(image)).blob()
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    response = await fetch(`${API_BASE_URL}${ApiEndpoints.media.upload}`, { method: 'POST', body: form })
  } catch {
    // A 413 page from a proxy/gateway in front of the app almost never carries
    // CORS headers (the app itself never got a chance to add them), so the
    // browser hides the real status and fetch() rejects here instead of
    // resolving with response.status === 413 below. An opaque failure on
    // this specific call is overwhelmingly a size rejection, not a dropped
    // connection — every other request on the page keeps working fine when
    // this happens — so it gets the same message as the explicit 413 check
    // below rather than a misleading "check your connection".
    throw new Error('413 Request Entity Too Large - please upload a smaller file.')
  }
  // A 413 body is the proxy/server's own (often non-JSON) page, not our API's
  // error shape — .json() would fail on it, so it's checked before parsing.
  if (response.status === 413) {
    throw new Error('413 Request Entity Too Large - please upload a smaller file.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.success === false) {
    throw new Error(body?.error?.message || 'Could not upload the image — please try again.')
  }
  return body.data.url
}

export const persistDoctors = async list => {
  const countryIds = await ensureCountryIds()
  for (const d of list) {
    const photoUrl = await uploadImageIfNeeded(d.image)
    // AR is only included when all three fields are filled — the backend
    // requires a complete translation, and (see KA-40) a doctor update
    // deletes every translation not present in this array, so omitting AR
    // here for a doctor that already has one would silently erase it. The
    // form loads existing AR values in, so re-saving without touching them
    // resends them unchanged rather than dropping them.
    const translations = [{ locale: 'EN', name: d.name, title: d.specialist || '', bio: d.bio || '' }]
    if (d.nameAr && d.specialistAr && d.bioAr) {
      translations.push({ locale: 'AR', name: d.nameAr, title: d.specialistAr, bio: d.bioAr })
    }
    const body = {
      slug: d.slug,
      yearsExperience: toNumberOrUndefined(d.yearsExp),
      languages: (d.languages || []).filter(Boolean),
      photoUrl,
      isPublished: true,
      translations,
      clinicIds: d.clinics || [],
      treatmentIds: (d.treatments || []).map(slug => treatmentIds.get(slug)).filter(Boolean),
      countryIds: (d.countries || []).map(c => countryIds.get(String(c).toUpperCase())).filter(Boolean),
      verticalIds: (d.verticals || []).map(slug => pillarIds.get(slug)).filter(Boolean),
    }
    // `d.id` (the record's real backend id, carried since it was fetched)
    // takes priority over a slug lookup — that's what lets a slug edit PUT
    // in place as a rename instead of needing a delete-then-recreate dance.
    const existingId = d.id || doctorIds.get(d.slug)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.doctors.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.doctors.adminList, { method: 'POST', body })
    rememberId(doctorIds, data.slug, data.id)
  }

  // Same "write the whole order every save" approach as persistServices.
  const orders = list
    .map((d, displayOrder) => ({ id: doctorIds.get(d.slug), displayOrder }))
    .filter(o => o.id)
  if (orders.length) {
    await apiRequest(ApiEndpoints.doctors.adminReorder, { method: 'PATCH', body: { orders } })
  }
}

/** Renumber `displayOrder` only — see reorderServices for why this exists
 * separately from persistDoctors. */
export const reorderDoctors = async list => {
  const orders = list
    .map((d, displayOrder) => ({ id: doctorIds.get(d.slug), displayOrder }))
    .filter(o => o.id)
  if (orders.length) {
    await apiRequest(ApiEndpoints.doctors.adminReorder, { method: 'PATCH', body: { orders } })
  }
}

export const removeDoctor = async slug => {
  const id = doctorIds.get(slug)
  if (!id) throw new Error(`Could not delete "${slug}" — it wasn't found.`)
  await apiRequest(ApiEndpoints.doctors.adminById(id), { method: 'DELETE' })
  doctorIds.delete(slug)
}

// ── Locations (Clinics) ────────────────────────────────────────────────
//
// There's no separate Countries/Cities screen in the dashboard, so Country
// and City are resolved against the real backend records via
// fetchCountryOptions() (the same countries-with-cities list Requests
// already uses for its filter) — with an inline "add a city" action
// (createCity) for when the one needed doesn't exist yet, since there's no
// dedicated screen to add it from otherwise.
//
// Clinics have no backend `slug` either — LocationForm's `id` field plays
// the same purely-client-side role `slug` plays for Doctors/Treatments: a
// stable key chosen before the record exists on the backend, translated to
// the real id via clinicRecordIds below (an already-fetched clinic just
// maps to itself, since its `id` already *is* the real one).
//
// The clinic's opening date has no backend column at all — see KA-36,
// filed alongside this integration; the date-range filter it powered is
// removed from the UI along with it.

const clinicRecordIds = new Map() // client id -> backend id

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** Country + its cities, for LocationForm's Country/City selects. */
export async function fetchCountryOptions() {
  return fetchRequestCountries()
}

/** Add a city under a country, for LocationForm's "+ Add city" action. */
export async function createCity(countryId, name) {
  const { data } = await apiRequest(ApiEndpoints.locations.adminCities, {
    method: 'POST',
    body: { name, countryId },
  })
  // Double-wrapped like fetchRequestCountries — the controller returns
  // {success,data} itself, and the response interceptor wraps that again.
  return { id: data.data.id, name: data.data.name }
}

/** `{sun:'10:00-20:00', fri:'closed', …}` -> every day present, defaulting to closed. */
function normaliseHours(openingHours) {
  const hours = {}
  for (const day of DAY_KEYS) hours[day] = openingHours?.[day] || 'closed'
  return hours
}

function clinicToLocation(clinic) {
  clinicRecordIds.set(clinic.id, clinic.id)
  const ar = (clinic.translations || []).find(t => t.locale === 'AR')
  return {
    id: clinic.id,
    name: clinic.name,
    country: normaliseCountry(clinic.countryCode) || clinic.countryCode,
    cityId: clinic.cityId,
    city: clinic.cityName,
    address: clinic.address,
    tel: clinic.phone,
    hours: normaliseHours(clinic.openingHours),
    lat: clinic.lat ?? '',
    lng: clinic.lng ?? '',
    nameAr: ar?.name || '',
    addressAr: ar?.address || '',
  }
}

async function fetchLocations() {
  const clinics = await fetchAllPages(ApiEndpoints.clinics.adminList)
  clinicRecordIds.clear()
  return clinics.map(clinicToLocation)
}

export const persistLocations = async list => {
  for (const l of list) {
    const translations = [{ locale: 'EN', name: l.name, address: l.address || '' }]
    if (l.nameAr && l.addressAr) {
      translations.push({ locale: 'AR', name: l.nameAr, address: l.addressAr })
    }
    const body = {
      cityId: l.cityId,
      phone: l.tel || '',
      openingHours: normaliseHours(l.hours),
      lat: toNumberOrUndefined(l.lat) ?? 0,
      lng: toNumberOrUndefined(l.lng) ?? 0,
      translations,
    }
    const existingId = clinicRecordIds.get(l.id)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.clinics.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.clinics.adminList, { method: 'POST', body })
    clinicRecordIds.set(l.id, data.id)
  }
}

export const removeLocation = async id => {
  const backendId = clinicRecordIds.get(id)
  if (!backendId) throw new Error('Could not delete this clinic — it wasn\'t found.')
  await apiRequest(ApiEndpoints.clinics.adminById(backendId), { method: 'DELETE' })
  clinicRecordIds.delete(id)
}

// ── Indulgence (voucher offers) ───────────────────────────────────────────
//
// Per-country pricing (VoucherForm's `pricing` map, one price per market)
// has no backend equivalent — same standing gap KA-30 already tracks for
// Treatments, not a new one. The backend keeps one price/currency and a
// `regions` list of where it's offered; that list is exactly what
// CountryFields already collects into `countries` (with `showPricing`
// turned off), just under the backend's own name.

const voucherOfferIds = new Map() // client id (slug) -> backend id

const BADGE_STYLE_TO_BACKEND = { '': 'none', popular: 'popular', new: 'new', trending: 'trending' }
const BADGE_STYLE_FROM_BACKEND = { none: '', popular: 'popular', new: 'new', trending: 'trending' }

function voucherOfferToRecord(offer) {
  voucherOfferIds.set(offer.id, offer.id)
  const ar = (offer.translations || []).find(t => t.locale === 'AR')
  return {
    id: offer.id,
    title: offer.title,
    subtitle: offer.subtitle || '',
    description: offer.description || '',
    price: offer.price ?? '',
    currency: offer.currency || 'AED',
    type: offer.type || 'gift',
    badge: offer.badge || '',
    badgeStyle: BADGE_STYLE_FROM_BACKEND[offer.badgeStyle] ?? '',
    img: offer.imageUrl || '',
    redemptionTerms: offer.redemptionTerms || '',
    regions: (offer.regions || []).map(r => normaliseCountry(r) || r),
    titleAr: ar?.title || '',
    subtitleAr: ar?.subtitle || '',
    descriptionAr: ar?.description || '',
    badgeAr: ar?.badge || '',
    redemptionTermsAr: ar?.redemptionTerms || '',
  }
}

async function fetchVouchers() {
  const offers = await fetchAllPages(ApiEndpoints.indulgence.adminList)
  voucherOfferIds.clear()
  return offers.map(voucherOfferToRecord)
}

export const persistVouchers = async list => {
  for (const v of list) {
    const imageUrl = await uploadImageIfNeeded(v.img)
    const translations = [{
      locale: 'EN',
      title: v.title,
      subtitle: v.subtitle || undefined,
      description: v.description || '',
      badge: v.badge || undefined,
      redemptionTerms: v.redemptionTerms || undefined,
    }]
    if (v.titleAr && v.descriptionAr) {
      translations.push({
        locale: 'AR',
        title: v.titleAr,
        subtitle: v.subtitleAr || undefined,
        description: v.descriptionAr,
        badge: v.badgeAr || undefined,
        redemptionTerms: v.redemptionTermsAr || undefined,
      })
    }
    const body = {
      price: toNumberOrUndefined(v.price) ?? 0,
      currency: v.currency || 'AED',
      type: v.type || 'gift',
      badgeStyle: BADGE_STYLE_TO_BACKEND[v.badgeStyle] ?? 'none',
      imageUrl,
      regions: (v.regions || []).map(r => String(r).toUpperCase()),
      isPublished: true,
      translations,
    }
    const existingId = voucherOfferIds.get(v.id)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.indulgence.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.indulgence.adminList, { method: 'POST', body })
    voucherOfferIds.set(v.id, data.id)
  }

  const orders = list
    .map((v, displayOrder) => ({ id: voucherOfferIds.get(v.id), displayOrder }))
    .filter(o => o.id)
  if (orders.length) {
    await apiRequest(ApiEndpoints.indulgence.adminReorder, { method: 'PATCH', body: { orders } })
  }
}

/** Renumber `displayOrder` only — see reorderServices for why this exists
 * separately from persistVouchers. */
export const reorderVouchers = async list => {
  const orders = list
    .map((v, displayOrder) => ({ id: voucherOfferIds.get(v.id), displayOrder }))
    .filter(o => o.id)
  if (orders.length) {
    await apiRequest(ApiEndpoints.indulgence.adminReorder, { method: 'PATCH', body: { orders } })
  }
}

export const removeVoucher = async id => {
  const backendId = voucherOfferIds.get(id)
  if (!backendId) throw new Error('Could not delete this voucher — it wasn\'t found.')
  await apiRequest(ApiEndpoints.indulgence.adminById(backendId), { method: 'DELETE' })
  voucherOfferIds.delete(id)
}

// ── Voucher requests (public purchases) ───────────────────────────────────
//
// Distinct from the offers above: these are the purchase/gift requests
// submitted against a voucher on the public site (KA-16), landing here so
// staff can see and progress them — no dashboard screen read this before
// KA-27, so this is new UI, not a rewire of something that already existed.

function voucherRequestToRecord(v) {
  return {
    id: v.id,
    offerTitle: v.offer?.title || '',
    offerPrice: v.offer?.price,
    offerCurrency: v.offer?.currency,
    purchaserName: v.visitorName,
    purchaserEmail: v.visitorEmail,
    purchaserPhone: v.visitorPhone || '',
    isGift: v.isGift,
    recipientName: v.recipientName || '',
    recipientEmail: v.recipientEmail || '',
    recipientPhone: v.recipientPhone || '',
    personalMessage: v.personalMessage || '',
    sendVia: v.sendVia,
    code: v.code || '',
    status: v.status,
    submittedAt: v.submittedAt,
  }
}

function voucherRequestQueryParams({ search, status, page, pageSize } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))
  return params
}

export async function fetchVoucherRequestsPage(filters) {
  const qs = voucherRequestQueryParams({ pageSize: 20, page: 1, ...filters }).toString()
  const { data, meta } = await apiRequest(`${ApiEndpoints.voucherRequests.adminList}?${qs}`)
  const pagination = meta?.pagination || {}
  return {
    items: data.map(voucherRequestToRecord),
    total: pagination.total ?? 0,
    page: pagination.page ?? 1,
    pageSize: pagination.pageSize ?? data.length,
  }
}

export async function persistVoucherRequestStatus(id, status) {
  const { data } = await apiRequest(ApiEndpoints.voucherRequests.adminStatus(id), {
    method: 'PATCH',
    body: { status },
  })
  return voucherRequestToRecord(data)
}

export async function removeVoucherRequestRecord(id) {
  await apiRequest(ApiEndpoints.voucherRequests.adminById(id), { method: 'DELETE' })
}

// ── Reviews (testimonials) ────────────────────────────────────────────────
//
// No `displayOrder`/reorder endpoint exists on Testimonial at all — see
// KA-38. `vertical` has no backend relation either (Testimonial links to a
// Treatment, never a Pillar) — dropped from the form, also tracked there.
// `treatment` holds a Treatment slug (ReviewForm renders it as a real
// <select> over `services`, KA-44) and resolves to a real id via the same
// `treatmentIds` slug -> id map Services/Doctors already use, rather than
// the old free-text-plus-datalist field that let anyone type an unlisted
// value and silently fail to link.

const reviewIds = new Map() // client id -> backend id

function reviewToRecord(t) {
  reviewIds.set(t.id, t.id)
  const ar = (t.translations || []).find(x => x.locale === 'AR')
  return {
    id: t.id,
    name: t.name,
    location: t.address || '',
    treatment: t.treatment?.slug || '',
    quote: t.quote,
    rating: t.rating ?? 5,
    consentGiven: !!t.consentGiven,
    before: t.beforeImgUrl || '',
    after: t.afterImgUrl || '',
    nameAr: ar?.clientAlias || '',
    locationAr: ar?.address || '',
    quoteAr: ar?.quote || '',
  }
}

async function fetchReviews() {
  const items = await fetchAllPages(ApiEndpoints.testimonials.adminList)
  reviewIds.clear()
  return items.map(reviewToRecord)
}

export const persistReviews = async list => {
  for (const r of list) {
    const beforeImgUrl = await uploadImageIfNeeded(r.before)
    const afterImgUrl = await uploadImageIfNeeded(r.after)
    const translations = [{ locale: 'EN', clientAlias: r.name, quote: r.quote, address: r.location || undefined }]
    if (r.nameAr && r.quoteAr) {
      translations.push({
        locale: 'AR',
        clientAlias: r.nameAr,
        quote: r.quoteAr,
        address: r.locationAr || undefined,
      })
    }
    const body = {
      rating: toNumberOrUndefined(r.rating) ?? 5,
      treatmentId: treatmentIds.get(r.treatment) || undefined,
      beforeImgUrl: beforeImgUrl || undefined,
      afterImgUrl: afterImgUrl || undefined,
      consentGiven: !!r.consentGiven,
      isPublished: true,
      translations,
    }
    const existingId = reviewIds.get(r.id)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.testimonials.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.testimonials.adminList, { method: 'POST', body })
    reviewIds.set(r.id, data.id)
  }
}

export const removeReview = async id => {
  const backendId = reviewIds.get(id)
  if (!backendId) throw new Error('Could not delete this review — it wasn\'t found.')
  await apiRequest(ApiEndpoints.testimonials.adminById(backendId), { method: 'DELETE' })
  reviewIds.delete(id)
}

// ── Footer & Global (site-wide content) ────────────────────────────────────
//
// Both are single documents, not lists — GET/PUT the whole thing, one
// translation per locale. The dashboard edits one section at a time, so
// persistSiteSection fetches the current document, replaces only the
// touched section (translating the dashboard's field names to the
// backend's — they were authored independently and don't match), and PUTs
// the whole thing back. EN only; any existing AR translation is read and
// re-sent untouched so saving in English can never blank it out.

function footerContentToDashboard(c) {
  return {
    brand: { tagline: c.brandColumn.tagline, socials: c.brandColumn.socialLinks },
    columns: {
      treatmentsHeading: c.linkColumns.treatmentsHeading,
      companyHeading: c.linkColumns.companyHeading,
      companyLinks: c.linkColumns.companyLinks.map(l => ({ label: l.label, href: l.url })),
      supportHeading: c.linkColumns.supportHeading,
      supportLinks: c.linkColumns.supportLinks.map(l => ({ label: l.label, href: l.url })),
    },
    newsletter: {
      heading: c.newsletter.heading,
      placeholder: c.newsletter.inputPlaceholder,
      note: c.newsletter.note,
    },
    legal: {
      copyright: c.legalBar.copyrightLine,
      regionLabel: c.legalBar.regionSwitcherLabel,
      links: c.legalBar.legalLinks.map(l => ({ label: l.label, href: l.url })),
    },
  }
}

function footerDashboardToContent(sections) {
  const s = { brand: {}, columns: {}, newsletter: {}, legal: {}, ...sections }
  return {
    brandColumn: { tagline: s.brand.tagline || '', socialLinks: s.brand.socials || [] },
    linkColumns: {
      treatmentsHeading: s.columns.treatmentsHeading || '',
      companyHeading: s.columns.companyHeading || '',
      companyLinks: (s.columns.companyLinks || []).map(l => ({ label: l.label, url: l.href })),
      supportHeading: s.columns.supportHeading || '',
      supportLinks: (s.columns.supportLinks || []).map(l => ({ label: l.label, url: l.href })),
    },
    newsletter: {
      heading: s.newsletter.heading || '',
      inputPlaceholder: s.newsletter.placeholder || '',
      note: s.newsletter.note || '',
    },
    legalBar: {
      copyrightLine: s.legal.copyright || '',
      regionSwitcherLabel: s.legal.regionLabel || '',
      legalLinks: (s.legal.links || []).map(l => ({ label: l.label, url: l.href })),
    },
  }
}

function globalContentToDashboard(c) {
  return {
    brand: { name: c.brand.brandName, logo: c.brand.logoUrl },
    contact: { whatsapp: c.contact.whatsappNumber, whatsappLabel: c.contact.whatsappButtonLabel },
    bookingCta: {
      headline: c.defaultBookingCta.headline,
      headlineEm: c.defaultBookingCta.headlineEmphasis,
      sub: c.defaultBookingCta.subtitle,
      buttonLabel: c.defaultBookingCta.buttonLabel,
    },
  }
}

function globalDashboardToContent(sections) {
  const s = { brand: {}, contact: {}, bookingCta: {}, ...sections }
  return {
    brand: { brandName: s.brand.name || '', logoUrl: s.brand.logo || '' },
    contact: { whatsappNumber: s.contact.whatsapp || '', whatsappButtonLabel: s.contact.whatsappLabel || '' },
    defaultBookingCta: {
      headline: s.bookingCta.headline || '',
      headlineEmphasis: s.bookingCta.headlineEm || '',
      subtitle: s.bookingCta.sub || '',
      buttonLabel: s.bookingCta.buttonLabel || '',
    },
  }
}

const SITE_GROUP_CONFIG = {
  footer: { endpoint: ApiEndpoints.footer.admin, toDashboard: footerContentToDashboard, toContent: footerDashboardToContent },
  global: { endpoint: ApiEndpoints.globalConfig.admin, toDashboard: globalContentToDashboard, toContent: globalDashboardToContent },
}

/** Neither document exists until the first save — a fresh install has nothing to GET yet. */
async function getSiteGroupTranslations(cfg) {
  try {
    const { data } = await apiRequest(cfg.endpoint)
    return data.translations || []
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) return []
    throw e
  }
}

/** Every section's value for one locale, or {} per section if that locale has no translation at all yet. */
function siteGroupSections(cfg, translations, locale) {
  const t = translations.find(x => x.locale === locale)
  return t ? cfg.toDashboard(t.content) : {}
}

async function fetchSiteGroup(groupId) {
  const cfg = SITE_GROUP_CONFIG[groupId]
  const translations = await getSiteGroupTranslations(cfg)
  const enSections = siteGroupSections(cfg, translations, 'EN')
  const arSections = siteGroupSections(cfg, translations, 'AR')
  const sectionIds = new Set([...Object.keys(enSections), ...Object.keys(arSections)])
  const out = {}
  for (const id of sectionIds) out[id] = { EN: enSections[id] || {}, AR: arSections[id] || {} }
  return out
}

/**
 * Both EN and AR are sent together (not just whichever locale is on
 * screen) because Footer/Global are single documents, not a list — a PUT
 * replaces the whole `translations` array. EN and AR both already have
 * real content for every section (seeded), so merging the one changed
 * section on top of each locale's current content, the same way for both,
 * always produces a complete document — the backend requires every field.
 */
export async function persistSiteSection(groupId, sectionId, sectionValue) {
  const cfg = SITE_GROUP_CONFIG[groupId]
  if (!cfg) return notConnected('Site content')

  const translations = await getSiteGroupTranslations(cfg)
  const nextEn = { ...siteGroupSections(cfg, translations, 'EN'), [sectionId]: sectionValue.EN || {} }
  const nextAr = { ...siteGroupSections(cfg, translations, 'AR'), [sectionId]: sectionValue.AR || {} }

  const nextTranslations = [
    { locale: 'EN', content: cfg.toContent(nextEn) },
    { locale: 'AR', content: cfg.toContent(nextAr) },
  ]
  await apiRequest(cfg.endpoint, { method: 'PUT', body: { translations: nextTranslations } })
}

// ── Pages (page copy) ──────────────────────────────────────────────────
//
// Every page/section pair below was authored independently on each side —
// the backend's section `key`s and the field names *inside* each section's
// content rarely match the dashboard's schema, even when they clearly mean
// the same thing (e.g. home's announcement bar is {show,message,linkUrl}
// on the backend vs {enabled,text,href} here). PAGE_SECTIONS is the
// translation table for all of it, built by reading both schemas side by
// side against kaya-nest-api's src/prisma/page-sections.data.ts.
//
// The backend update endpoint (PUT /admin/pages/:id/sections) only touches
// the sections you send — unlike Footer/Global it's a true partial update,
// so persistPageSection sends just the one changed section.
//
// A couple of fields go further than a rename: `about`'s regional-reach
// stores each country's cities as a real array; this form as one
// middot-joined string (the `join` spec below). A few `icon`/`flag` fields
// use a different *vocabulary* on each side (the backend stores semantic
// names like 'syringe'/'uae', this form free emoji text) — those pass
// through unchanged rather than attempting a translation, so an untouched
// field round-trips exactly, but retyping one from the dashboard won't
// necessarily match whatever icon set the public site renders from.
//
// EN only, consistent with every other entity's standing AR-locale gap.

/** True if a value (scalar, array, or nested object) has no real content anywhere in it. */
function isBlank(value) {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.every(isBlank)
  if (typeof value === 'object') return Object.values(value).every(isBlank)
  return false
}

const MID_DOT = ' · '
const joinList = arr => (arr || []).join(MID_DOT)
const splitList = str => String(str || '').split(MID_DOT).map(s => s.trim()).filter(Boolean)

/**
 * Map one section's content object between the dashboard's field names and
 * the backend's. `fields` is {dashboardKey: spec}, where spec is:
 *   - a string: the matching backend key, same shape (scalar, or an array
 *     the two sides already agree on, like `paragraphs`)
 *   - {key, join: true}: an array of strings on the dashboard <-> one
 *     middot-joined string on the backend
 *   - {key, list}: an array of objects, each itself mapped by `list`
 */
function mapSection(content, fields, direction) {
  const out = {}
  for (const [feKey, spec] of Object.entries(fields)) {
    if (typeof spec === 'string') {
      if (direction === 'toDashboard') out[feKey] = content?.[spec]
      else out[spec] = content?.[feKey]
      continue
    }
    if (spec.join) {
      if (direction === 'toDashboard') out[feKey] = joinList(content?.[spec.key])
      else out[spec.key] = splitList(content?.[feKey])
      continue
    }
    const items = (direction === 'toDashboard' ? content?.[spec.key] : content?.[feKey]) || []
    const mapped = items.map(item => mapSection(item, spec.list, direction))
    if (direction === 'toDashboard') out[feKey] = mapped
    else out[spec.key] = mapped
  }
  return out
}

const PAGE_SECTIONS = {
  home: {
    slug: 'homepage',
    sections: {
      announcement: { key: 'announcement-bar', fields: { enabled: 'show', text: 'message', linkLabel: 'linkLabel', href: 'linkUrl' } },
      hero: { key: 'bento-hero-heading', fields: { heading: 'heading', headingEm: 'headingEmphasis' } },
      bannerPrimary: { key: 'primary-banner', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', stats: 'statLine', ctaLabel: 'buttonLabel' } },
      bannerTellUs: { key: 'tell-us-banner', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle', ctaLabel: 'buttonLabel', href: 'linkUrl' } },
      popularTreatments: { key: 'popular-treatments-row', fields: { title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle', linkLabel: 'seeAllLink' } },
      indulgenceRow: { key: 'indulgence-row', fields: { title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle', linkLabel: 'seeAllLink' } },
      doctorsBanner: { key: 'doctors-banner', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle', ctaLabel: 'buttonLabel', linkLabel: 'seeAllLink' } },
      tellUsPromo: { key: 'tell-us-promo-block', fields: { eyebrow: 'eyebrow', headline: 'headline', headlineEm: 'headlineEmphasis', sub: 'subtitle', ctaLabel: 'buttonLabel', pickerLabel: 'carouselLabel' } },
      reviews: { key: 'reviews-section', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', titleEnd: 'titleAfterEmphasis', sub: 'subtitle' } },
    },
  },
  about: {
    slug: 'about',
    sections: {
      meta: { key: 'search-metadata', fields: { title: 'pageTitle', description: 'metaDescription' } },
      hero: {
        key: 'hero',
        fields: {
          image: 'bgImageUrl', eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle',
          stats: { key: 'stats', list: { value: 'value', label: 'label' } },
        },
      },
      story: { key: 'our-story', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', image: 'storyImageUrl', paragraphs: 'paragraphs', quote: 'pullQuote', quoteEm: 'pullQuoteEmphasis', attribution: 'attribution' } },
      principles: {
        key: 'principles',
        fields: {
          eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle',
          items: { key: 'principles', list: { icon: 'icon', title: 'title', desc: 'description' } },
        },
      },
      reach: {
        key: 'regional-reach',
        fields: {
          eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle',
          mapClinics: 'mapBadgeClinics', mapCountries: 'mapBadgeCountries',
          regions: {
            key: 'countries',
            list: { flag: 'flag', short: 'shortName', country: 'country', count: 'clinicCount', cities: { key: 'cities', join: true } },
          },
        },
      },
    },
  },
  treatments: {
    slug: 'treatments',
    sections: {
      hero: { key: 'hero', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
      trust: { key: 'trust-pillars', fields: { items: { key: 'pillars', list: { icon: 'icon', title: 'title', desc: 'description' } } } },
      verticalCopy: { key: 'specialty-descriptions', fields: { items: { key: 'specialties', list: { vertical: 'verticalId', desc: 'description' } } } },
    },
  },
  aesthetic: {
    slug: 'aesthetic',
    sections: {
      hero: { key: 'hero', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', headline: 'headline', headlineEm: 'headlineEmphasis', headlineEnd: 'headlineAfterEmphasis', sub: 'subtitle', primaryCta: 'primaryButton', secondaryCta: 'secondaryLink' } },
      pillarsIntro: { key: 'pathways-heading', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
      pillars: { key: 'pathway-cards', fields: { items: { key: 'pathways', list: { label: 'label', href: 'linkUrl', hint: 'hint', image: 'imageUrl' } } } },
      featuredIntro: { key: 'featured-treatments-heading', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
      trustStats: { key: 'trust-bar', fields: { items: { key: 'stats', list: { value: 'value', label: 'label' } } } },
      cta: { key: 'closing-cta', fields: { headline: 'headline', sub: 'subtitle', primaryCta: 'primaryButton', secondaryCta: 'secondaryLink' } },
    },
  },
  wellness: {
    slug: 'wellness-longevity',
    sections: {
      hero: { key: 'hero', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', headline: 'headline', headlineEm: 'headlineEmphasis', headlineEnd: 'headlineAfterEmphasis', sub: 'subtitle', primaryCta: 'primaryButton', secondaryCta: 'secondaryLink' } },
      pillarsIntro: { key: 'approach-heading', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
      pillars: { key: 'approach-pillars', fields: { items: { key: 'pillars', list: { icon: 'icon', label: 'label', hint: 'hint' } } } },
      featuredIntro: { key: 'protocols-heading', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
      cta: { key: 'closing-cta', fields: { headline: 'headline', headlineEm: 'headlineEmphasis', sub: 'subtitle' } },
    },
  },
  mens: {
    slug: 'mens',
    sections: {
      hero: { key: 'hero', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', headline: 'headline', headlineEm: 'headlineEmphasis', headlineEnd: 'headlineAfterEmphasis', sub: 'subtitle', primaryCta: 'primaryButton', secondaryCta: 'secondaryLink' } },
      trust: { key: 'trust-points', fields: { items: { key: 'points', list: { icon: 'icon', label: 'label', hint: 'hint' } } } },
      featuredIntro: { key: 'featured-treatments-heading', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
      cta: { key: 'closing-cta', fields: { headline: 'headline', headlineEm: 'headlineEmphasis', sub: 'subtitle' } },
    },
  },
  surgery: {
    slug: 'plastic-surgery',
    sections: {
      hero: { key: 'hero', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', headline: 'headline', headlineEm: 'headlineEmphasis', headlineEnd: 'headlineAfterEmphasis', sub: 'subtitle', primaryCta: 'primaryButton', secondaryCta: 'secondaryLink' } },
      trust: { key: 'trust-points', fields: { items: { key: 'points', list: { icon: 'icon', label: 'label', hint: 'hint' } } } },
      featuredIntro: { key: 'procedures-heading', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
      cta: { key: 'closing-cta', fields: { headline: 'headline', headlineEm: 'headlineEmphasis', sub: 'subtitle' } },
    },
  },
  doctorsPage: {
    slug: 'doctors',
    sections: {
      hero: { key: 'hero', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
    },
  },
  indulgencePage: {
    slug: 'indulgence',
    sections: {
      hero: { key: 'hero', fields: { image: 'bgImageUrl', eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis', sub: 'subtitle' } },
    },
  },
  findUsPage: {
    slug: 'find-us',
    sections: {
      header: { key: 'section-heading', fields: { eyebrow: 'eyebrow', title: 'title', titleEm: 'titleEmphasis' } },
    },
  },
  tellUsPage: {
    slug: 'tell-us',
    sections: {
      step1: { key: 'step-1-treatment-area', fields: { eyebrow: 'eyebrow', heading: 'heading', headingEm: 'headingEmphasis', sub: 'subtitle' } },
      step2: { key: 'step-2-gender', fields: { eyebrow: 'eyebrow', heading: 'heading', headingEm: 'headingEmphasis', sub: 'subtitle' } },
      step3: { key: 'step-3-age-range', fields: { eyebrow: 'eyebrow', heading: 'heading', headingEm: 'headingEmphasis', sub: 'subtitle' } },
      step4: { key: 'step-4-concerns', fields: { eyebrow: 'eyebrow', heading: 'heading', headingEm: 'headingEmphasis', sub: 'subtitle' } },
      step5: { key: 'step-5-results', fields: { eyebrow: 'eyebrow', heading: 'heading', headingEm: 'headingEmphasis', sub: 'subtitle' } },
    },
  },
}

const pageIds = new Map() // dashboard page id -> backend page id

async function fetchPages() {
  const pages = await fetchAllPages(ApiEndpoints.pages.adminList)
  pageIds.clear()
  const bySlug = new Map(pages.map(p => [p.slug, p]))

  const result = {}
  for (const [feId, cfg] of Object.entries(PAGE_SECTIONS)) {
    const page = bySlug.get(cfg.slug)
    if (!page) continue
    pageIds.set(feId, page.id)

    const sectionsByKey = new Map(page.sections.map(s => [s.key, s]))
    const out = {}
    for (const [sectionId, sectionCfg] of Object.entries(cfg.sections)) {
      const section = sectionsByKey.get(sectionCfg.key)
      const en = section?.translations.find(t => t.locale === 'EN')
      const ar = section?.translations.find(t => t.locale === 'AR')
      out[sectionId] = {
        EN: en ? mapSection(en.content, sectionCfg.fields, 'toDashboard') : {},
        AR: ar ? mapSection(ar.content, sectionCfg.fields, 'toDashboard') : {},
      }
    }
    result[feId] = out
  }
  return result
}

async function ensurePageId(pageId) {
  const cached = pageIds.get(pageId)
  if (cached) return cached
  const pages = await fetchAllPages(ApiEndpoints.pages.adminList)
  const page = pages.find(p => p.slug === PAGE_SECTIONS[pageId].slug)
  if (!page) throw new Error(`Page "${PAGE_SECTIONS[pageId].slug}" was not found on the backend.`)
  pageIds.set(pageId, page.id)
  return page.id
}

/**
 * Unlike Footer/Global, a page section updates one locale at a time (see
 * pages.repository.ts's per-section, per-locale upsert) — so AR is simply
 * included whenever there's anything in it, with no need to merge against
 * a whole document. Skipped entirely when blank, rather than writing an
 * empty AR row nobody asked for.
 */
export async function persistPageSection(pageId, sectionId, sectionValue) {
  const cfg = PAGE_SECTIONS[pageId]?.sections[sectionId]
  if (!cfg) throw new Error(`"${pageId}/${sectionId}" isn't mapped to a backend page section.`)

  const backendPageId = await ensurePageId(pageId)
  const translations = [{ locale: 'EN', content: mapSection(sectionValue.EN || {}, cfg.fields, 'toContent') }]
  if (!isBlank(sectionValue.AR)) {
    translations.push({ locale: 'AR', content: mapSection(sectionValue.AR, cfg.fields, 'toContent') })
  }
  await apiRequest(ApiEndpoints.pages.adminSections(backendPageId), {
    method: 'PUT',
    body: { sections: [{ key: cfg.key, translations }] },
  })
}

// ── Everything else — not connected yet ───────────────────────────────────

export async function fetchAll() {
  const [verticals, categories, services, doctors, locations, vouchers, reviews, footer, global, pages] =
    await Promise.all([
      fetchVerticals(), fetchCategories(), fetchServices(), fetchDoctors(), fetchLocations(),
      fetchVouchers(), fetchReviews(), fetchSiteGroup('footer'), fetchSiteGroup('global'), fetchPages(),
    ])
  return {
    services, verticals, categories, doctors, locations, vouchers, reviews, pages,
    site: { footer, global },
  }
}

// ── Requests (consumer submissions) ───────────────────────────────────────
//
// The dashboard calls this screen "Requests"; the backend's domain name for
// the same data is `leads` — see KA-23. The two vocabularies don't match
// (BOOKING/INQUIRY vs consultation/concern, NEW/RESPONDED/CONFIRMED/CLOSED
// vs new/contacted/booked/closed), so the maps below translate at this one
// boundary and nothing above `leadToRequest`/the *ToBackend maps needs to
// know the backend's own words for either.
//
// `gender`, `concerns`, `treatmentArea` and `notes` landed on the backend in
// KA-31 — `gender` is its own SCREAMING_CASE enum (MALE/FEMALE/OTHER), so it
// gets the same kind of translation as status/source below; the other three
// are plain strings/arrays and pass through as-is.

const REQUEST_STATUS_TO_BACKEND = { new: 'NEW', contacted: 'RESPONDED', booked: 'CONFIRMED', closed: 'CLOSED' }
const REQUEST_STATUS_FROM_BACKEND = Object.fromEntries(
  Object.entries(REQUEST_STATUS_TO_BACKEND).map(([k, v]) => [v, k]),
)
const REQUEST_SOURCE_TO_BACKEND = { consultation: 'BOOKING', concern: 'INQUIRY' }
const REQUEST_SOURCE_FROM_BACKEND = Object.fromEntries(
  Object.entries(REQUEST_SOURCE_TO_BACKEND).map(([k, v]) => [v, k]),
)
const REQUEST_GENDER_FROM_BACKEND = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' }

function leadToRequest(lead) {
  return {
    id: lead.id,
    source: REQUEST_SOURCE_FROM_BACKEND[lead.type] || 'consultation',
    status: REQUEST_STATUS_FROM_BACKEND[lead.status] || 'new',
    name: lead.name,
    mobile: lead.phone,
    email: lead.email,
    country: lead.country?.name || '',
    city: lead.city?.name || '',
    treatment: lead.treatment?.title || '',
    doctor: lead.doctor?.name || '',
    message: lead.message || '',
    createdAt: lead.submittedAt,
    gender: REQUEST_GENDER_FROM_BACKEND[lead.gender] || '',
    treatmentArea: lead.treatmentArea || '',
    concerns: lead.concerns || [],
    notes: lead.notes || '',
  }
}

function requestQueryParams({ search, source, status, country, city, from, to, page, pageSize } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (source) params.set('type', REQUEST_SOURCE_TO_BACKEND[source] || source)
  if (status) params.set('status', REQUEST_STATUS_TO_BACKEND[status] || status)
  if (country) params.set('country', country)
  if (city) params.set('city', city)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))
  return params
}

/**
 * One page of enquiries matching the given filters.
 *
 * As with fetchAllPages above, `data` is the items array itself and the
 * pagination numbers live in `meta.pagination` — the interceptor hoists them
 * out of the paginated shape the service returns.
 */
export async function fetchRequestsPage(filters) {
  const qs = requestQueryParams({ pageSize: 20, page: 1, ...filters }).toString()
  const { data, meta } = await apiRequest(`${ApiEndpoints.leads.adminList}?${qs}`)
  const pagination = meta?.pagination || {}
  return {
    items: data.map(leadToRequest),
    total: pagination.total ?? 0,
    page: pagination.page ?? 1,
    pageSize: pagination.pageSize ?? data.length,
  }
}

const REQUEST_STATUS_KEYS = ['new', 'contacted', 'booked', 'closed']

/** Total enquiries per status, regardless of the screen's active filters — powers the summary chips, the Overview tile and the sidebar badge. */
export async function fetchRequestStatusCounts() {
  const entries = await Promise.all(REQUEST_STATUS_KEYS.map(async key => {
    const qs = requestQueryParams({ status: key, page: 1, pageSize: 1 }).toString()
    const { meta } = await apiRequest(`${ApiEndpoints.leads.adminList}?${qs}`)
    return [key, meta?.pagination?.total ?? 0]
  }))
  const counts = Object.fromEntries(entries)
  counts.total = REQUEST_STATUS_KEYS.reduce((sum, key) => sum + counts[key], 0)
  return counts
}

/**
 * Countries with their cities, for the Requests filter dropdown — public and
 * unauthenticated, the same list the booking form uses.
 *
 * This isn't a paginated shape, so the interceptor doesn't hoist anything —
 * but the controller itself returns `{ success, data }`, and the interceptor
 * wraps that whole object as `data` again, since it doesn't know to unwrap
 * an already-enveloped result. Hence `data.data` rather than `data`.
 */
export async function fetchRequestCountries() {
  const { data } = await apiRequest(ApiEndpoints.locations.publicCountries)
  return data?.data || []
}

export async function persistRequestStatus(id, status) {
  const { data } = await apiRequest(ApiEndpoints.leads.adminRespond(id), {
    method: 'PATCH',
    body: { status: REQUEST_STATUS_TO_BACKEND[status] || status },
  })
  return leadToRequest(data)
}

/** Separate from persistRequestStatus — its own endpoint, so editing a note never touches status/respondedBy/respondedAt. */
export async function persistRequestNotes(id, notes) {
  const { data } = await apiRequest(ApiEndpoints.leads.adminNotes(id), {
    method: 'PATCH',
    body: { notes },
  })
  return leadToRequest(data)
}

export async function removeRequestRecord(id) {
  await apiRequest(ApiEndpoints.leads.adminDelete(id), { method: 'DELETE' })
}

/**
 * CSV of every enquiry matching the given filters (not just the current
 * page) — the backend builds the file itself, so this bypasses apiRequest
 * (which assumes the {success,data} envelope) for a plain authenticated GET
 * that returns the raw text.
 */
export async function exportRequestsCsv(filters) {
  const qs = requestQueryParams(filters).toString()
  const response = await fetch(`${API_BASE_URL}${ApiEndpoints.leads.adminExportCsv}${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
  })
  if (!response.ok) throw new Error('Could not export enquiries — please try again.')
  return response.text()
}

export async function fetchOverrides() {
  return notConnected('Country overrides')
}
export const persistOverrideSection = () => notConnected('Country overrides')

// ── Users & Roles (staff accounts) ──────────────────────────────────────
//
// list/create/invite exist; there's no endpoint to change a staff member's
// role (or remove one) after they're created — see KA-39. The dashboard's
// role-change control only shows in preview mode as a result; against the
// real API, roles display read-only.
//
// There's also no "list pending invites" endpoint, so an invite sent here
// doesn't appear anywhere in the dashboard afterward — only once the
// invited person accepts and becomes a real staff user.

const ROLE_TO_BACKEND = { admin: 'ADMIN', editor: 'STAFF' }
const ROLE_FROM_BACKEND = { ADMIN: 'admin', STAFF: 'editor' }
const ROLE_TITLE = { admin: 'Administrator', editor: 'Content Editor' }

function staffToUser(staff) {
  const role = ROLE_FROM_BACKEND[staff.role] || 'editor'
  return { id: staff.id, name: staff.name, email: staff.email, title: ROLE_TITLE[role], role }
}

export async function fetchUsers() {
  const staff = await fetchAllPages(ApiEndpoints.staffUsers.adminList)
  return staff.map(staffToUser)
}

export const updateUserRole = () => notConnected('Changing a staff member’s role')

export async function inviteStaffUser({ name, email, role }) {
  await apiRequest(ApiEndpoints.staffUsers.adminInvite, {
    method: 'POST',
    body: { name, email, role: ROLE_TO_BACKEND[role] || 'STAFF' },
  })
}

/**
 * Unused inside this repo (nothing here calls it — it exists for the
 * separate public-website project), and its contract is to never throw, so
 * it reports failure the same way rather than crashing a caller.
 */
export async function submitRequest() {
  return { ok: false, error: "Enquiry submission isn't connected to a backend yet." }
}

/**
 * TODO: no backend endpoint exists yet for triggering a real site rebuild
 * (kaya-nest-api has nothing resembling one — see the search that confirmed
 * this). Reports success anyway, on request, so staff see the same
 * reassuring "it's on its way" message the old Supabase-backed version gave
 * rather than a raw error — but nothing actually rebuilds the site yet.
 * Replace this with a real call once a rebuild/revalidate endpoint exists.
 */
export async function triggerPublish() {
  return { ok: true }
}
