/**
 * Demo records for previewing the dashboard without a database.
 *
 * Builds the exact record shapes the dashboard forms edit, from the original
 * site content in lib/seed-data/. Used only by store-local.js when the API
 * base URL is absent — once it's set, none of this is loaded.
 */
import {
  SERVICES, VERTICALS, VERTICAL_SERVICES, SVC_THUMB, SVC_BADGE, TREATMENT_SERVICES,
} from '@/lib/seed-data/services'
import { DOCTORS } from '@/lib/seed-data/doctors'
import { REVIEWS } from '@/lib/seed-data/reviews'
import { VOUCHERS } from '@/lib/seed-data/vouchers'
import { BLOGS } from '@/lib/seed-data/blogs'
import { TREATMENT_CATEGORIES } from '@/lib/taxonomy'
import { seedLocations, seedPages, seedSite } from './content'

/** slug -> [vertical ids]; a service can sit under several verticals. */
function verticalMap() {
  const map = {}
  for (const [vertical, slugs] of Object.entries(VERTICAL_SERVICES)) {
    for (const slug of slugs) (map[slug] ||= []).push(vertical)
  }
  return map
}

/** slug -> treatment category. */
function categoryMap() {
  const map = {}
  for (const [category, slugs] of Object.entries(TREATMENT_SERVICES)) {
    for (const slug of slugs) map[slug] = category
  }
  return map
}

export function seedServices() {
  const verticals = verticalMap()
  const categories = categoryMap()
  return Object.entries(SERVICES).map(([slug, s]) => ({
    id: slug, // preview mode has no separate backend id — self-referential is enough to skip the delete-on-rename path
    slug,
    name: s.name || '',
    image: '',
    verticals: verticals[slug] || [],
    thumb: SVC_THUMB[slug] || '',
    badge: SVC_BADGE[slug] || '',
    category: categories[slug] || '',
    sub: s.sub || '',
    what: s.what || '',
    mechanism: s.mechanism || '',
    nameAr: '', whatAr: '', mechanismAr: '', benefitsAr: [],
    expect: {
      duration: s.expect?.duration || '',
      sessions: s.expect?.sessions || '',
      interval: s.expect?.interval || '',
    },
    downtime: { level: s.downtime?.level || '', desc: s.downtime?.desc || '' },
    benefits: (s.benefits || []).map(b => ({ i: b.i || '✦', t: b.t || '', d: b.d || '' })),
    suitable: [...(s.suitable || [])],
  }))
}

export function seedVerticals() {
  return VERTICALS.map(v => ({
    id: v.id, label: v.label, hint: v.hint || '', color: v.color || '#6E5A96',
  }))
}

/**
 * Preview mode's Categories, seeded from the site's existing structural
 * taxonomy (lib/taxonomy.js) so the new Categories screen isn't empty before
 * a real backend exists. Against the real API, CategoriesView reads/writes
 * kaya-nest-api's own Category CRUD (KA-30) instead — this seed data never
 * reaches it.
 */
export function seedCategories() {
  return TREATMENT_CATEGORIES.map(c => ({
    id: c.id, // preview mode has no separate backend id — self-referential is enough to skip the delete-on-rename path
    slug: c.id,
    name: c.label,
    description: '',
    nameAr: '',
    descriptionAr: '',
  }))
}

export function seedDoctors() {
  return Object.values(DOCTORS).map(d => ({
    id: d.slug, // preview mode has no separate backend id — self-referential is enough to skip the delete-on-rename path
    slug: d.slug,
    name: d.name || '',
    image: d.image || '',
    specialist: d.specialist || '',
    tagline: d.tagline || '',
    bio: d.bio || '',
    nameAr: '',
    specialistAr: '',
    bioAr: '',
    yearsExp: String(d.yearsExp ?? ''),
    verticals: [...(d.verticals || [])],
    languages: [...(d.languages || [])],
    countries: [...(d.countries || [])],
    clinics: [...(d.clinics || [])],
    treatments: [...(d.treatments || [])],
  }))
}

export function seedReviews() {
  return REVIEWS.map(r => ({
    id: r.id,
    name: r.name || '',
    location: r.location || '',
    treatment: r.treatment || '',
    quote: r.quote || '',
    rating: r.rating || 5,
    consentGiven: true,
    before: r.before || '',
    after: r.after || '',
  }))
}

