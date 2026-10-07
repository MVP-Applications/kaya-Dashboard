
/**
 * Option lists and blank records for the dashboard forms.
 *
 * Records themselves now come from the backend (see shared/lib/store.js). What
 * remains here is the fixed vocabulary the forms offer — thumbnail keys, badge
 * styles, enquiry statuses — plus the empty records the "create" forms start
 * from. The original demo content moved to shared/lib/seed-data/, which also backs
 * preview mode (see shared/lib/demo-seed.js).
 */

// Voucher classification (the indulgence page filters).
export const VOUCHER_TYPE_OPTIONS = ['discount', 'gift', 'wellness']
// Visual badge styles used on voucher cards.
export const BADGE_STYLE_OPTIONS = ['', 'popular', 'new', 'trending']

// Thumbnail keys used across the site (SVC_THUMB values).
export const THUMB_OPTIONS = ['laser', 'filler', 'antiage', 'hair', 'bodyc', 'iv']

// Badge is a fixed enum on the backend (TreatmentBadge) — `value` is the
// enum key that gets sent/read from the API, `label` is what the picker
// shows. The website resolves each key to a localized (EN/AR) display
// label itself; this dropdown only ever deals in the raw key.
export const BADGE_OPTIONS = [
  { value: '', label: '— none —' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'POPULAR', label: 'Popular' },
  { value: 'NEW', label: 'New' },
]

/**
 * An empty doctor record for the "create" form.
 *
 * No `tagline` — kaya-nest-api's Doctor model has no column for it (KA-33).
 * `nameAr`/`specialistAr`/`bioAr` are optional — filling in all three adds
 * an Arabic translation, leaving any blank keeps the doctor EN-only.
 */
export function emptyDoctor() {
  return {
    id: '', // set once the backend assigns one — see AdminContext's upsertInto
    slug: '',
    name: '',
    image: '',
    specialist: '',
    bio: '',
    nameAr: '',
    specialistAr: '',
    bioAr: '',
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
 * `image`/`thumb`/`category`/`downtimeLevel` map to the backend's
 * `imageUrl`/`icon`/`categoryId`/`downtimeSeverity` (KA-30); `sub`/`suitable`
 * and each benefit's `i`/`t` are the EN half of the per-locale
 * `subtitle`/`suitableFor`/`benefits` — see `subAr`/`suitableAr` for Arabic.
 */
export function emptyService() {
  return {
    id: '', // set once the backend assigns one — see AdminContext's upsertInto
    slug: '',
    name: '',
    image: '',
    thumb: '',
    category: '',
    verticals: [],
    badge: '',
    sub: '',
    what: '',
    mechanism: '',
    durationMins: '',
    sessions: '',
    downtimeNotes: '',
    downtimeLevel: '',
    suitable: [],
    benefits: [],
    nameAr: '',
    subAr: '',
    whatAr: '',
    mechanismAr: '',
    suitableAr: [],
    benefitsAr: [],
  }
}

/** An empty category record for the "create" form. */
export function emptyCategory() {
  return {
    id: '', // set once the backend assigns one — see AdminContext's upsertInto
    slug: '',
    name: '',
    description: '',
    nameAr: '',
    descriptionAr: '',
  }
}

/** No `vertical` — kaya-nest-api's Testimonial links to a Treatment, never a Pillar. See KA-38. */
// Blog post lifecycle. Only `published` posts dated today or earlier appear
// on the website (the backend stores it as isPublished + publishedAt).
export const BLOG_STATUS_OPTIONS = ['draft', 'published']
export const BLOG_STATUS_LABELS = { draft: 'Draft', published: 'Published' }

/**
 * An empty blog post for the "create" form. English title, excerpt and body
 * are required; the `…Ar` fields add an Arabic version. `body`/`bodyAr` are
 * ordered blocks: [{ type: 'p' | 'h2' | 'quote', text }]. The writer is a
 * doctor (`authorDoctorId`) or, failing that, a typed `authorName`.
 */
export function emptyBlog() {
  return {
    id: '', // set once the backend assigns one — see AdminContext's upsertInto
    slug: '',
    title: '', titleAr: '',
    excerpt: '', excerptAr: '',
    body: [{ type: 'p', text: '' }], bodyAr: [],
    image: '',
    categoryId: '',
    authorDoctorId: '',
    authorName: '',
    status: 'draft',
    publishedAt: '',
    featured: false,
    countries: [],
    readMins: null,
    // Search engines — every field optional; the website falls back to the
    // title / excerpt / cover.
    metaTitle: '', metaTitleAr: '',
    metaDescription: '', metaDescriptionAr: '',
    keywords: [], keywordsAr: [],
    ogTitle: '', ogTitleAr: '',
    ogDescription: '', ogDescriptionAr: '',
    ogImage: '',
    canonicalUrl: '',
    noIndex: false,
  }
}

/** A blog topic (the website's filter chips). Shared by every country. */
export function emptyBlogCategory() {
  return { id: '', slug: '', name: '', nameAr: '', postCount: 0 }
}

export function emptyReview() {
  return {
    id: '',
    name: '',
    location: '',
    country: '',
    treatment: '',
    quote: '',
    rating: 5,
    consentGiven: false,
    before: '',
    after: '',
    nameAr: '',
    locationAr: '',
    quoteAr: '',
  }
}

/**
 * `price`/`currency` is the default; `pricing` holds per-country prices
 * (kaya-nest-api's IndulgenceOffer `prices`). `regions` is CountryFields'
 * `countries` under the backend's own name — where the offer is available.
 */
export function emptyVoucher() {
  return {
    id: '',
    title: '',
    subtitle: '',
    description: '',
    type: 'gift',
    badge: '',
    badgeStyle: '',
    price: '',
    currency: 'AED',
    regions: [],
    // Per-country prices, { [countryCode]: { price, currency } }; blank = default price.
    pricing: {},
    validityMonths: 6,
    isPublished: true,
    redemptionTerms: '',
    img: '',
    titleAr: '',
    subtitleAr: '',
    descriptionAr: '',
    badgeAr: '',
    redemptionTermsAr: '',
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
