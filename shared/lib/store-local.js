/**
 * localStorage-backed store — the preview backend.
 *
 * Used when the API base URL is absent, so the dashboard is fully usable
 * for design review and testing before a backend exists: every list, form,
 * filter and save works, the data just lives in the browser.
 *
 * It implements the same API as store-api.js, so shared/lib/store.js can
 * swap between them and nothing upstream knows which is in play.
 */
import {
  seedServices, seedVerticals, seedCategories, seedDoctors, seedReviews, seedVouchers,
  seedRequests, seedVoucherRequests, seedLocations, seedPages, seedSite, seedUsers, seedCustomers,
} from '@/shared/lib/demo-seed'
import { REQUEST_STATUS_LABELS, REQUEST_SOURCE_LABELS } from '@/shared/lib/seed'
import { toCsv } from '@/shared/lib/csv'
import { seedTellUs } from '@/shared/lib/tell-us'
import { CUSTOM_PAGES } from '@/shared/lib/seed-data/custom-pages'
import { VOUCHER_STATUS_FLOW, voucherStatusLabel } from '@/shared/lib/voucher-status'
import { toSummary, toMedical, matchesCustomerFilters, buildCustomerCsvColumns, dialCodesFrom } from '@/shared/lib/customers'

const KEYS = {
  services: 'kaya_admin_services_v4',
  verticals: 'kaya_admin_verticals_v4',
  categories: 'kaya_admin_categories_v1',
  doctors: 'kaya_admin_doctors_v2',
  reviews: 'kaya_admin_reviews_v2',
  vouchers: 'kaya_admin_vouchers_v2',
  requests: 'kaya_admin_requests_v2',
  voucherRequests: 'kaya_admin_voucher_requests_v1',
  tellUs: 'kaya_admin_tell_us_v1',
  customPages: 'kaya_admin_custom_pages_v1',
  locations: 'kaya_admin_locations_v3', // v3: Oman's code is OMAN, as on the backend
  countries: 'kaya_admin_countries_v1',
  contacts: 'kaya_admin_contacts_v1',
  customers: 'kaya_admin_customers_v1',
  customerAccess: 'kaya_admin_customer_access_v1',
  users: 'kaya_admin_users_v1',
  pages: 'kaya_admin_pages_v2',
  site: 'kaya_admin_site_v2',
  session: 'kaya_admin_session_v1',
  // Per-country page-copy overrides, keyed by country inside one object.
  overrides: 'kaya_admin_overrides_v1',
  // Which collections this build has seeded — a list of names, not a flag.
  //
  // It began as one boolean meaning "storage is ours", which was wrong twice.
  // v1 was re-read after each seed, so seeding the first collection vouched for
  // every stale one behind it. v2 fixed that but was still global: the login
  // screen alone writes it (it loads the user list), so a collection that was
  // never seeded still counted as deliberate if it happened to be empty — and
  // an empty catalogue then survived every reload.
  //
  // Recording it per collection makes the claim exactly as narrow as the truth:
  // an empty `services` is the user's own doing only if `services` itself was
  // seeded by this build.
  seeded: 'kaya_admin_seeded_v3',
}

const isBrowser = () => typeof window !== 'undefined'

function read(key, fallback) {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or private-mode errors are not worth breaking the UI over */
  }
}

/**
 * The set of collections this build has seeded, snapshotted on first use.
 *
 * Snapshotting matters: seeding one collection adds to the stored list, and
 * re-reading it mid-load would let that write vouch for collections loaded
 * afterwards — the bug this replaced.
 */
let seededAtLoad = null

function wasSeeded(key) {
  if (seededAtLoad === null) {
    const stored = read(KEYS.seeded, null)
    seededAtLoad = new Set(Array.isArray(stored) ? stored : [])
  }
  return seededAtLoad.has(key)
}

/** Record that `key` now holds this build's seed. */
function markSeeded(key) {
  const stored = read(KEYS.seeded, null)
  const list = Array.isArray(stored) ? stored : []
  if (!list.includes(key)) write(KEYS.seeded, [...list, key])
}

