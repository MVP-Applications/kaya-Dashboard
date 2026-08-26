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

/** An empty service record for the "create" form. */
export function emptyService() {
  return {
    slug: '',
    name: '',
    image: '',
    verticals: [],
    thumb: 'laser',
    badge: '',
    category: 'dermatology',
    // Which countries offer this treatment. Empty means everywhere — a new
    // service is available by default rather than invisible until configured.
    countries: [],
    // Per-country price. A country left blank falls back to hiding the price
    // rather than showing another country's figure.
    pricing: emptyPricing(),
    sub: '',
    what: '',
    mechanism: '',
    expect: { duration: '', sessions: '', interval: '' },
    downtime: { level: '', desc: '' },
    benefits: [],
    suitable: [],
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
