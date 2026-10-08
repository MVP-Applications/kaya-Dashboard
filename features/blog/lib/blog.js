/** Blog helpers shared by the list, the editor and the topics panel. */

export const BLOCK_TYPES = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h2', label: 'Heading' },
  { value: 'quote', label: 'Quote' },
]

/** "2026-09-10" → "10 Sept 2026"; '' stays ''. */
export function formatBlogDate(day) {
  if (!day) return ''
  const d = new Date(`${day}T00:00:00`)
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : day
}

/** Word count and a ~200 wpm reading time — the same estimate the backend saves. */
export function readingStats(blocks) {
  const words = (blocks || [])
    .map(b => String(b.text || '').trim().split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0)
  return { words, minutes: Math.max(1, Math.round(words / 200)) }
}

/** Blocks that have text — what a post actually saves. */
export function filledBlocks(blocks) {
  return (blocks || []).filter(b => String(b.text || '').trim())
}

/** "botox, anti-wrinkle , " → ['botox', 'anti-wrinkle'] */
export function parseKeywords(text) {
  return String(text || '').split(',').map(s => s.trim()).filter(Boolean)
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
