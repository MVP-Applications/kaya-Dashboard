/**
 * The one slug rule for every record with a public address (treatments,
 * doctors, verticals, categories, custom pages): lowercase letters and digits
 * in groups joined by single hyphens — no spaces, no other characters.
 *
 * Mirrors SLUG_PATTERN in kaya-nest-api/src/common/utils/slug.util.ts, which
 * rejects anything else, and the website's not-found.js, which only looks up
 * addresses of this shape — so a slug that passes here works everywhere.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_MAX_LENGTH = 100
export const SLUG_HINT = 'Lowercase letters, numbers and hyphens only — used in the page address.'

/** Any text → a valid slug: "Dr. Sara Al-Mansoori" → "dr-sara-al-mansoori". Can return ''. */
export function slugify(str, maxLength = SLUG_MAX_LENGTH) {
  return String(str ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')
}

/**
 * What the slug input shows while the admin types: lowercased, with spaces
 * and other characters turned into single hyphens as they go. A trailing
 * hyphen is kept (they may be mid-word); slugify on blur/save tidies it.
 */
export function slugInput(str, maxLength = SLUG_MAX_LENGTH) {
  return String(str ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, maxLength)
}

/**
 * The slug a record will be saved with — the admin's own (tidied) when they
 * typed one, otherwise generated from `source` (its name) — plus the reason
 * it can't be used, or '' when it's fine. `taken` is every other record's slug.
 */
export function resolveSlug(typed, source, taken = []) {
  const slug = slugify(typed) || slugify(source)
  if (!slug) return { slug, error: 'Add an English name or a slug — it becomes the page address.' }
  if (!SLUG_PATTERN.test(slug) || slug.length > SLUG_MAX_LENGTH) {
    return { slug, error: `The slug "${slug}" isn't valid. ${SLUG_HINT}` }
  }
  if (taken.includes(slug)) return { slug, error: `The slug "${slug}" is already in use.` }
  return { slug, error: '' }
}
