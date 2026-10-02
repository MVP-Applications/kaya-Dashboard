'use client'
import ImagePicker from '@/shared/components/ImagePicker'
import { emptyListItem } from '@/shared/lib/content'

/**
 * Generic renderer for the website-content schema in shared/lib/content.js.
 *
 * A section declares its fields; this turns them into inputs and reports every
 * change back through `onChange(key, value)`. Consecutive fields marked
 * `width: 'half'` are paired into a two-column row.
 *
 * Optional per-field extras:
 * - `hint`: instructions shown between the label and the input
 * - `showIf(values)`: hide the field unless it applies to these values
 *   (for a list item, `values` is that item)
 * - `validate(value, values)`: returns an error message, or '' when valid.
 *   Errors show inline, and ContentEditor blocks Save while any remain.
 */

/** The fields that apply to these values — see `showIf` above. */
function visibleFields(fields, values) {
  return fields.filter(f => !f.showIf || f.showIf(values || {}))
}

/** How many visible fields fail `validate`, following list fields into each item. */
export function countFieldErrors(fields, values) {
  let count = 0
  for (const field of visibleFields(fields, values)) {
    const value = values?.[field.key]
    if (field.validate?.(value, values || {})) count++
    if (field.type === 'list' && Array.isArray(value)) {
      for (const item of value) count += countFieldErrors(field.fields || [], item)
    }
  }
  return count
}

/** Group consecutive half-width fields into rows so they render side by side. */
function toRows(fields) {
  const rows = []
  let run = []
  for (const field of fields) {
    if (field.width === 'half') {
      run.push(field)
      if (run.length === 2) { rows.push(run); run = [] }
    } else {
      if (run.length) { rows.push(run); run = [] }
      rows.push([field])
    }
  }
  if (run.length) rows.push(run)
  return rows
}

export function SectionFields({ fields, values, onChange, disabled }) {
  return (
    <>
      {toRows(visibleFields(fields, values)).map(row => (
        row.length === 2 ? (
          <div className="ad-grid2" key={row[0].key}>
            {row.map(f => (
              <Field key={f.key} field={f} value={values?.[f.key]} values={values}
                onChange={v => onChange(f.key, v)} disabled={disabled} />
            ))}
          </div>
        ) : (
          <Field key={row[0].key} field={row[0]} value={values?.[row[0].key]} values={values}
            onChange={v => onChange(row[0].key, v)} disabled={disabled} />
        )
      ))}
    </>
  )
}

