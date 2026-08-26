import { emptyPricing } from '@/lib/countries'

/**
 * Option lists and blank records for the dashboard forms.
 *
 * Records themselves now come from the backend (see lib/admin/store.js). What
 * remains here is the fixed vocabulary the forms offer — thumbnail keys, badge
 * styles, enquiry statuses — plus the empty records the "create" forms start
 * from. The original demo content moved to lib/seed-data/, which also backs
 * preview mode (see lib/admin/demo-seed.js).
 */

// Re-exported so the many views already importing it keep working; the list
// itself now lives in lib/countries.js.
export { COUNTRY_IDS as COUNTRY_OPTIONS } from '@/lib/countries'

// Voucher classification (the indulgence page filters).
export const VOUCHER_TYPE_OPTIONS = ['discount', 'gift', 'wellness']
// Visual badge styles used on voucher cards.
export const BADGE_STYLE_OPTIONS = ['', 'popular', 'new', 'trending']

// Thumbnail keys used across the site (SVC_THUMB values).
export const THUMB_OPTIONS = ['laser', 'filler', 'antiage', 'hair', 'bodyc', 'iv']

// Badge options (SVC_BADGE values), plus an explicit "none".
export const BADGE_OPTIONS = ['', 'Trending', 'Popular', 'New']

/** An empty doctor record for the "create" form. */
export function emptyDoctor() {
  return {
    slug: '',
    name: '',
    image: '',
    specialist: '',
    tagline: '',
    bio: '',
    yearsExp: '',
    verticals: [],
    languages: [],
    countries: [],
    clinics: [],
    treatments: [],
  }
}

/**
 * An empty service (Treatment) record for the "create" form.
 *
 * Trimmed to exactly what kaya-nest-api's Treatment model stores — see
 * KA-30 for the fields the old form had (image, thumb, category, per-country
 * pricing, "suitable for", a structured icon+title+desc benefits shape) that
 * have no backend column and were dropped rather than left editable-but-lossy.
 */
export function emptyService() {
  return {
    slug: '',
    name: '',
    verticals: [],
    badge: '',
    what: '',
    mechanism: '',
    durationMins: '',
    sessions: '',
    downtimeNotes: '',
    benefits: [],
  }
}

export function emptyReview() {
  return {
    id: '',
    name: '',
    location: '',
    treatment: '',
    vertical: '',
    quote: '',
    before: '',
    after: '',
  }
}

export function emptyVoucher() {
  return {
    id: '',
    title: '',
    subtitle: '',
    type: 'gift',
    badge: '',
    badgeStyle: '',
    // `price`/`currency` remain the single-country values the public site still
    // reads; `pricing` carries the per-country figures.
    price: '',
    currency: 'AED',
    pricing: emptyPricing(),
    countries: [],
    img: '',
  }
}

// ── Requests (consumer submissions) ──────────────────────
// Inbound enquiries from the public site. Two sources feed this list:
//  · 'consultation' — the /booking form (name, treatment area, doctor, city)
//  · 'concern'      — the /tell-us concern finder (area, age, concerns)
// Staff don't create these; they arrive from the site and move through a
// lifecycle: new → contacted → booked → closed.
export const REQUEST_STATUS_OPTIONS = ['new', 'contacted', 'booked', 'closed']
export const REQUEST_SOURCE_OPTIONS = ['consultation', 'concern']

export const REQUEST_STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  booked: 'Booked',
  closed: 'Closed',
}

export const REQUEST_SOURCE_LABELS = {
  consultation: 'Consultation request',
  concern: 'Concern finder',
}
