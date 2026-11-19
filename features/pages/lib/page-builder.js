/**
 * Page-builder constants: menu positions, statuses and ids. The section
 * types, page designs and their rules come from the backend schema — see
 * features/pages/lib/schema.js.
 */

/** Where a page's link goes in the website header. */
export const HEADER_POSITIONS = [
  { value: 'NONE', label: 'Not in the header' },
  { value: 'LEFT', label: 'Left: in the main menu' },
  { value: 'RIGHT', label: 'Right: next to the language and account buttons' },
]
export const HEADER_POSITION_LABELS = { LEFT: 'Header left', RIGHT: 'Header right' }

/** Which footer column a page's link goes in. */
export const FOOTER_COLUMNS = [
  { value: 'NONE', label: 'Not in the footer' },
  { value: 'COMPANY', label: 'Company column' },
  { value: 'SUPPORT', label: 'Support column' },
]
export const FOOTER_COLUMN_LABELS = { COMPANY: 'Footer · Company', SUPPORT: 'Footer · Support' }

export const PAGE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]
export const PAGE_STATUS_LABELS = Object.fromEntries(PAGE_STATUSES.map(s => [s.value, s.label]))

let seq = 0
export function newId(prefix) {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`
}

// Same rule as every other slug in the dashboard — see shared/lib/slug.js.
export { slugify } from '@/shared/lib/slug'

/** "Your *headline*" → "Your headline" */
export function plainText(value) {
  return String(value || '').replace(/\*/g, '')
}
