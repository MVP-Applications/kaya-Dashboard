/**
 * CSV export.
 *
 * Kept generic so any list view can reuse it: callers describe the columns they
 * want and hand over the rows they are already showing.
 */

/**
 * Quote a single cell.
 *
 * Two details matter for real-world data:
 *
 * · A value starting with = + - or @ is executed as a formula by Excel and
 *   Sheets. Enquiry text is attacker-supplied — someone can type
 *   `=HYPERLINK(...)` into a booking form — so those values get a leading
 *   apostrophe, which spreadsheets treat as "this is text".
 *
 * · Fields containing a comma, quote or newline must be wrapped, and any inner
 *   quote doubled. A treatment note with a line break otherwise splits the row.
 */
function cell(value) {
  if (value == null) return ''

  let s = Array.isArray(value) ? value.join('; ') : String(value)

  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`

  return s
}

/**
 * Build a CSV string. `columns` is [{ header, value }] where `value` is a
 * function of the row, so a column can format or combine fields.
 */
export function toCsv(rows, columns) {
  const head = columns.map(c => cell(c.header)).join(',')
  const body = rows.map(row => columns.map(c => cell(c.value(row))).join(','))
  return [head, ...body].join('\r\n')
}

/**
 * Trigger a download in the browser.
 *
 * The UTF-8 BOM is deliberate: without it Excel on Windows reads the file as
 * the local codepage, and Arabic names or the AED symbol arrive as mojibake.
 */
export function downloadCsv(filename, csv) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()

  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** `kaya-enquiries-2026-08-21.csv` — sorts chronologically in a folder. */
export function stampedName(prefix) {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`
}