/**
 * Load a collection, seeding it on first run.
 *
 * Two kinds of bad state have to be handled, and they need different tests:
 *
 * · A shape the current code doesn't expect (an object where a list belongs,
 *   records missing fields the views read) crashes the render, and a crash
 *   during hydration leaves a blank page with no way back — the Reset button
 *   is inside the tree that just vanished.
 *
 * · An EMPTY list is structurally valid, so it survives that check and leaves
 *   the dashboard showing nothing at all. Emptiness alone can't mean
 *   corruption though: deleting the last record is a legitimate thing to do.
 *   The per-collection seed record settles it — an empty list this build never
 *   seeded is stale and gets replaced; one it did seed is the user's own doing
 *   and is left alone.
 */
function load(key, seed) {
  const existing = read(KEYS[key], null)
  const usable = Array.isArray(existing)
    && existing.every(r => r && typeof r === 'object')
    && (existing.length > 0 || wasSeeded(key))

  if (usable) return existing

  const seeded = seed()
  write(KEYS[key], seeded)
  markSeeded(key)
  return seeded
}

/**
 * Overlay stored content on a fresh seed, four levels deep (group / section
 * / locale / field), so a field the schema has since gained is back-filled
 * rather than missing — including inside whichever locale ('EN'/'AR') a
 * section's content lives under.
 */
function mergeContent(seed, stored) {
  if (!stored || typeof stored !== 'object') return seed
  const out = { ...seed }
  for (const groupId of Object.keys(seed)) {
    const storedGroup = stored[groupId]
    if (!storedGroup || typeof storedGroup !== 'object') continue
    const group = { ...seed[groupId] }
    for (const sectionId of Object.keys(group)) {
      const storedSection = storedGroup[sectionId]
      if (!storedSection || typeof storedSection !== 'object') continue
      const section = { ...group[sectionId] }
      for (const locale of Object.keys(section)) {
        const storedLocale = storedSection[locale]
        if (!storedLocale || typeof storedLocale !== 'object') continue
        const localeFields = { ...section[locale] }
        for (const k of Object.keys(localeFields)) {
          if (storedLocale[k] !== undefined) localeFields[k] = storedLocale[k]
        }
        // A field only the stored copy has (never in the EN seed defaults,
        // e.g. anything typed into AR) still needs to survive the overlay.
        for (const k of Object.keys(storedLocale)) {
          if (!(k in localeFields)) localeFields[k] = storedLocale[k]
        }
        section[locale] = localeFields
      }
      group[sectionId] = section
    }
    out[groupId] = group
  }
  return out
}

function loadTree(key, seed) {
  const merged = mergeContent(seed(), read(KEYS[key], null))
  write(KEYS[key], merged)
  return merged
}

// A touch of latency so loading states are visible in preview rather than
// flashing past — the real backend is never instant either.
const settle = value => new Promise(resolve => setTimeout(() => resolve(value), 180))

/** Demo Country records, shaped like the real admin API's CountryAdminResponseDto. Cities are derived from seedLocations so the clinic form's dropdowns line up with the demo clinics. Contact is read-only here — see seedContacts. */
function seedCountries() {
  const citiesByCountry = new Map()
  seedLocations().forEach(l => {
    if (!citiesByCountry.has(l.country)) citiesByCountry.set(l.country, new Map())
    citiesByCountry.get(l.country).set(l.cityId, l.city)
  })
  const toCities = code => [...(citiesByCountry.get(code) || new Map())].map(([id, name]) => ({ id, name }))

  return [
    {
      id: 'UAE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', code: 'UAE',
      isoCode: 'AE', dialCode: '+971', flagUrl: '', preferredLanguage: 'EN', displayOrder: 1,
      contact: { id: 'contact-UAE', phoneNumber: '+97144501001', secondaryPhoneNumber: '', whatsappNumber: '+971501234567' },
      cities: toCities('UAE'),
    },
    {
      id: 'KSA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', code: 'KSA',
      isoCode: 'SA', dialCode: '+966', flagUrl: '', preferredLanguage: 'AR', displayOrder: 2,
      contact: { id: 'contact-KSA', phoneNumber: '+966114650000', secondaryPhoneNumber: '', whatsappNumber: '+966501234567' },
      cities: toCities('KSA'),
    },
    {
      id: 'OMAN', name: 'Oman', nameAr: 'عُمان', code: 'OMAN',
      isoCode: 'OM', dialCode: '+968', flagUrl: '', preferredLanguage: 'AR', displayOrder: 3,
      contact: null,
      cities: toCities('OMAN'),
    },
  ]
}

