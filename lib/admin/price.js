/** "1,800" / " 1800.50 " → number; blank → undefined; anything else → null (a form error). */
export function parsePriceInput(value) {
  const text = String(value ?? '').replace(/[,\s]/g, '')
  if (text === '') return undefined
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 ? n : null
}
