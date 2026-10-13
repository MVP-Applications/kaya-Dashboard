/**
 * Page builder — pages the admin creates from blocks, as opposed to the fixed
 * pages in content.js whose layouts are hand-built on the website.
 *
 * A custom page is settings + an ordered list of blocks. Each block has a
 * `type` from BLOCK_TYPES, a `hidden` flag, and `data` holding its fields.
 * Localised fields store English under the key and Arabic under `<key>Ar`,
 * the same convention as the rest of the dashboard.
 *
 * BLOCK_TYPES is the contract with the website: it must know how to render
 * every type listed here. The format is written up in docs/page-builder.md.
 *
 * A page's template decides which block types it may use (`allowedTypes`)
 * and which must be on the page before it can be published (`required`) —
 * mirrored from kaya-nest-api src/modules/pages/page-templates.ts.
 *
 * Every page also has a status (draft / published / archived — only
 * published pages are on the website), a place in the header and footer
 * menus, and the countries it's offered in. Treatments and doctors blocks
 * store ids.
 */

/** Where a page's link goes in the website header. */
export const HEADER_POSITIONS = [
  { value: 'NONE', label: 'Not in the header' },
  { value: 'LEFT', label: 'Left — in the main menu' },
  { value: 'RIGHT', label: 'Right — next to the language and account buttons' },
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

// ── Field helpers ────────────────────────────────────────────

const text = (key, label, extra = {}) => ({ key, label, type: 'text', localized: true, ...extra })
const area = (key, label, extra = {}) => ({ key, label, type: 'textarea', localized: true, ...extra })
const image = (key, label, extra = {}) => ({ key, label, type: 'image', ...extra })
const altText = (key = 'imageAlt') => text(key, 'Image description (alt text)', {
  hint: 'Describes the picture for screen readers and search engines. Leave empty for purely decorative images.',
})
const link = (key, label, extra = {}) => ({ key, label, type: 'text', placeholder: '/booking or https://…', ...extra })
const select = (key, label, options, extra = {}) => ({ key, label, type: 'select', options, ...extra })

const BUTTON_ACTIONS = [
  { value: 'link', label: 'Go to a link' },
  { value: 'booking', label: 'Open the booking form' },
  { value: 'whatsapp', label: 'Open WhatsApp' },
]

// ── Blocks ───────────────────────────────────────────────────

/**
 * Every block the website can render. `defaults` is what a freshly added
 * block starts with; templates below override it with example copy.
 */
export const BLOCK_TYPES = {
  hero: {
    label: 'Hero',
    icon: '▀',
    hint: 'Big opening banner with a headline and button.',
    fields: [
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading', { hint: 'Wrap highlighted words in *asterisks*.' }),
      area('sub', 'Subtitle'),
      image('image', 'Background image', {
        ratio: 8 / 3,
        recommended: { width: 2400, height: 900 },
        focusKey: 'imageFocus',
        hint: 'Full-width background behind the headline, at least 460 px tall — about 3:1 on desktop, while phones show a taller middle part. Use 2400 × 900 px and set the focal point on the subject.',
      }),
      altText(),
      select('align', 'Text alignment', [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }]),
      text('buttonLabel', 'Button label'),
      select('buttonAction', 'Button does', BUTTON_ACTIONS),
      link('buttonLink', 'Button link', { showIf: d => d.buttonAction === 'link' }),
    ],
    defaults: { eyebrow: '', heading: 'Your *headline* here', sub: '', image: '', imageAlt: '', imageFocus: '', align: 'left', buttonLabel: 'Book a consultation', buttonAction: 'booking', buttonLink: '' },
  },
  text: {
    label: 'Text',
    icon: '¶',
    hint: 'A heading and paragraphs.',
    fields: [
      text('heading', 'Heading'),
      area('body', 'Text', { rows: 8, hint: 'Leave a blank line between paragraphs.' }),
    ],
    defaults: { heading: '', body: '' },
  },
  imageText: {
    label: 'Image with text',
    icon: '◧',
    hint: 'Image beside a heading, text and optional button.',
    fields: [
      image('image', 'Image', {
        ratio: 4 / 3,
        recommended: { width: 1600, height: 1200 },
        focusKey: 'imageFocus',
        hint: 'Shown beside the text, cropped to 4:3 (above it on phones). Use 1600 × 1200 px.',
      }),
      altText(),
      select('imageSide', 'Image on the', [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]),
      text('eyebrow', 'Eyebrow'),
      text('heading', 'Heading', { hint: 'Wrap highlighted words in *asterisks*.' }),
      area('body', 'Text', { rows: 5 }),
      text('buttonLabel', 'Button label', { hint: 'Leave empty for no button.' }),
      select('buttonAction', 'Button does', BUTTON_ACTIONS),
      link('buttonLink', 'Button link', { showIf: d => d.buttonAction === 'link' }),
    ],
    defaults: { image: '', imageAlt: '', imageFocus: '', imageSide: 'left', eyebrow: '', heading: '', body: '', buttonLabel: '', buttonAction: 'link', buttonLink: '' },
  },
  image: {
    label: 'Image',
    icon: '▣',
    hint: 'A single image with an optional caption.',
    fields: [
      image('image', 'Image', {
        fit: 'contain',
        recommended: { width: 1600, height: 0 },
        hint: 'Shown in its own shape — never cropped. Use at least 1600 px wide (2400 px for full screen width).',
      }),
      altText('alt'),
      text('caption', 'Caption'),
      select('width', 'Width', [{ value: 'contained', label: 'Page width' }, { value: 'full', label: 'Full screen width' }]),
    ],
    defaults: { image: '', alt: '', caption: '', width: 'contained' },
  },
  features: {
    label: 'Feature cards',
    icon: '☷',
    hint: 'A row of short cards — benefits, steps, reasons to choose Kaya.',
    fields: [
      text('heading', 'Heading'),
      area('sub', 'Subtitle', { rows: 2 }),
      {
        key: 'items', label: 'Cards', type: 'items', addLabel: '+ Add card',
        itemFields: [
          { key: 'icon', label: 'Icon', type: 'text', placeholder: '✦', width: 'narrow' },
          text('title', 'Title'),
          area('text', 'Text', { rows: 2 }),
        ],
        emptyItem: { icon: '✦', title: '', titleAr: '', text: '', textAr: '' },
      },
    ],
    defaults: { heading: '', sub: '', items: [] },
  },
  treatments: {
    label: 'Treatments',
    icon: '✦',
    hint: 'Cards for treatments you pick — they link to each treatment page.',
    fields: [
      text('heading', 'Heading'),
      area('sub', 'Subtitle', { rows: 2 }),
      { key: 'treatments', label: 'Treatments', type: 'treatments' },
    ],
    defaults: { heading: 'Recommended *treatments*', sub: '', treatments: [] },
  },
  doctors: {
    label: 'Doctors',
    icon: '⚕',
    hint: 'Cards for doctors you pick — they link to each doctor profile.',
    fields: [
      text('heading', 'Heading'),
      area('sub', 'Subtitle', { rows: 2 }),
      { key: 'doctors', label: 'Doctors', type: 'doctors' },
    ],
    defaults: { heading: 'Meet our *doctors*', sub: '', doctors: [] },
  },
  faq: {
    label: 'FAQ',
    icon: '?',
    hint: 'Questions that open to show their answer.',
    fields: [
      text('heading', 'Heading'),
      {
        key: 'items', label: 'Questions', type: 'items', addLabel: '+ Add question',
        itemFields: [text('question', 'Question'), area('answer', 'Answer', { rows: 3 })],
        emptyItem: { question: '', questionAr: '', answer: '', answerAr: '' },
      },
    ],
    defaults: { heading: 'Frequently asked *questions*', items: [] },
  },
  cta: {
    label: 'Call to action',
    icon: '➜',
    hint: 'A closing band with a heading and one button.',
    fields: [
      text('heading', 'Heading', { hint: 'Wrap highlighted words in *asterisks*.' }),
      area('sub', 'Subtitle', { rows: 2 }),
      text('buttonLabel', 'Button label'),
      select('buttonAction', 'Button does', BUTTON_ACTIONS),
      link('buttonLink', 'Button link', { showIf: d => d.buttonAction === 'link' }),
    ],
    defaults: { heading: 'Ready to *begin*?', sub: '', buttonLabel: 'Book a consultation', buttonAction: 'booking', buttonLink: '' },
  },
  spacer: {
    label: 'Spacer',
    icon: '┄',
    hint: 'Breathing room or a divider line between blocks.',
    fields: [select('size', 'Style', [
      { value: 'small', label: 'Small space' }, { value: 'large', label: 'Large space' }, { value: 'line', label: 'Divider line' },
    ])],
    defaults: { size: 'small' },
  },
}