/** Demo Contact records — one per country that has a contact, shaped like ContactAdminResponseDto. */
function seedContacts() {
  return seedCountries()
    .filter(c => c.contact)
    .map(c => ({
      id: c.contact.id,
      countryId: c.id,
      countryName: c.name,
      countryCode: c.code,
      phoneNumber: c.contact.phoneNumber,
      secondaryPhoneNumber: c.contact.secondaryPhoneNumber,
      whatsappNumber: c.contact.whatsappNumber,
    }))
}

// ── Reads ───────────────────────────────────────────────────
export async function fetchAll() {
  return settle({
    services: load('services', seedServices),
    verticals: load('verticals', seedVerticals),
    categories: load('categories', seedCategories),
    doctors: load('doctors', seedDoctors),
    reviews: load('reviews', seedReviews),
    vouchers: load('vouchers', seedVouchers),
    locations: load('locations', seedLocations),
    countries: load('countries', seedCountries),
    contacts: load('contacts', seedContacts),
    pages: loadTree('pages', seedPages),
    site: loadTree('site', seedSite),
  })
}

// ── Customers (website accounts) ────────────────────────────
// Health data never leaves this section except through revealCustomerMedical,
// which records who looked — see shared/lib/customers.js.

const loadCustomers = () => load('customers', seedCustomers)
const demoDialCodes = () => dialCodesFrom(load('countries', seedCountries))

