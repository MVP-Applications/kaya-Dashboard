/**
 * Per-country page copy, as a base plus overrides.
 *
 * Storing a full copy of every field for every country would triple the content
 * an editor has to keep in step, and almost all of it is identical between
 * markets. So the tree stays single-valued and a country only records the
 * fields it actually changes:
 *
 *   base:            { home: { hero: { title: 'Where beauty meets medicine' } } }
 *   overrides.KSA:   { home: { hero: { title: 'حيث يلتقي الجمال بالطب' } } }
 *
 * Reading for KSA gives the override where one exists and the base everywhere
 * else. Nothing has to be duplicated to stay correct, and an edit to shared
 * copy still reaches every market.
 */

/** Deep-ish merge: base tree, with a country's sparse overrides applied. */
export function resolveContent(base, overrides) {
  if (!overrides || typeof overrides !== 'object') return base

  const out = { ...base }
  for (const groupId of Object.keys(base)) {
    const oGroup = overrides[groupId]
    if (!oGroup || typeof oGroup !== 'object') continue

    const group = { ...base[groupId] }
    for (const sectionId of Object.keys(group)) {
      const oSection = oGroup[sectionId]
      if (!oSection || typeof oSection !== 'object') continue

      // Only keys the override actually sets win; the rest stay on the base.
      group[sectionId] = { ...group[sectionId], ...oSection }
    }
    out[groupId] = group
  }
  return out
}

/**
 * Which fields in a section a country is overriding. The editor uses this to
 * mark a field as "changed for this country" rather than leaving the editor
 * guessing whether they are looking at shared or local copy.
 */
export function overriddenKeys(overrides, groupId, sectionId) {
  const section = overrides?.[groupId]?.[sectionId]
  if (!section || typeof section !== 'object') return new Set()
  return new Set(Object.keys(section))
}

/**
 * Record a country-specific value. A value equal to the base is *removed* from
 * the overrides rather than stored — otherwise editing shared copy later would
 * silently stop reaching that country, which is the failure mode this whole
 * design exists to avoid.
 */
export function setOverride(overrides, base, groupId, sectionId, key, value) {
  const next = { ...(overrides || {}) }
  const group = { ...(next[groupId] || {}) }
  const section = { ...(group[sectionId] || {}) }

  const baseValue = base?.[groupId]?.[sectionId]?.[key]
  const same = JSON.stringify(baseValue) === JSON.stringify(value)

  if (same) delete section[key]
  else section[key] = value

  if (Object.keys(section).length) group[sectionId] = section
  else delete group[sectionId]

  if (Object.keys(group).length) next[groupId] = group
  else delete next[groupId]

  return next
}

/** Drop every override a country holds for one section, back to the base. */
export function clearSectionOverride(overrides, groupId, sectionId) {
  const next = { ...(overrides || {}) }
  const group = { ...(next[groupId] || {}) }
  delete group[sectionId]

  if (Object.keys(group).length) next[groupId] = group
  else delete next[groupId]

  return next
}

/** How many fields a country overrides in total — shown next to its name. */
export function countOverrides(overrides) {
  let n = 0
  for (const group of Object.values(overrides || {})) {
    for (const section of Object.values(group || {})) {
      n += Object.keys(section || {}).length
    }
  }
  return n
}
