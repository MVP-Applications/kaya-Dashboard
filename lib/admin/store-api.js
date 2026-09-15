/**
 * API-backed data layer.
 *
 * Services/Verticals (Treatments/Pillars, KA-24), Doctors (KA-25),
 * Locations/Clinics (KA-26), Indulgence/Vouchers (KA-27) and Reviews/
 * Footer/Global (KA-28) are connected to kaya-nest-api. Page content
 * (also KA-28) is not yet — see persistPageSection below. Everything else
 * is still foundation-only:
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
const treatmentIdByName = new Map() // lowercased title -> backend id, for Reviews' free-text Treatment field
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
  if (t.title) treatmentIdByName.set(t.title.toLowerCase(), treatment.id)
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
  treatmentIdByName.clear()
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
  return {
    slug: doctor.slug,
    name: t.name || '',
    specialist: t.title || '',
    bio: t.bio || '',
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
  if (!image || !image.startsWith('data:')) return image || undefined
  const blob = await (await fetch(image)).blob()
  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  const response = await fetch(`${API_BASE_URL}${ApiEndpoints.media.upload}`, { method: 'POST', body: form })
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
    const body = {
      slug: d.slug,
      yearsExperience: toNumberOrUndefined(d.yearsExp),
      languages: (d.languages || []).filter(Boolean),
      photoUrl,
      isPublished: true,
      translations: [{ locale: 'EN', name: d.name, title: d.specialist || '', bio: d.bio || '' }],
      clinicIds: d.clinics || [],
      treatmentIds: (d.treatments || []).map(slug => treatmentIds.get(slug)).filter(Boolean),
      countryIds: (d.countries || []).map(c => countryIds.get(String(c).toUpperCase())).filter(Boolean),
      verticalIds: (d.verticals || []).map(slug => pillarIds.get(slug)).filter(Boolean),
    }
    const existingId = doctorIds.get(d.slug)
    const { data } = existingId
      ? await apiRequest(ApiEndpoints.doctors.adminById(existingId), { method: 'PUT', body })
      : await apiRequest(ApiEndpoints.doctors.adminList, { method: 'POST', body })
    doctorIds.set(data.slug, data.id)
  }

  // Same "write the whole order every save" approach as persistServices.
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
  }
}

async function fetchLocations() {
  const clinics = await fetchAllPages(ApiEndpoints.clinics.adminList)
  clinicRecordIds.clear()
  return clinics.map(clinicToLocation)
}

export const persistLocations = async list => {
  for (const l of list) {
    const body = {
      name: l.name,
      cityId: l.cityId,
      address: l.address || '',
      phone: l.tel || '',
      openingHours: normaliseHours(l.hours),
      lat: toNumberOrUndefined(l.lat) ?? 0,
      lng: toNumberOrUndefined(l.lng) ?? 0,
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
    const body = {
      title: v.title,
      subtitle: v.subtitle || undefined,
      description: v.description || '',
      price: toNumberOrUndefined(v.price) ?? 0,
      currency: v.currency || 'AED',
      type: v.type || 'gift',
      badge: v.badge || undefined,
      badgeStyle: BADGE_STYLE_TO_BACKEND[v.badgeStyle] ?? 'none',
      imageUrl,
      regions: (v.regions || []).map(r => String(r).toUpperCase()),
      redemptionTerms: v.redemptionTerms || undefined,
      isPublished: true,
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
// `treatment` stays the free-text field it already was; it resolves to a
// real id via treatmentIdByName on a best-effort exact-match basis (the
// datalist suggests real names, but nothing forces a match) rather than
// becoming a whole new picker.

const reviewIds = new Map() // client id -> backend id

function reviewToRecord(t) {
  reviewIds.set(t.id, t.id)
  return {
    id: t.id,
    name: t.name,
    location: t.address || '',
    treatment: t.treatment?.title || '',
    quote: t.quote,
    rating: t.rating ?? 5,
    consentGiven: !!t.consentGiven,
    before: t.beforeImgUrl || '',
    after: t.afterImgUrl || '',
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
    const body = {
      name: r.name,
      quote: r.quote,
      rating: toNumberOrUndefined(r.rating) ?? 5,
      treatmentId: treatmentIdByName.get(String(r.treatment || '').toLowerCase().trim()),
      beforeImgUrl: beforeImgUrl || undefined,
      afterImgUrl: afterImgUrl || undefined,
      consentGiven: !!r.consentGiven,
      isPublished: true,
      address: r.location || undefined,
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

async function fetchSiteGroup(groupId) {
  const cfg = SITE_GROUP_CONFIG[groupId]
  const translations = await getSiteGroupTranslations(cfg)
  const en = translations.find(t => t.locale === 'EN')
  return en ? cfg.toDashboard(en.content) : {}
}

export async function persistSiteSection(groupId, sectionId, sectionValue) {
  const cfg = SITE_GROUP_CONFIG[groupId]
  if (!cfg) return notConnected('Site content')

  const translations = await getSiteGroupTranslations(cfg)
  const currentEn = translations.find(t => t.locale === 'EN')
  const currentSections = currentEn ? cfg.toDashboard(currentEn.content) : {}
  const nextSections = { ...currentSections, [sectionId]: sectionValue }
  const nextContent = cfg.toContent(nextSections)

  const nextTranslations = translations.some(t => t.locale === 'EN')
    ? translations.map(t => (t.locale === 'EN' ? { locale: 'EN', content: nextContent } : t))
    : [...translations, { locale: 'EN', content: nextContent }]

  await apiRequest(cfg.endpoint, { method: 'PUT', body: { translations: nextTranslations } })
}

// ── Everything else — not connected yet ───────────────────────────────────

export async function fetchAll() {
  const [verticals, services, doctors, locations, vouchers, reviews, footer, global] = await Promise.all([
    fetchVerticals(), fetchServices(), fetchDoctors(), fetchLocations(), fetchVouchers(), fetchReviews(),
    fetchSiteGroup('footer'), fetchSiteGroup('global'),
  ])
  return {
    services, verticals, doctors, locations, vouchers, reviews,
    site: { footer, global },
    pages: {},
  }
}

export const persistPageSection = () => notConnected('Page content')

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
 * No backend endpoint exists for triggering a site rebuild, and one
 * shouldn't be invented. Mirrors the exact "not configured" message the app
 * already showed before the Supabase Edge Function was deployed.
 */
export async function triggerPublish() {
  return { ok: false, error: "Publishing isn't connected to a backend yet." }
}