function filteredCustomers(filters) {
  const dialCodes = demoDialCodes()
  return loadCustomers()
    .filter(c => matchesCustomerFilters(c, filters, dialCodes))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function fetchCustomersPage({ page = 1, pageSize = 20, ...filters } = {}) {
  const all = filteredCustomers(filters)
  const start = (page - 1) * pageSize
  return settle({ items: all.slice(start, start + pageSize).map(toSummary), total: all.length, page, pageSize })
}

export async function fetchCustomerCounts() {
  const all = loadCustomers()
  return settle({
    total: all.length,
    disabled: all.filter(c => c.status === 'DISABLED').length,
    withConsent: all.filter(c => c.healthConsentAt).length,
    newThisWeek: all.filter(c => Date.now() - new Date(c.createdAt).getTime() < 7 * 86400_000).length,
  })
}

export async function fetchCustomer(id) {
  const c = loadCustomers().find(x => x.id === id)
  if (!c) throw new Error('This customer no longer exists.')
  return settle(toSummary(c))
}

/**
 * The medical record, logged. `staff` is the signed-in dashboard user — the
 * real backend takes that from the access token instead.
 */
export async function revealCustomerMedical(id, staff) {
  const c = loadCustomers().find(x => x.id === id)
  if (!c) throw new Error('This customer no longer exists.')
  const log = read(KEYS.customerAccess, [])
  const entry = { customerId: id, staffId: staff?.id || '', staffName: staff?.name || 'Unknown', at: new Date().toISOString() }
  write(KEYS.customerAccess, [entry, ...(Array.isArray(log) ? log : [])].slice(0, 500))
  return settle(c.healthConsentAt ? toMedical(c) : null)
}

export async function fetchCustomerAccessLog(id) {
  const log = read(KEYS.customerAccess, [])
  return settle((Array.isArray(log) ? log : []).filter(e => e.customerId === id))
}

export async function setCustomerStatus(id, status) {
  write(KEYS.customers, loadCustomers().map(c => (c.id === id ? { ...c, status } : c)))
  return fetchCustomer(id)
}

export async function removeCustomer(id) {
  write(KEYS.customers, loadCustomers().filter(c => c.id !== id))
  const log = read(KEYS.customerAccess, [])
  write(KEYS.customerAccess, (Array.isArray(log) ? log : []).filter(e => e.customerId !== id))
}

export async function exportCustomersCsv(filters) {
  return settle(toCsv(filteredCustomers(filters).map(toSummary), buildCustomerCsvColumns(demoDialCodes())))
}

/** Clinic options for DoctorForm's Clinics checkboxes — preview mode's stand-in for the real /admin/clinics list. */
export async function fetchClinicOptions() {
  const locations = load('locations', seedLocations)
  return settle(locations.map(l => ({ id: l.id, name: l.name })))
}

/** One service — preview mode's stand-in for GET /admin/treatments/:id. */
export async function fetchService(slug) {
  const s = load('services', seedServices).find(x => x.slug === slug)
  if (!s) throw new Error('This service no longer exists.')
  return settle(s)
}

/** One clinic — preview mode's stand-in for GET /admin/clinics/:id. */
export async function fetchLocation(id) {
  const l = load('locations', seedLocations).find(x => x.id === id)
  if (!l) throw new Error('This clinic no longer exists.')
  return settle(l)
}

/** Save one clinic — replaces the row keyed `originalId`, or appends a new one. */
export async function persistLocation(record, originalId) {
  const list = load('locations', seedLocations)
  const exists = originalId != null && list.some(l => l.id === originalId)
  write(KEYS.locations, exists ? list.map(l => (l.id === originalId ? record : l)) : [...list, record])
  return settle(record)
}

/** Country + its cities, for LocationForm's Country/City selects — same shape as fetchRequestCountries. */
export async function fetchCountryOptions() {
  return fetchRequestCountries()
}

/** Preview mode's stand-in for adding a city — nothing to persist beyond the form remembering it for this session. */
export async function createCity(countryId, name, nameAr = '') {
  return settle({ id: name, name, nameAr })
}

export async function updateCity(cityId, { name, nameAr }) {
  return settle({ id: cityId, name, nameAr: nameAr || '' })
}

/** Country overrides: { UAE: {...}, KSA: {...} } — sparse by design. */
export async function fetchOverrides() {
  const stored = read(KEYS.overrides, null)
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
}

/** Save one country's overrides for one section, mirroring the real API's shape. */
export async function persistOverrideSection(country, groupId, sectionId, data) {
  const all = read(KEYS.overrides, null) || {}
  const forCountry = { ...(all[country] || {}) }
  const group = { ...(forCountry[groupId] || {}) }

  if (data && Object.keys(data).length) group[sectionId] = data
  else delete group[sectionId]

  if (Object.keys(group).length) forCountry[groupId] = group
  else delete forCountry[groupId]

  if (Object.keys(forCountry).length) all[country] = forCountry
  else delete all[country]

  write(KEYS.overrides, all)
}

// ── Writes ──────────────────────────────────────────────────
const persist = key => async list => { write(KEYS[key], list) }

export const persistServices = persist('services')
export const persistVerticals = persist('verticals')
export const persistCategories = persist('categories')
export const persistDoctors = persist('doctors')
export const persistReviews = persist('reviews')
export const persistVouchers = persist('vouchers')
export const persistCustomPages = persist('customPages')
export const persistLocations = persist('locations')
export const persistCountries = persist('countries')
export const persistContacts = persist('contacts')

// localStorage has no per-field validation to trip over on a full resave, so
// reordering is just the same whole-list write as persist(...) — these exist
// only so callers (AdminContext's deleteFrom) don't need to know which
// backend is in play.
export const reorderServices = persistServices
export const reorderCategories = persistCategories
export const reorderDoctors = persistDoctors
export const reorderVouchers = persistVouchers

/**
 * Remove one record. The dashboard always persists the surviving list straight
 * afterwards, so this only has to drop the row.
 */
const remove = (key, field) => async value => {
  write(KEYS[key], load(key, () => []).filter(r => r[field] !== value))
}

export const removeService = remove('services', 'slug')
export const removeVertical = remove('verticals', 'id')
export const removeCategory = remove('categories', 'slug')
export const removeDoctor = remove('doctors', 'slug')
export const removeReview = remove('reviews', 'id')
export const removeVoucher = remove('vouchers', 'id')
export const removeCustomPage = remove('customPages', 'id')
export const removeLocation = remove('locations', 'id')
export const removeCountry = remove('countries', 'id')
export const removeContact = remove('contacts', 'id')

export async function persistPageSection(pageId, sectionId, data) {
  const tree = loadTree('pages', seedPages)
  write(KEYS.pages, { ...tree, [pageId]: { ...tree[pageId], [sectionId]: data } })
}

export async function persistSiteSection(groupId, sectionId, data) {
  const tree = loadTree('site', seedSite)
  write(KEYS.site, { ...tree, [groupId]: { ...tree[groupId], [sectionId]: data } })
}

// ── Requests (consumer submissions) ──────────────────────────
//
// Mirrors store-api.js's contract exactly, but filters/paginates in memory
// over the same array `fetchAll()` already seeds — there's no real query to
// send, so this is just the array operations the backend would otherwise do.

/**
 * A phone search ignores formatting, so "+971500000001" finds "+971 50 000
 * 0001" — how a customer's profile looks up their enquiries.
 */
function phoneDigitsMatch(phone, query) {
  const want = String(query).replace(/\D/g, '')
  return want.length >= 7 && String(phone || '').replace(/\D/g, '').includes(want)
}

function matchesRequestFilters(r, { search, source, status, country, city, from, to } = {}) {
  if (status && r.status !== status) return false
  if (source && r.source !== source) return false
  if (country && r.country !== country) return false
  if (city && r.city !== city) return false
  if (from || to) {
    const at = new Date(r.createdAt).getTime()
    if (Number.isFinite(at)) {
      if (from && at < new Date(from).getTime()) return false
      if (to && at > new Date(to).getTime()) return false
    }
  }
  if (search) {
    const q = search.trim().toLowerCase()
    const hay = `${r.name} ${r.mobile} ${r.email} ${r.city} ${r.treatmentArea} ${r.treatment} ${r.doctor} ${(r.concerns || []).join(' ')}`.toLowerCase()
    if (!hay.includes(q) && !phoneDigitsMatch(r.mobile, q)) return false
  }
  return true
}

function filteredRequests(filters) {
  return load('requests', seedRequests)
    .filter(r => matchesRequestFilters(r, filters))
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function fetchRequestsPage({ page = 1, pageSize = 20, ...filters } = {}) {
  const all = filteredRequests(filters)
  const start = (page - 1) * pageSize
  return settle({ items: all.slice(start, start + pageSize), total: all.length, page, pageSize })
}

export async function fetchRequestStatusCounts() {
  const all = load('requests', seedRequests)
  const counts = { new: 0, contacted: 0, booked: 0, closed: 0, total: all.length }
  all.forEach(r => { if (counts[r.status] != null) counts[r.status] += 1 })
  return settle(counts)
}

/** Demo country list, shaped like the real API's — derived from whatever the seed data contains. */
export async function fetchRequestCountries() {
  const byCountry = new Map()
  load('requests', seedRequests).forEach(r => {
    if (!r.country) return
    if (!byCountry.has(r.country)) byCountry.set(r.country, new Set())
    if (r.city) byCountry.get(r.country).add(r.city)
  })
  return settle([...byCountry.entries()].map(([name, cities]) => ({
    id: name, name, code: name, cities: [...cities].map(c => ({ id: c, name: c })),
  })))
}

export async function persistRequestStatus(id, status) {
  const list = load('requests', seedRequests)
  const next = list.map(r => (r.id === id ? { ...r, status } : r))
  write(KEYS.requests, next)
  return settle(next.find(r => r.id === id))
}

export async function persistRequestNotes(id, notes) {
  const list = load('requests', seedRequests)
  const next = list.map(r => (r.id === id ? { ...r, notes } : r))
  write(KEYS.requests, next)
  return settle(next.find(r => r.id === id))
}

export async function removeRequestRecord(id) {
  write(KEYS.requests, load('requests', seedRequests).filter(r => r.id !== id))
}

// ── Voucher requests: the same flow rules the backend enforces ──
const voucherNext = status => VOUCHER_STATUS_FLOW.find(f => f.status === status)?.next || []

/** Issued vouchers past their expiry date become Expired, as on the backend. */
function loadVoucherRequests() {
  const now = Date.now()
  let changed = false
  const list = load('voucherRequests', seedVoucherRequests).map(v => {
    if (v.status === 'FULFILLED' && v.expiresAt && new Date(v.expiresAt).getTime() < now) {
      changed = true
      return { ...v, status: 'EXPIRED' }
    }
    return v
  })
  if (changed) write(KEYS.voucherRequests, list)
  return list.map(v => ({ ...v, allowedNextStatuses: voucherNext(v.status) }))
}

function demoVoucherCode() {
  const pick = () => Array.from({ length: 4 }, () => '2346789ABCDEFGHJKMNPQRTUVWXYZ'[Math.floor(Math.random() * 29)]).join('')
  return `KAYA-${pick()}-${pick()}`
}

function addMonths(date, months) {
  const d = new Date(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d.toISOString()
}

function saveVoucherRequest(updated) {
  const list = load('voucherRequests', seedVoucherRequests)
  write(KEYS.voucherRequests, list.map(v => (v.id === updated.id ? updated : v)))
  return { ...updated, allowedNextStatuses: voucherNext(updated.status) }
}

export async function fetchVoucherStatuses() {
  return settle(VOUCHER_STATUS_FLOW)
}

export async function findVoucherByCode(code) {
  // Same rule as the backend: spaces, hyphens or none between the blocks.
  const upper = code.trim().toUpperCase()
  const blocks = upper.replace(/[^A-Z0-9]/g, '')
  const wanted = /^KAYA[A-Z0-9]{8}$/.test(blocks)
    ? `KAYA-${blocks.slice(4, 8)}-${blocks.slice(8)}`
    : upper.replace(/[\s_]+/g, '-')
  const found = loadVoucherRequests().find(v => v.code && v.code.toUpperCase() === wanted)
  if (!found) throw new Error('No voucher has this code — check it was typed correctly.')
  return settle(found)
}

export async function redeemVoucher(id) {
  const v = loadVoucherRequests().find(x => x.id === id)
  if (!v) throw new Error('Voucher not found')
  if (v.status === 'REDEEMED') throw new Error('This voucher was already redeemed.')
  if (v.status === 'EXPIRED') throw new Error('This voucher has expired.')
  if (v.status === 'CANCELLED') throw new Error('This voucher was cancelled.')
  if (v.status !== 'FULFILLED') throw new Error('This voucher hasn’t been issued yet — it must be paid and issued before it can be redeemed.')
  const now = new Date().toISOString()
  return settle(saveVoucherRequest({ ...v, status: 'REDEEMED', redeemedAt: now, statusUpdatedAt: now }))
}

function filteredVoucherRequests({ search, status, customerId } = {}) {
  return loadVoucherRequests()
    .filter(v => {
      if (customerId && v.customerId !== customerId) return false
      if (status && v.status !== status) return false
      if (search) {
        const q = search.trim().toLowerCase()
        const hay = `${v.purchaserName} ${v.purchaserEmail} ${v.purchaserPhone}`.toLowerCase()
        if (!hay.includes(q) && !phoneDigitsMatch(v.purchaserPhone, q)) return false
      }
      return true
    })
    .slice()
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
}

/** Pages built in the page builder — one sample page in preview mode. */
export async function fetchCustomPages() {
  return settle(load('customPages', () => JSON.parse(JSON.stringify(CUSTOM_PAGES))))
}

/**
 * The Tell Us Everything questionnaire — one document, not a list. Seeded
 * with what the website used to hard-code (see seedTellUs).
 */
export async function fetchTellUs() {
  const stored = read(KEYS.tellUs, null)
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) return settle(stored)
  const seeded = seedTellUs()
  write(KEYS.tellUs, seeded)
  return settle(seeded)
}

export async function persistTellUs(doc) {
  write(KEYS.tellUs, doc)
  return settle(doc)
}

export async function fetchVoucherRequest(id) {
  const found = loadVoucherRequests().find(v => v.id === id)
  if (!found) throw new Error('Voucher not found')
  return settle(found)
}

export async function fetchVoucherRequestsPage({ page = 1, pageSize = 20, ...filters } = {}) {
  const all = filteredVoucherRequests(filters)
  const start = (page - 1) * pageSize
  return settle({ items: all.slice(start, start + pageSize), total: all.length, page, pageSize })
}

export async function persistVoucherRequestStatus(id, status) {
  const v = loadVoucherRequests().find(x => x.id === id)
  if (!v) throw new Error('Voucher not found')
  if (!voucherNext(v.status).includes(status)) {
    throw new Error(`Can't move a voucher from ${voucherStatusLabel(v.status)} to ${voucherStatusLabel(status)}.`)
  }
  const now = new Date().toISOString()
  const issuing = status === 'FULFILLED'
  const validity = load('vouchers', seedVouchers).find(o => o.title === v.offerTitle)?.validityMonths ?? 6
  return settle(saveVoucherRequest({
    ...v,
    status,
    statusUpdatedAt: now,
    ...(issuing ? { code: demoVoucherCode(), expiresAt: addMonths(now, Number(validity) || 6) } : {}),
  }))
}

export async function removeVoucherRequestRecord(id) {
  write(KEYS.voucherRequests, load('voucherRequests', seedVoucherRequests).filter(v => v.id !== id))
}

export async function exportRequestsCsv(filters) {
  const rows = filteredRequests(filters)
  return toCsv(rows, [
    { header: 'Received', value: r => r.createdAt },
    { header: 'Status', value: r => REQUEST_STATUS_LABELS[r.status] || r.status },
    { header: 'Source', value: r => REQUEST_SOURCE_LABELS[r.source] || r.source },
    { header: 'Name', value: r => r.name },
    { header: 'Mobile', value: r => r.mobile },
    { header: 'Email', value: r => r.email },
    { header: 'Gender', value: r => r.gender },
    { header: 'Country', value: r => r.country },
    { header: 'City', value: r => r.city },
    { header: 'Treatment area', value: r => r.treatmentArea },
    { header: 'Treatment', value: r => r.treatment },
    { header: 'Doctor', value: r => r.doctor },
    { header: 'Concerns', value: r => r.concerns },
    { header: 'Tell Us answers', value: r => (r.answers || []).map(a => `${a.question} ${(a.answers || []).join(', ')}`) },
    { header: 'Message', value: r => r.message },
    { header: 'Internal note', value: r => r.notes },
  ])
}

/**
 * Record an enquiry from the public site. In preview mode this only reaches the
 * same browser's storage — enough to demonstrate the flow end to end.
 */
export async function submitRequest(record) {
  if (!isBrowser()) return { ok: false, error: 'Not available server-side.' }
  const list = load('requests', seedRequests)
  const id = `req-${Math.random().toString(36).slice(2, 10)}`
  write(KEYS.requests, [
    { ...record, id, status: 'new', notes: '', createdAt: new Date().toISOString() },
    ...list,
  ])
  return { ok: true }
}

// ── Users ───────────────────────────────────────────────────
export async function fetchUsers() {
  return settle(load('users', seedUsers))
}

export async function updateUserRole(id, role) {
  write(KEYS.users, load('users', seedUsers).map(u => (u.id === id ? { ...u, role } : u)))
}

const ROLE_TITLE = { admin: 'Administrator', editor: 'Content Editor' }

/** Preview mode's stand-in for sending a real invite — adds the account directly rather than waiting on an accept step that doesn't exist here. */
export async function inviteStaffUser({ name, email, role, country = '' }) {
  const list = load('users', seedUsers)
  const id = `demo-${Date.now()}`
  write(KEYS.users, [...list, { id, name, email, role, country, title: ROLE_TITLE[role] || role }])
  return settle({ id })
}

export async function updateStaffCountry(id, country) {
  const next = load('users', seedUsers).map(u => (u.id === id ? { ...u, country: country || '' } : u))
  write(KEYS.users, next)
  return settle(next.find(u => u.id === id))
}

// ── Preview session ─────────────────────────────────────────
// Stands in for real authentication: any of the demo accounts signs in, with
// no password check. Only ever reachable when the API base URL is not set.

/**
 * A session stored by an earlier build may be missing fields the shell renders
 * (`user.name.charAt(0)` in the topbar, for one). Treat anything that isn't a
 * complete record as signed-out — showing the login screen is recoverable,
 * crashing on a half-built user is not.
 */
export function loadSession() {
  const s = read(KEYS.session, null)
  if (!s || typeof s !== 'object') return null
  if (typeof s.name !== 'string' || typeof s.role !== 'string') return null
  return s
}

export function saveSession(user) {
  write(KEYS.session, user)
}

export function clearSession() {
  if (isBrowser()) window.localStorage.removeItem(KEYS.session)
}

export function demoUsers() {
  return load('users', seedUsers)
}

/** Reset every preview collection back to its seed. */
export function resetDemo() {
  if (!isBrowser()) return
  // Retired markers from previous builds — clear them so they can't linger.
  for (const old of ['kaya_admin_seeded_v1', 'kaya_admin_seeded_v2']) {
    try { window.localStorage.removeItem(old) } catch { /* ignore */ }
  }
  for (const key of Object.keys(KEYS)) {
    if (key === 'session') continue
    window.localStorage.removeItem(KEYS[key])
  }
  // Nothing is seeded any more; without clearing the snapshot it would keep
  // vouching for collections we just wiped.
  seededAtLoad = new Set()
}
