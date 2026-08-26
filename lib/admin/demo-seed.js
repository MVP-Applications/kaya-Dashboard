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

export function seedDoctors() {
  return Object.values(DOCTORS).map(d => ({
    slug: d.slug,
    name: d.name || '',
    image: d.image || '',
    specialist: d.specialist || '',
    tagline: d.tagline || '',
    bio: d.bio || '',
    yearsExp: String(d.yearsExp ?? ''),
    verticals: [...(d.verticals || [])],
    languages: [...(d.languages || [])],
    countries: [...(d.countries || [])],
    clinics: [...(d.clinics || [])],
    treatments: [...(d.treatments || [])],
  }))
}

export function seedReviews() {
  const verticals = verticalMap()
  const nameToSlug = {}
  for (const [slug, s] of Object.entries(SERVICES)) {
    nameToSlug[(s.name || '').toLowerCase()] = slug
  }
  return REVIEWS.map(r => {
    const slug = nameToSlug[(r.treatment || '').toLowerCase()]
    return {
      id: r.id,
      name: r.name || '',
      location: r.location || '',
      treatment: r.treatment || '',
      vertical: slug ? (verticals[slug]?.[0] || '') : '',
      quote: r.quote || '',
      before: r.before || '',
      after: r.after || '',
    }
  })
}

export function seedVouchers() {
  return VOUCHERS.map(v => ({
    id: v.id,
    title: v.title || '',
    subtitle: v.subtitle || '',
    type: v.category || '',
    badge: v.badge || '',
    badgeStyle: v.badgeStyle || '',
    price: String(v.price ?? ''),
    currency: v.currency || 'AED',
    img: v.img || '',
  }))
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
