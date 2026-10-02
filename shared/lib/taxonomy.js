/**
 * Treatment categories — the taxonomy behind /treatments/[category].
 *
 * This is deliberately separate from VERTICALS (Face & Skin, Body, Hair,
 * Wellness, Mens, Surgery), which is a marketing grouping a service can belong
 * to several of. A service has exactly ONE treatment category, and that
 * category decides:
 *   · which /treatments/… page the service is listed and routed under
 *   · the "tag" label shown on every service card
 *   · which reviews a treatment page shows
 *
 * These four ids are structural (each has a hand-written page in
 * lib/treatmentPages.js), so they live in code rather than in the database.
 */
export const TREATMENT_CATEGORIES = [
  { id: 'dermatology', label: 'Dermatology' },
  { id: 'slimming', label: 'Body Slimming' },
  { id: 'wellness', label: 'Wellness & Longevity' },
  { id: 'plastic-surgery', label: 'Plastic Surgery' },
]

export const CATEGORY_IDS = TREATMENT_CATEGORIES.map(c => c.id)

/** id -> display label, e.g. 'slimming' -> 'Body Slimming'. */
export const CATEGORY_LABELS = Object.fromEntries(
  TREATMENT_CATEGORIES.map(c => [c.id, c.label]),
)
