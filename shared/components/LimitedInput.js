'use client'

/**
 * A text input (or textarea with `multiline`) capped at `max` characters,
 * with a live "12 / 80" counter under it. Typing stops at the limit; the
 * counter turns amber when the limit is reached. A value that is already
 * longer (saved before the limit existed) is shown in red with a message,
 * since the API will reject it on save.
 *
 * Limits come from shared/lib/limits.js. Every other prop goes to the field.
 * `wrapClassName` sizes the field inside a row (e.g. ad-w-grow); use it
 * instead of putting width classes on the field itself.
 */
export default function LimitedInput({ max, value, multiline = false, className = 'ad-input', wrapClassName = '', ...rest }) {
  const text = value ?? ''
  const length = text.length
  const over = length > max
  const full = length === max
  const Field = multiline ? 'textarea' : 'input'

  let message = `${length} / ${max}`
  if (over) message += `. Too long: shorten to ${max} characters.`
  else if (full) message += '. Character limit reached.'

  return (
    <span className={`ad-limited${wrapClassName ? ` ${wrapClassName}` : ''}`}>
      <Field
        {...rest}
        className={`${className}${over ? ' ad-input--invalid' : ''}`}
        value={text}
        maxLength={max}
        aria-invalid={over || undefined}
      />
      <span className={`ad-char-count${over ? ' ad-char-count--over' : full ? ' ad-char-count--full' : ''}`} aria-live="polite">
        {message}
      </span>
    </span>
  )
}