function Field({ field, value, values, onChange, disabled }) {
  const error = field.validate?.(value, values || {}) || ''
  const hint = field.hint ? <span className="ad-field-hint ad-cf-hint">{field.hint}</span> : null
  const errorNote = error ? <span className="ad-field-error" role="alert">{error}</span> : null
  const inputClass = `ad-input${error ? ' ad-input--invalid' : ''}`

  switch (field.type) {
    case 'toggle':
      return (
        <label className={`ad-check${value ? ' active' : ''} ad-cf-toggle`}>
          <input type="checkbox" checked={Boolean(value)} disabled={disabled}
            onChange={e => onChange(e.target.checked)} hidden />
          <span className="ad-check-dot" aria-hidden="true" />
          {field.label}
        </label>
      )

    case 'select':
      return (
        <label className="ad-field">
          <span className="ad-field-label">{field.label}</span>
          {hint}
          <select className={inputClass} value={value || ''} disabled={disabled}
            onChange={e => onChange(e.target.value)}>
            {!value && <option value="">Choose…</option>}
            {/* A saved value that's no longer offered stays visible rather than silently showing option 1. */}
            {value && !(field.options || []).some(o => o.value === value) && (
              <option value={value}>{value} (not in the list — choose another)</option>
            )}
            {(field.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {errorNote}
        </label>
      )

    case 'textarea':
      return (
        <label className="ad-field">
          <span className="ad-field-label">{field.label}</span>
          {hint}
          <textarea className="ad-textarea" rows={field.rows || 3} value={value || ''}
            placeholder={field.placeholder} disabled={disabled}
            onChange={e => onChange(e.target.value)} />
          {errorNote}
        </label>
      )

    case 'image':
      // ImagePicker has no disabled state of its own, so a read-only role gets
      // a no-op handler rather than a live upload button.
      return (
        <div className="ad-field">
          <span className="ad-field-label">{field.label}</span>
          <ImagePicker value={value || ''} onChange={disabled ? () => {} : onChange} />
        </div>
      )

    case 'icon':
      return (
        <label className="ad-field">
          <span className="ad-field-label">{field.label}</span>
          <input className="ad-input ad-input--icon" value={value || ''} disabled={disabled}
            onChange={e => onChange(e.target.value)} />
        </label>
      )

    case 'strings':
      return (
        <StringList field={field} value={Array.isArray(value) ? value : []}
          onChange={onChange} disabled={disabled} />
      )

    case 'list':
      return (
        <ObjectList field={field} value={Array.isArray(value) ? value : []}
          onChange={onChange} disabled={disabled} />
      )

    default:
      return (
        <label className="ad-field">
          <span className="ad-field-label">{field.label}</span>
          {hint}
          <input className={inputClass} value={value || ''} placeholder={field.placeholder}
            disabled={disabled} onChange={e => onChange(e.target.value)} />
          {errorNote}
        </label>
      )
  }
}

/** Repeater of plain strings — used for long-form body paragraphs. */
function StringList({ field, value, onChange, disabled }) {
  function update(i, next) {
    onChange(value.map((v, j) => (j === i ? next : v)))
  }
  function move(i, delta) {
    const to = i + delta
    if (to < 0 || to >= value.length) return
    const next = [...value]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }

  return (
    <div className="ad-field">
      <span className="ad-field-label">{field.label}</span>
      {value.length === 0 && <p className="ad-cf-none">Nothing here yet.</p>}
      {value.map((item, i) => (
        <div key={i} className="ad-cf-item">
          <div className="ad-cf-item-head">
            <span className="ad-cf-item-num">{field.itemLabel || 'Item'} {i + 1}</span>
            <ItemControls index={i} total={value.length} disabled={disabled}
              onMove={move} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
          <textarea className="ad-textarea" rows={4} value={item} disabled={disabled}
            onChange={e => update(i, e.target.value)} />
        </div>
      ))}
      {!disabled && (
        <button type="button" className="ad-btn ad-btn--soft ad-btn--sm ad-cf-add"
          onClick={() => onChange([...value, ''])}>
          + Add {(field.itemLabel || 'item').toLowerCase()}
        </button>
      )}
    </div>
  )
}

/** Repeater of objects — used for stat rows, principles, trust points, links. */
function ObjectList({ field, value, onChange, disabled }) {
  function update(i, key, next) {
    onChange(value.map((item, j) => (j === i ? { ...item, [key]: next } : item)))
  }
  function move(i, delta) {
    const to = i + delta
    if (to < 0 || to >= value.length) return
    const next = [...value]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }

  // The first text-ish sub-field doubles as the row's summary label.
  const titleKey = (field.fields || []).find(f => f.type !== 'image' && f.type !== 'icon')?.key

  return (
    <div className="ad-field">
      <span className="ad-field-label">{field.label}</span>
      {value.length === 0 && <p className="ad-cf-none">Nothing here yet.</p>}
      {value.map((item, i) => (
        <div key={i} className="ad-cf-item">
          <div className="ad-cf-item-head">
            <span className="ad-cf-item-num">
              {field.itemLabel || 'Item'} {i + 1}
              {titleKey && item[titleKey]
                ? <em className="ad-cf-item-name">{item[titleKey]}</em>
                : null}
            </span>
            <ItemControls index={i} total={value.length} disabled={disabled}
              onMove={move} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
          <SectionFields
            fields={field.fields || []}
            values={item}
            onChange={(key, next) => update(i, key, next)}
            disabled={disabled}
          />
        </div>
      ))}
      {!disabled && (
        <button type="button" className="ad-btn ad-btn--soft ad-btn--sm ad-cf-add"
          onClick={() => onChange([...value, emptyListItem(field)])}>
          + Add {(field.itemLabel || 'item').toLowerCase()}
        </button>
      )}
    </div>
  )
}

function ItemControls({ index, total, disabled, onMove, onRemove }) {
  if (disabled) return null
  return (
    <span className="ad-cf-item-ctrls">
      <button type="button" className="ad-icon-btn" aria-label="Move up"
        disabled={index === 0} onClick={() => onMove(index, -1)}>↑</button>
      <button type="button" className="ad-icon-btn" aria-label="Move down"
        disabled={index === total - 1} onClick={() => onMove(index, 1)}>↓</button>
      <button type="button" className="ad-icon-btn" aria-label="Remove"
        onClick={onRemove}>✕</button>
    </span>
  )
}
