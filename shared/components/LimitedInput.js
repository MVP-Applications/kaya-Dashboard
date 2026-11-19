'use client'

/**
 * The "12 / 80" counter under a limited field. Amber when the limit is
 * reached, red with a message when the value is over it (saved before the
 * limit existed — the API will reject it on save). `label` prefixes the
 * count (e.g. "Longest keyword: "); `note` (shown amber) explains a refused
 * edit, e.g. a paste that would have gone over the limit.
 */
export function CharCount({ length, max, label = '', note = '' }) {
  const over = length > max
  const full = length === max
  let message = `${label}${length} / ${max}`
  if (over) message += `. Too long: shorten to ${max} characters.`
  else if (note) message += `. ${note}`
  else if (full) message += '. Character limit reached.'

  return (
    <span className={`ad-char-count${over ? ' ad-char-count--over' : full || note ? ' ad-char-count--full' : ''}`} aria-live="polite">
      {message}
    </span>
  )
}

/**
 * A text input (or textarea with `multiline`) capped at `max` characters,
 * with a live "12 / 80" counter under it. Typing stops at the limit.
 *
 * Limits come from shared/lib/limits.js. Every other prop goes to the field.
 * `wrapClassName` sizes the field inside a row (e.g. ad-w-grow); use it
 * instead of putting width classes on the field itself.
 */
export default function LimitedInput({ max, value, multiline = false, className = 'ad-input', wrapClassName = '', ...rest }) {
  const text = value ?? ''
  const over = text.length > max
  const Field = multiline ? 'textarea' : 'input'

  return (
    <span className={`ad-limited${wrapClassName ? ` ${wrapClassName}` : ''}`}>
      <Field
        {...rest}
        className={`${className}${over ? ' ad-input--invalid' : ''}`}
        value={text}
        maxLength={max}
        aria-invalid={over || undefined}
      />
      <CharCount length={text.length} max={max} />
    </span>
  )
}
