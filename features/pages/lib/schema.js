/**
 * The page builder's rules come from the backend: GET /admin/pages/schema
 * (kaya-nest-api src/modules/pages/registry/). It lists every section type
 * with its fields, every page design with the section types it allows, and
 * the addresses a new page can't take. Nothing here keeps its own copy.
 *
 * A built page is settings plus an ordered list of sections:
 *   { id, type, hidden, content: { EN: {…}, AR: {…} } }
 * Content uses the website's field names and is edited one language at a
 * time. An empty Arabic field shows the English one on the website.
 */
import { newId, slugify } from '@/features/pages/lib/page-builder'

const isBlank = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

/** Arabic (or any locale) content with blank fields filled from English — what the website shows. */
export function fillBlanks(content, fallback) {
  if (Array.isArray(content) || Array.isArray(fallback)) {
    const a = Array.isArray(content) ? content : []
    const b = Array.isArray(fallback) ? fallback : []
    if (!a.length) return b
    return a.map((item, i) => fillBlanks(item, b[i]))
  }
  if (content && typeof content === 'object') {
    const base = fallback && typeof fallback === 'object' ? fallback : {}
    const out = { ...base }
    for (const [k, v] of Object.entries(content)) out[k] = isBlank(v) ? base[k] : fillBlanks(v, base[k])
    return out
  }
  return isBlank(content) ? fallback : content
}

/** One section's content as shown in a language. */
export function shownContent(section, locale) {
  const en = section.content?.EN || {}
  return locale === 'EN' ? en : fillBlanks(section.content?.[locale] || {}, en)
}

export function designOf(schema, id) {
  return schema?.designs.find(d => d.id === id) || null
}

export function sectionTypeOf(schema, type) {
  return schema?.sectionTypes.find(t => t.type === type) || null
}

/** Backend field → the field shape shared/components/ContentFields.js renders. */
export function toFormField(field) {
  const out = { ...field, type: field.kind === 'refs' ? 'refs' : field.kind }
  if (field.fields) out.fields = field.fields.map(toFormField)
  if (field.showWhen) {
    const { field: other, in: values } = field.showWhen
    out.showIf = values2 => values.includes(values2?.[other])
  }
  return out
}

export function formFields(schema, type) {
  return (sectionTypeOf(schema, type)?.fields || []).map(toFormField)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}))
}

/** A new section of `type`, starting from its defaults (plus any `content`). */
export function newSection(schema, type, content = {}) {
  const def = sectionTypeOf(schema, type)
  return {
    id: newId('sec'),
    type,
    hidden: false,
    content: { EN: { ...clone(def?.defaults), ...clone(content) }, AR: {} },
  }
}

/** A new page from a design: its starter sections, nothing published. */
export function newPageFromDesign(schema, designId) {
  const design = designOf(schema, designId) || designOf(schema, 'flexible')
  return {
    id: '',
    slug: '',
    kind: 'CUSTOM',
    template: design?.id || 'flexible',
    // New pages start as drafts, so nothing half-written goes live by accident.
    status: 'DRAFT',
    headerPosition: 'NONE',
    footerColumn: 'NONE',
    allCountries: true,
    countries: [],
    title: '', titleAr: '',
    navLabel: '', navLabelAr: '',
    seoTitle: '', seoTitleAr: '',
    seoDescription: '', seoDescriptionAr: '',
    fixedAddress: false,
    blocks: (design?.starter || []).map(s => newSection(schema, s.type, s.content)),
    missingLocales: [],
    updatedAt: '',
  }
}

/** Designs a page could switch to: those that allow every section it has. */
export function designsThatFit(schema, page) {
  const types = new Set(page.blocks.map(b => b.type))
  return (schema?.designs || []).filter(d => [...types].every(t => d.allowedTypes.includes(t)))
}

/** "Your *headline*" → "Your headline" */
const plain = value => String(value || '').replace(/\*/g, '').replace(/<[^>]*>/g, '')

/** A short label for a section in the outline: its heading, else its type's hint. */
export function sectionSummary(schema, section) {
  const d = section.content?.EN || {}
  const first = d.items?.[0]?.question || d.items?.[0]?.title || d.principles?.[0]?.title
  return plain(d.heading || d.title || d.caption || first || '') || sectionTypeOf(schema, section.type)?.hint || ''
}

/**
 * What a page still needs before it can be published — the same rules the
 * backend enforces: an English title, enough visible sections, and each
 * section type its design requires.
 */
export function publishProblems(schema, page) {
  const problems = []
  if (!(page.title || '').trim()) problems.push('Add an English title.')
  const shown = (page.blocks || []).filter(b => !b.hidden)
  const design = designOf(schema, page.template)
  if (shown.length < (design?.minSections ?? 1)) problems.push('Add at least one visible section.')
  for (const type of design?.required || []) {
    if (!shown.some(b => b.type === type)) {
      problems.push(`The ${design.label} design needs a visible ${sectionTypeOf(schema, type)?.label || type} section.`)
    }
  }
  return problems
}

/** Problems that must be fixed before saving, as readable messages. */
export function validateCustomPage(schema, page, { otherPages = [] } = {}) {
  const problems = []
  if (!page.title.trim()) problems.push('Give the page a title.')
  if (page.allCountries === false && !(page.countries || []).length) problems.push('Choose at least one country, or offer the page in every country.')
  const design = designOf(schema, page.template)
  if (!design) problems.push('Choose a design for the page.')
  else {
    const misfits = [...new Set(page.blocks.map(b => b.type))].filter(t => !design.allowedTypes.includes(t))
    if (misfits.length) {
      problems.push(`The ${design.label} design can’t have ${misfits.map(t => sectionTypeOf(schema, t)?.label || t).join(', ')} sections. Remove them.`)
    }
  }
  if (page.status === 'PUBLISHED') problems.push(...publishProblems(schema, page))
  if (!page.fixedAddress) {
    const slug = page.slug
    const reserved = new Set(schema?.reservedSlugs || [])
    if (!slug) problems.push('The page needs an address (URL).')
    else if (reserved.has(slug)) problems.push(`“/${slug}” is already used by the website. Choose another address.`)
    else if (otherPages.some(p => p.slug === slug)) problems.push(`Another page already uses “/${slug}”.`)
  }
  return problems
}

export { slugify }
