/**
 * Customers — the website's signed-in accounts (profile page, phone OTP /
 * Google / Apple / Samsung sign-in), as staff see them.
 *
 * The record is the website's own Customer shape (kaya-website/lib/api/auth.js)
 * so nothing needs translating. It splits in two:
 *
 *   · the summary — identity, contact, body measurements, sign-in — which
 *     lists and profiles show freely to anyone with access to Customers;
 *   · the medical record — allergies, medications, conditions, pregnancy —
 *     which is never part of the list. It's fetched one customer at a time,
 *     only when an admin chooses to reveal it, and every reveal is logged.
 *
 * See docs/customers.md for the endpoints the backend needs.
 */
import { COUNTRIES } from '@/lib/countries'

export const PROVIDER_LABELS = { PHONE: 'Mobile (OTP)', GOOGLE: 'Google', APPLE: 'Apple', SAMSUNG: 'Samsung' }
export const PROVIDER_SHORT = { PHONE: 'Mobile', GOOGLE: 'Google', APPLE: 'Apple', SAMSUNG: 'Samsung' }
export const PROVIDER_OPTIONS = Object.keys(PROVIDER_LABELS)

export const STATUS_LABELS = { ACTIVE: 'Active', DISABLED: 'Disabled' }

/** Everything that is health data. Never in a list response, never in an export. */
export const MEDICAL_FIELDS = ['allergies', 'medications', 'medicalConditions', 'isPregnant', 'isBreastfeeding']

/** Same fields the website's profile meter counts (ProfileClient COMPLETION_FIELDS). */
const COMPLETION_FIELDS = ['fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'heightCm', 'weightKg', 'healthConsentAt']

export function completeness(c) {
  const done = COMPLETION_FIELDS.filter(f => c[f] != null && c[f] !== '').length
  return Math.round((done / COMPLETION_FIELDS.length) * 100)
}

export function ageFrom(dob) {
  if (!dob) return null
  const d = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
  return age
}

/** BMI to one decimal, or null — a convenience for the treating doctor, not a judgement. */
export function bmi(c) {
  if (!c.heightCm || !c.weightKg) return null
  const m = c.heightCm / 100
  return Math.round((c.weightKg / (m * m)) * 10) / 10
}

// Dialling codes of the markets Kaya operates in.
const DIAL = { UAE: '+971', KSA: '+966', Oman: '+968' }

/** The market a phone number belongs to, from its dialling code ('' if another country or none). */
export function countryFromPhone(phone) {
  if (!phone) return ''
  return COUNTRIES.find(c => DIAL[c.id] && phone.startsWith(DIAL[c.id]))?.id || ''
}

/** "+971501234567" → "+971 50 123 4567" for reading; stored values stay E.164. */
export function formatPhone(phone) {
  if (!phone) return ''
  const code = Object.values(DIAL).find(d => phone.startsWith(d))
  if (!code) return phone
  const rest = phone.slice(code.length)
  return `${code} ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim()
}

export function displayName(c) {
  return c.fullName || c.email || formatPhone(c.phone) || 'Unnamed customer'
}

export function initials(c) {
  const src = c.fullName || c.email || c.phone || '?'
  return src.replace(/^\+/, '').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

/** The customer without any health data — what lists, exports and the profile header work from. */
export function toSummary(c) {
  const out = { ...c }
  for (const f of MEDICAL_FIELDS) delete out[f]
  out.hasHealthConsent = Boolean(c.healthConsentAt)
  return out
}

/** Pull just the medical record out of a full customer. */
export function toMedical(c) {
  return Object.fromEntries(MEDICAL_FIELDS.map(f => [f, c[f] ?? null]))
}

/** CSV columns — deliberately no medical fields. */
export const CUSTOMER_CSV_COLUMNS = [
  { header: 'Name', value: c => c.fullName || '' },
  { header: 'Email', value: c => c.email || '' },
  { header: 'Mobile', value: c => c.phone || '' },
  { header: 'Country', value: c => countryFromPhone(c.phone) },
  { header: 'Date of birth', value: c => c.dateOfBirth || '' },
  { header: 'Gender', value: c => (c.gender === 'FEMALE' ? 'Female' : c.gender === 'MALE' ? 'Male' : '') },
  { header: 'Height (cm)', value: c => c.heightCm ?? '' },
  { header: 'Weight (kg)', value: c => c.weightKg ?? '' },
  { header: 'Signs in with', value: c => (c.authProviders || []).map(p => PROVIDER_SHORT[p] || p) },
  { header: 'Profile complete', value: c => `${completeness(c)}%` },
  { header: 'Health consent', value: c => (c.healthConsentAt ? 'Given' : 'Not given') },
  { header: 'Status', value: c => STATUS_LABELS[c.status] || c.status },
  { header: 'Joined', value: c => c.createdAt || '' },
  { header: 'Last sign-in', value: c => c.lastSignInAt || '' },
]

/** Filters a list request accepts; the local store applies them, the backend should too. */
export function matchesCustomerFilters(c, { search, provider, country, consent, completeness: comp, status } = {}) {
  if (provider && !(c.authProviders || []).includes(provider)) return false
  if (country && countryFromPhone(c.phone) !== country) return false
  if (consent === 'given' && !c.healthConsentAt) return false
  if (consent === 'none' && c.healthConsentAt) return false
  if (status && c.status !== status) return false
  if (comp === 'complete' && completeness(c) < 100) return false
  if (comp === 'incomplete' && completeness(c) >= 100) return false
  if (search) {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    const hay = `${c.fullName || ''} ${c.email || ''}`.toLowerCase()
    const phoneHit = digits.length >= 4 && (c.phone || '').replace(/\D/g, '').includes(digits)
    if (!hay.includes(q) && !phoneHit) return false
  }
  return true
}