export const BLOCK_ORDER = ['hero', 'text', 'imageText', 'image', 'features', 'treatments', 'doctors', 'faq', 'cta', 'spacer']

let seq = 0
export function newId(prefix) {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`
}

/** Localised fields get an empty Arabic twin, so every block has the same shape. */
function withArabic(type, data) {
  const out = { ...data }
  for (const f of BLOCK_TYPES[type].fields) {
    if (f.localized && out[`${f.key}Ar`] === undefined) out[`${f.key}Ar`] = ''
  }
  return out
}

export function newBlock(type, data = {}) {
  const def = BLOCK_TYPES[type]
  return {
    id: newId('blk'),
    type,
    hidden: false,
    data: withArabic(type, { ...cloneDefaults(def.defaults), ...data }),
  }
}

function cloneDefaults(d) {
  return JSON.parse(JSON.stringify(d))
}

// ── Page types (templates) ───────────────────────────────────

const faqItem = (question, answer) => ({ question, questionAr: '', answer, answerAr: '' })
const card = (icon, title, textValue) => ({ icon, title, titleAr: '', text: textValue, textAr: '' })

/**
 * "What kind of page?" — each starts with blocks suited to the job, filled
 * with example copy to replace. Everything stays editable afterwards.
 */
export const PAGE_TEMPLATES = [
  {
    id: 'landing',
    label: 'Landing page',
    hint: 'Introduce a treatment area or service and drive bookings.',
    icon: '◭',
    allowedTypes: BLOCK_ORDER,
    required: ['hero'],
    blocks: () => [
      newBlock('hero', { eyebrow: 'New at Kaya', heading: 'Look and feel your *best*', sub: 'One sentence on what this page offers and who it is for.' }),
      newBlock('features', {
        heading: 'Why choose *Kaya*', items: [
          card('✦', 'Doctor-led', 'Every treatment is planned and delivered by a specialist.'),
          card('◎', 'Personalised', 'A plan built around your goals, skin and lifestyle.'),
          card('⌖', 'Across the GCC', 'Clinics in the UAE, Saudi Arabia and Oman.'),
        ],
      }),
      newBlock('imageText', { heading: 'What to *expect*', body: 'Describe the experience from consultation to results.' }),
      newBlock('treatments', {}),
      newBlock('faq', { items: [faqItem('How long does it take?', 'Add the answer here.'), faqItem('Is there any downtime?', 'Add the answer here.')] }),
      newBlock('cta', {}),
    ],
  },
  {
    id: 'campaign',
    label: 'Campaign / offer',
    hint: 'A limited-time offer or seasonal promotion.',
    icon: '✺',
    allowedTypes: ['hero', 'text', 'imageText', 'image', 'features', 'treatments', 'doctors', 'faq', 'cta', 'spacer'],
    required: ['hero'],
    blocks: () => [
      newBlock('hero', { eyebrow: 'Limited time', heading: 'This season’s *offer*', sub: 'Say what the offer is, and until when.', align: 'center', buttonLabel: 'Claim the offer' }),
      newBlock('text', { heading: 'The offer', body: 'Explain exactly what is included and how to redeem it.' }),
      newBlock('treatments', { heading: 'Included *treatments*' }),
      newBlock('cta', { heading: 'Don’t miss *out*', sub: 'Book before the offer ends.' }),
      newBlock('faq', { heading: 'Terms & *conditions*', items: [faqItem('Who can use this offer?', 'Add the answer here.'), faqItem('When does it end?', 'Add the answer here.')] }),
    ],
  },
  {
    id: 'info',
    label: 'Information page',
    hint: 'Explain something in depth — a guide, an announcement, opening hours.',
    icon: '▤',
    allowedTypes: ['hero', 'text', 'imageText', 'image', 'features', 'cta', 'spacer'],
    required: [],
    blocks: () => [
      newBlock('hero', { heading: 'Page *title*', sub: 'A one-line summary of the page.', buttonLabel: '', image: '' }),
      newBlock('text', { heading: 'Overview', body: 'Start writing here.' }),
      newBlock('imageText', { heading: 'More detail', body: 'Add supporting detail beside an image.' }),
      newBlock('cta', { heading: 'Have a *question*?', buttonLabel: 'Chat on WhatsApp', buttonAction: 'whatsapp' }),
    ],
  },
  {
    id: 'legal',
    label: 'Legal page',
    hint: 'Privacy policy, terms of use, cookie policy — plain text.',
    icon: '§',
    allowedTypes: ['text', 'spacer'],
    required: ['text'],
    blocks: () => [
      newBlock('text', { heading: 'Introduction', body: 'Last updated: [date]\n\nExplain what this policy covers.' }),
      newBlock('text', { heading: '1. Information we collect', body: '' }),
      newBlock('text', { heading: '2. How we use it', body: '' }),
      newBlock('text', { heading: '3. Contact us', body: '' }),
    ],
  },
  {
    id: 'faq',
    label: 'FAQ page',
    hint: 'Answers to common questions.',
    icon: '?',
    allowedTypes: ['hero', 'text', 'faq', 'cta', 'spacer'],
    required: ['faq'],
    blocks: () => [
      newBlock('hero', { heading: 'How can we *help*?', sub: 'Answers to the questions we hear most.', buttonLabel: '', align: 'center' }),
      newBlock('faq', { heading: '', items: [faqItem('Question one', 'Answer.'), faqItem('Question two', 'Answer.'), faqItem('Question three', 'Answer.')] }),
      newBlock('cta', { heading: 'Still have *questions*?', buttonLabel: 'Chat on WhatsApp', buttonAction: 'whatsapp' }),
    ],
  },
  {
    id: 'flexible',
    label: 'Blank page',
    hint: 'Start from nothing and add any blocks you need.',
    icon: '□',
    allowedTypes: BLOCK_ORDER,
    required: [],
    blocks: () => [],
  },
]

export const TEMPLATE_LABELS = Object.fromEntries(PAGE_TEMPLATES.map(t => [t.id, t.label]))

export function templateOf(id) {
  return PAGE_TEMPLATES.find(t => t.id === id) || PAGE_TEMPLATES.at(-1)
}

export function newCustomPage(templateId) {
  const template = templateOf(templateId)
  return {
    id: '',
    slug: '',
    kind: 'CUSTOM',
    template: template.id,
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
    blocks: template.blocks(),
    missingLocales: [],
    updatedAt: '',
  }
}

// ── URLs ─────────────────────────────────────────────────────

// Same rule as every other slug in the dashboard — see shared/lib/slug.js.
export { slugify } from '@/shared/lib/slug'

/**
 * Top-level addresses a custom page can't take: the website's own routes
 * (kaya-website/app), plus framework and conventional paths. The fixed pages'
 * paths are added at runtime from PAGES.
 */
export const RESERVED_SLUGS = [
  'about', 'aesthetic', 'blog', 'blogs', 'booking', 'doctors', 'find-us', 'indulgence', 'login', 'mens',
  'profile', 'surgery', 'tell-us', 'treatments', 'wellness-longevity',
  'api', 'admin', 'app', 'assets', 'static', 'public', 'search', 'sitemap', 'sitemap-xml', 'robots', 'robots-txt',
  'favicon', 'manifest', '404', '500', 'ar', 'en', 'global', 'homepage',
]

/**
 * Problems that must be fixed before saving, as readable messages.
 * `builtInPaths` are the fixed pages' paths ('/about', …).
 */
export function validateCustomPage(page, { otherPages = [], builtInPaths = [] } = {}) {
  const problems = []
  if (!page.title.trim()) problems.push('Give the page a title.')
  if (page.allCountries === false && !(page.countries || []).length) problems.push('Choose at least one country, or offer the page in every country.')
  const template = templateOf(page.template)
  const misfits = [...new Set(page.blocks.map(b => b.type))].filter(t => !template.allowedTypes.includes(t))
  if (misfits.length) problems.push(`A ${template.label} can’t have ${misfits.map(t => BLOCK_TYPES[t]?.label || t).join(', ')} blocks — remove them.`)
  if (page.status === 'PUBLISHED') problems.push(...publishProblems(page))
  const slug = page.slug
  const reserved = new Set([...RESERVED_SLUGS, ...builtInPaths.map(p => p.replace(/^\//, '').split('/')[0]).filter(Boolean)])
  if (!slug) problems.push('The page needs an address (URL).')
  else if (reserved.has(slug)) problems.push(`“/${slug}” is already used by the website. Choose another address.`)
  else if (otherPages.some(p => p.slug === slug)) problems.push(`Another page already uses “/${slug}”.`)
  return problems
}

/**
 * What a page still needs before it can be published — the same rules the
 * backend enforces: an English title, a visible block, and each block type
 * its template requires.
 */
export function publishProblems(page) {
  const problems = []
  if (!(page.title || '').trim()) problems.push('Add an English title.')
  const shown = (page.blocks || []).filter(b => !b.hidden)
  if (!shown.length) problems.push('Add at least one visible block.')
  for (const type of templateOf(page.template).required) {
    if (!shown.some(b => b.type === type)) problems.push(`This page type needs a visible ${BLOCK_TYPES[type]?.label || type} block.`)
  }
  return problems
}

/** "Your *headline*" → "Your headline" */
export function plainText(value) {
  return String(value || '').replace(/\*/g, '')
}
