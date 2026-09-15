/**
 * localStorage-backed store — the preview backend.
 *
 * Used when the API base URL is absent, so the dashboard is fully usable
 * for design review and testing before a backend exists: every list, form,
 * filter and save works, the data just lives in the browser.
 *
 * It implements the same API as store-api.js, so lib/admin/store.js can
 * swap between them and nothing upstream knows which is in play.
 */
import {
  seedServices, seedVerticals, seedDoctors, seedReviews, seedVouchers,
  seedRequests, seedLocations, seedPages, seedSite, seedUsers,
} from './demo-seed'
import { REQUEST_STATUS_LABELS, REQUEST_SOURCE_LABELS } from './seed'
import { toCsv } from './csv'

const KEYS = {
  services: 'kaya_admin_services_v4',
  verticals: 'kaya_admin_verticals_v4',
  doctors: 'kaya_admin_doctors_v2',
  reviews: 'kaya_admin_reviews_v2',
  vouchers: 'kaya_admin_vouchers_v2',
  requests: 'kaya_admin_requests_v2',
  locations: 'kaya_admin_locations_v2',
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
 * Overlay stored content on a fresh seed, three levels deep, so a field the
 * schema has since gained is back-filled rather than missing.
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
      for (const k of Object.keys(section)) {
        if (storedSection[k] !== undefined) section[k] = storedSection[k]
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

// ── Reads ───────────────────────────────────────────────────
export async function fetchAll() {
  return settle({
    services: load('services', seedServices),
    verticals: load('verticals', seedVerticals),
    doctors: load('doctors', seedDoctors),
    reviews: load('reviews', seedReviews),
    vouchers: load('vouchers', seedVouchers),
    locations: load('locations', seedLocations),
    pages: loadTree('pages', seedPages),
    site: loadTree('site', seedSite),
  })
}

/** Clinic options for DoctorForm's Clinics checkboxes — preview mode's stand-in for the real /admin/clinics list. */
export async function fetchClinicOptions() {
  const locations = load('locations', seedLocations)
  return settle(locations.map(l => ({ id: l.id, name: l.name })))
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
export const persistDoctors = persist('doctors')
export const persistReviews = persist('reviews')
export const persistVouchers = persist('vouchers')
export const persistLocations = persist('locations')

/**
 * Remove one record. The dashboard always persists the surviving list straight
 * afterwards, so this only has to drop the row.
 */
const remove = (key, field) => async value => {
  write(KEYS[key], load(key, () => []).filter(r => r[field] !== value))
}

export const removeService = remove('services', 'slug')
export const removeVertical = remove('verticals', 'id')
export const removeDoctor = remove('doctors', 'slug')
export const removeReview = remove('reviews', 'id')
export const removeVoucher = remove('vouchers', 'id')
export const removeLocation = remove('locations', 'id')

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
    if (!hay.includes(q)) return false
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
