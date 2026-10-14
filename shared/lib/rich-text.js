/**
 * Helpers for paragraph fields written in the text editor
 * (shared/components/RichTextEditor.js), stored as a small HTML fragment.
 */

const HAS_BLOCK = /<(p|ul|ol)[\s>]/i
const escapeText = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * What the editor loads. Plain text saved before the editor existed becomes
 * paragraphs (split on blank lines, single newlines kept as line breaks).
 */
export function plainToRichHtml(value) {
  const text = String(value || '')
  if (!text.trim() || HAS_BLOCK.test(text)) return text
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${escapeText(p).replace(/\n/g, '<br>')}</p>`).join('')
}

/** The words of a rich-text value, markup dropped — for counts and summaries. */
export function richTextToPlain(value) {
  return String(value || '')
    .replace(/<\/(p|li)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
