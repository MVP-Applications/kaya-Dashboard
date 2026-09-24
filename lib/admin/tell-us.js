/**
 * Tell Us Everything — the questionnaire behind the website's concern finder.
 *
 * One document, two parts:
 *
 *   shared  — questions written once and reusable by every main treatment
 *             (Gender, Age range). Editing one changes it everywhere.
 *   areas   — per main treatment (keyed by vertical id), the ordered steps
 *             asked after someone picks it. A step is either a reference to a
 *             shared question, which that area can switch off, or a question
 *             of the area's own (like its concern list).
 *
 * Only an area's own questions suggest treatments: each option lists the
 * treatment slugs it points to. Shared answers are recorded on the enquiry
 * but never filter results.
 *
 * Headings mark their emphasised words with *asterisks* — "What is your
 * *gender*?" — so the emphasis can sit anywhere, which Arabic word order needs.
 *
 * The full format, for the website team, is in docs/tell-us-everything.md.
 */
import { AREA_CONCERNS } from '@/lib/seed-data/tell-us'

export const TELL_US_VERSION = 1

let seq = 0
/** Short unique id for things created in the editor (steps, questions, options). */
export function newId(prefix) {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`
}

export function emptyQuestion() {
  return {
    id: newId('q'),
    eyebrow: '', eyebrowAr: '',
    heading: '', headingAr: '',
    sub: '', subAr: '',
    multiple: false,
    options: [],
    notSure: false, notSureLabel: 'Not sure — show all', notSureLabelAr: 'لست متأكدًا — عرض الكل',
  }
}

export function emptyOption() {
  return { id: newId('opt'), label: '', labelAr: '', treatments: [] }
}

// ── Seed: exactly what the website hard-codes today ──────────

const GENDER = {
  id: 'gender',
  eyebrow: 'A little more about you', eyebrowAr: 'المزيد عنك',
  heading: 'What is your *gender*?', headingAr: 'ما هو *جنسك*؟',
  sub: 'This helps us tailor treatments to your specific needs.',
  subAr: 'يساعدنا هذا على تخصيص العلاجات وفق احتياجاتك.',
  multiple: false,
  options: [
    { id: 'female', label: 'Female', labelAr: 'أنثى', treatments: [] },
    { id: 'male', label: 'Male', labelAr: 'ذكر', treatments: [] },
  ],
  notSure: false, notSureLabel: '', notSureLabelAr: '',
}

const AGE = {
  id: 'age',
  eyebrow: 'A little more about you', eyebrowAr: 'المزيد عنك',
  heading: 'Which *age range* are you in?', headingAr: 'ما هو *نطاقك العمري*؟',
  sub: "This helps us tailor the most suitable treatments for your skin's stage.",
  subAr: 'يساعدنا هذا على اختيار أنسب العلاجات لمرحلة بشرتك.',
  multiple: false,
  options: [
    { id: '20s', label: "In your 20's", labelAr: 'في العشرينات', treatments: [] },
    { id: '30s', label: "In your 30's", labelAr: 'في الثلاثينات', treatments: [] },
    { id: '40s', label: "In your 40's", labelAr: 'في الأربعينات', treatments: [] },
    { id: '50s', label: "In your 50's", labelAr: 'في الخمسينات', treatments: [] },
  ],
  notSure: false, notSureLabel: '', notSureLabelAr: '',
}

function concernQuestion(areaId, concerns) {
  return {
    id: `concerns-${areaId}`,
    eyebrow: 'Refine your concerns', eyebrowAr: 'حدد اهتماماتك',
    heading: 'What specifically *bothers* you?', headingAr: 'ما الذي *يزعجك* تحديدًا؟',
    sub: 'Select one or more concerns — this filters the most effective treatments for you.',
    subAr: 'اختر اهتمامًا واحدًا أو أكثر — لتصفية أنسب العلاجات لك.',
    multiple: true,
    options: concerns.map(c => ({ id: c.id, label: c.label, labelAr: c.labelAr, treatments: [...c.treatments] })),
    notSure: true, notSureLabel: 'Not sure — show all', notSureLabelAr: 'لست متأكدًا — عرض الكل',
  }
}

export function seedTellUs() {
  const areas = {}
  for (const [areaId, concerns] of Object.entries(AREA_CONCERNS)) {
    areas[areaId] = {
      steps: [
        // Mens already implies gender — the website skipped it in code; here
        // it's simply switched off for that area.
        { id: `${areaId}-gender`, shared: 'gender', enabled: areaId !== 'mens' },
        { id: `${areaId}-age`, shared: 'age', enabled: true },
        { id: `${areaId}-concerns`, question: concernQuestion(areaId, concerns), enabled: true },
      ],
    }
  }
  return { version: TELL_US_VERSION, shared: [GENDER, AGE], areas }
}

// ── Normalising ──────────────────────────────────────────────

function normaliseQuestion(q) {
  const base = emptyQuestion()
  const out = { ...base, ...(q && typeof q === 'object' ? q : {}) }
  out.id = String(out.id || base.id)
  out.multiple = Boolean(out.multiple)
  out.notSure = Boolean(out.notSure)
  out.options = (Array.isArray(out.options) ? out.options : []).map(o => ({
    ...emptyOption(), ...o, treatments: Array.isArray(o?.treatments) ? o.treatments : [],
  }))
  return out
}

/**
 * Make a stored document safe to render against the current verticals:
 * every vertical gets an area, every area references every shared question
 * (a newly added shared question appears, switched on, at the end), and
 * references to deleted shared questions are dropped.
 */
export function normaliseTellUs(doc, verticals = []) {
  const src = doc && typeof doc === 'object' ? doc : {}
  const shared = (Array.isArray(src.shared) ? src.shared : []).map(normaliseQuestion)
  const sharedIds = new Set(shared.map(q => q.id))
  const areas = {}

  const areaIds = new Set([...verticals.map(v => v.id), ...Object.keys(src.areas || {})])
  for (const areaId of areaIds) {
    const stored = Array.isArray(src.areas?.[areaId]?.steps) ? src.areas[areaId].steps : []
    const steps = []
    for (const s of stored) {
      if (!s || typeof s !== 'object') continue
      if (s.shared) {
        if (sharedIds.has(s.shared)) steps.push({ id: s.id || newId('step'), shared: s.shared, enabled: s.enabled !== false })
      } else if (s.question) {
        steps.push({ id: s.id || newId('step'), question: normaliseQuestion(s.question), enabled: s.enabled !== false })
      }
    }
    for (const q of shared) {
      if (!steps.some(s => s.shared === q.id)) steps.push({ id: newId('step'), shared: q.id, enabled: true })
    }
    areas[areaId] = { steps }
  }
  return { version: TELL_US_VERSION, shared, areas }
}

// ── Reading the flow ─────────────────────────────────────────

/** The questions someone who picks `areaId` is asked, in order (enabled only). */
export function flowFor(doc, areaId) {
  const shared = Object.fromEntries((doc?.shared || []).map(q => [q.id, q]))
  return (doc?.areas?.[areaId]?.steps || [])
    .filter(s => s.enabled)
    .map(s => (s.shared ? { ...shared[s.shared], isShared: true } : { ...s.question, isShared: false }))
    .filter(q => q.id)
}

/**
 * Treatments to suggest, mirroring the website's rule: the treatments linked
 * to the chosen answers of the area's own questions, limited to treatments in
 * that area. "Not sure", no linked answers, or no match at all shows every
 * treatment in the area.
 *
 * answers: { [questionId]: optionId[] | ['__not_sure__'] }
 * areaTreatments: slugs of treatments under this main treatment.
 */
export const NOT_SURE = '__not_sure__'

export function suggestTreatments(doc, areaId, answers, areaTreatments) {
  const inArea = new Set(areaTreatments)
  const wanted = new Set()
  let notSure = false
  for (const q of flowFor(doc, areaId)) {
    if (q.isShared) continue
    const chosen = answers?.[q.id] || []
    if (chosen.includes(NOT_SURE)) notSure = true
    for (const o of q.options) if (chosen.includes(o.id)) o.treatments.forEach(t => wanted.add(t))
  }
  const narrowed = [...wanted].filter(t => inArea.has(t))
  return notSure || !narrowed.length ? [...inArea] : narrowed
}

/** "What is your *gender*?" → "What is your gender?" */
export function plainHeading(text) {
  return String(text || '').replace(/\*/g, '')
}

/** Every area that uses a shared question, split by on/off — for the shared editor's summary. */
export function sharedUsage(doc, questionId) {
  const on = []
  const off = []
  for (const [areaId, area] of Object.entries(doc?.areas || {})) {
    const step = area.steps.find(s => s.shared === questionId)
    if (step) (step.enabled ? on : off).push(areaId)
  }
  return { on, off }
}

/**
 * Problems that would break or confuse the website's flow. Returned as
 * readable messages; the editor blocks saving while any exist.
 */
export function validateTellUs(doc, areaLabel = id => id) {
  const problems = []
  const checkQuestion = (q, where) => {
    const name = plainHeading(q.heading) || 'Untitled question'
    if (!q.heading.trim()) problems.push(`${where}: a question has no heading.`)
    if (!q.options.length) problems.push(`${where}: “${name}” has no answers.`)
    if (q.options.some(o => !o.label.trim())) problems.push(`${where}: “${name}” has an answer with no label.`)
    const ids = q.options.map(o => o.id)
    if (new Set(ids).size !== ids.length) problems.push(`${where}: “${name}” has two answers with the same id.`)
  }
  for (const q of doc.shared) checkQuestion(q, 'Shared questions')
  for (const [areaId, area] of Object.entries(doc.areas)) {
    for (const s of area.steps) if (s.question) checkQuestion(s.question, areaLabel(areaId))
  }
  return problems
}