export function seedBlogs() {
  return BLOGS.map(b => ({
    id: b.id, // preview mode has no separate backend id — self-referential is enough to skip the delete-on-rename path
    slug: b.slug,
    title: b.title || '',
    image: b.image || '',
    content: b.content || '',
    writer: b.writer || '',
    status: b.status || 'draft',
    publishedAt: b.publishedAt || '',
    titleAr: '',
    contentAr: '',
  }))
}

export function seedVouchers() {
  return VOUCHERS.map(v => ({
    id: v.id,
    title: v.title || '',
    subtitle: v.subtitle || '',
    description: v.subtitle || '',
    type: v.category || '',
    badge: v.badge || '',
    badgeStyle: v.badgeStyle || '',
    price: String(v.price ?? ''),
    currency: v.currency || 'AED',
    img: v.img || '',
    redemptionTerms: 'Valid for 6 months from purchase date. Redeemable in-clinic only.',
    // Empty = every market — see CountryFields.
    regions: [],
  }))
}

/**
 * Sample voucher purchase/gift requests (KA-27) — one per status the real
 * VoucherStatus enum defines, against the demo offers above.
 */
export function seedVoucherRequests() {
  const hoursAgo = h => new Date(Date.now() - h * 3600_000).toISOString()
  const offer = id => VOUCHERS.find(v => v.id === id) || VOUCHERS[0]
  const rows = [
    { id: 'vr-1', offerId: 'gift-500', name: 'Mariam Al Suwaidi', status: 'REQUESTED', isGift: false, hours: 2 },
    { id: 'vr-2', offerId: 'indulgence-1000', name: 'Reem Al Farsi', status: 'PAYMENT_LINK_SENT', isGift: true, recipient: 'Layla Al Farsi', hours: 20 },
    { id: 'vr-3', offerId: 'first-visit', name: 'Sara Al Blooshi', status: 'PAID', isGift: false, hours: 30 },
    { id: 'vr-4', offerId: 'wellness-trio', name: 'Aisha Al Nuaimi', status: 'FULFILLED', isGift: true, recipient: 'Noor Al Nuaimi', hours: 96 },
    { id: 'vr-5', offerId: 'gift-500', name: 'Hind Al Marzooqi', status: 'EXPIRED', isGift: false, hours: 400 },
  ]
  return rows.map(r => {
    const o = offer(r.offerId)
    return {
      id: r.id,
      offerId: r.offerId,
      offerTitle: o.title,
      offerPrice: o.price,
      offerCurrency: o.currency,
      purchaserName: r.name,
      purchaserEmail: `${r.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      purchaserPhone: '+971 50 000 0000',
      isGift: r.isGift,
      recipientName: r.recipient || '',
      recipientEmail: r.isGift ? `${(r.recipient || '').toLowerCase().replace(/[^a-z]+/g, '.')}@example.com` : '',
      recipientPhone: '',
      personalMessage: r.isGift ? 'Enjoy your treat!' : '',
      sendVia: 'EMAIL',
      code: r.status === 'FULFILLED' ? 'KAYA-DEMO-CODE' : '',
      status: r.status,
      submittedAt: hoursAgo(r.hours),
    }
  })
}

export { seedLocations, seedPages, seedSite }

/**
 * Sample enquiries, so the inbox has something to demonstrate every status.
 *
 * The contact details are deliberately unassignable — example.com addresses
 * and zero-filled subscriber numbers — so nothing here can be mistaken for, or
 * collide with, a real person's details.
 * Dates are relative to load time, keeping the "3 hours ago" cues sensible
 * whenever the preview is opened.
 */
export function seedRequests() {
  const hoursAgo = h => new Date(Date.now() - h * 3600_000).toISOString()
  return [
    {
      id: 'req-1042', source: 'consultation', status: 'new',
      name: 'Fatima Al Zahra', mobile: '+971 50 000 0001', email: 'fatima@example.com',
      gender: 'Female', country: 'UAE', city: 'Dubai',
      treatmentArea: 'Dermatology', treatment: 'Laser Skin Resurfacing', doctor: 'Dr. Layla Al Mansouri',
      concerns: [], message: 'Available weekday mornings. Prefers a female doctor.',
      createdAt: hoursAgo(3), notes: '',
    },
    {
      id: 'req-1041', source: 'concern', status: 'new',
      name: 'Yousef Rahimi', mobile: '+971 55 000 0002', email: '',
      gender: 'Male', country: 'UAE', city: 'Abu Dhabi',
      treatmentArea: "Men's", treatment: '', doctor: '',
      concerns: ['Hair thinning', 'Receding hairline'],
      message: 'Noticed thinning over the last year — wants to understand options.',
      createdAt: hoursAgo(7), notes: '',
    },
    {
      id: 'req-1039', source: 'consultation', status: 'contacted',
      name: 'Reem Haddad', mobile: '+966 50 000 0003', email: 'reem@example.com',
      gender: 'Female', country: 'KSA', city: 'Riyadh',
      treatmentArea: 'Body Slimming', treatment: 'Cryolipolysis', doctor: 'Dr. Sara Qasim',
      concerns: [], message: '',
      createdAt: hoursAgo(26), notes: 'Called — awaiting her to confirm a Thursday slot.',
    },
    {
      id: 'req-1036', source: 'concern', status: 'contacted',
      name: 'Aisha Noor', mobile: '+971 52 000 0004', email: 'aisha@example.com',
      gender: 'Female', country: 'UAE', city: 'Dubai',
      treatmentArea: 'Wellness & Longevity', treatment: '', doctor: '',
      concerns: ['Low energy', 'Sleep quality'],
      message: 'Interested in the longevity programme and IV therapy.',
      createdAt: hoursAgo(31), notes: 'Sent programme brochure via WhatsApp.',
    },
    {
      id: 'req-1030', source: 'consultation', status: 'booked',
      name: 'Khalid Mansoor', mobile: '+968 91 000 0005', email: 'khalid@example.com',
      gender: 'Male', country: 'Oman', city: 'Muscat',
      treatmentArea: 'Plastic Surgery', treatment: 'Rhinoplasty', doctor: 'Dr. James Whitfield',
      concerns: [], message: '',
      createdAt: hoursAgo(52), notes: 'Consultation booked for 28 Jul, 10:00. Deposit paid.',
    },
    {
      id: 'req-1028', source: 'consultation', status: 'booked',
      name: 'Layla Ibrahim', mobile: '+971 50 000 0006', email: 'layla@example.com',
      gender: 'Female', country: 'UAE', city: 'Dubai',
      treatmentArea: 'Dermatology', treatment: 'Botox & Fillers', doctor: 'Dr. Nadia Ibrahim',
      concerns: [], message: 'First-time patient.',
      createdAt: hoursAgo(74), notes: 'Booked 25 Jul, 15:30.',
    },
    {
      id: 'req-1019', source: 'concern', status: 'closed',
      name: 'Sami Tariq', mobile: '+966 55 000 0007', email: '',
      gender: 'Male', country: 'KSA', city: 'Jeddah',
      treatmentArea: 'Body Slimming', treatment: '', doctor: '',
      concerns: ['Stubborn fat', 'Body contouring'], message: '',
      createdAt: hoursAgo(120), notes: 'Not proceeding for now — follow up in Q4.',
    },
    {
      id: 'req-1014', source: 'consultation', status: 'closed',
      name: 'Mariam Saeed', mobile: '+971 54 000 0008', email: 'mariam@example.com',
      gender: 'Female', country: 'UAE', city: 'Abu Dhabi',
      treatmentArea: 'Dermatology', treatment: 'Chemical Peels', doctor: '',
      concerns: [], message: '',
      createdAt: hoursAgo(168), notes: 'Treatment completed. Happy — left a review.',
    },
  ]
}

/** Demo staff accounts, so User management is populated in preview mode. */
export function seedUsers() {
  return [
    { id: 'demo-admin', email: 'admin@kaya.ae', name: 'Aisha Rahman', title: 'Administrator', role: 'admin' },
    { id: 'demo-editor', email: 'editor@kaya.ae', name: 'Omar Haddad', title: 'Content Editor', role: 'editor' },
  ]
}
