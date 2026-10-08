'use client'
import { useRef, useState } from 'react'
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
          <textarea className={`${inputClass} ad-textarea`} rows={field.rows || 3} value={value || ''}
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
          <textarea className="ad-input ad-textarea" rows={4} value={item} disabled={disabled}
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

/**
 * A list field shown as its own card: the items as rows first, with Edit and
 * Delete on each and Add at the top. Edit opens that one item's fields under
 * its row. Same `value`/`onChange` contract as ObjectList, so saving and
 * validation are unchanged.
 */
export function ListCard({ field, value, onChange, disabled, dirty }) {
  const items = Array.isArray(value) ? value : []
  // Which row is open is part of the unsaved draft, so it stays local.
  const [open, setOpen] = useState(null)
  // The open row as it was before Edit, so Cancel can put it back (or drop
  // it again when it was just added).
  const before = useRef(null)
  const itemLabel = (field.itemLabel || 'item').toLowerCase()
  const subFields = field.fields || []
  const titleKey = subFields.find(f => f.type !== 'image' && f.type !== 'icon')?.key

  function update(i, key, next) {
    onChange(items.map((item, j) => (j === i ? { ...item, [key]: next } : item)))
  }
  function add() {
    onChange([...items, emptyListItem(field)])
    before.current = { isNew: true }
    setOpen(items.length)
  }
  function edit(i) {
    before.current = { item: items[i] }
    setOpen(i)
  }
  function cancel() {
    const snap = before.current
    if (open !== null && snap) {
      onChange(snap.isNew
        ? items.filter((_, j) => j !== open)
        : items.map((item, j) => (j === open ? snap.item : item)))
    }
    before.current = null
    setOpen(null)
  }
  function done() {
    before.current = null
    setOpen(null)
  }
  function remove(i) {
    onChange(items.filter((_, j) => j !== i))
    setOpen(o => (o === i ? null : o !== null && o > i ? o - 1 : o))
  }
  function move(i, delta) {
    const to = i + delta
    if (to < 0 || to >= items.length) return
    const next = [...items]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
    setOpen(o => (o === i ? to : o === to ? i : o))
  }

  return (
    <section className={`ad-fieldset ad-cf-sec ad-cf-list${dirty ? ' ad-cf-sec--dirty' : ''}`}>
      <div className="ad-cf-list-head">
        <div className="ad-cf-list-title">
          <h3 className="ad-cf-sec-title">{field.label}</h3>
          <span className="ad-badge">{items.length}</span>
        </div>
        {!disabled && (
          <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={add}>
            + Add {itemLabel}
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="ad-cf-list-empty">
          No {itemLabel}s yet.{!disabled && ` Use “+ Add ${itemLabel}” to create one.`}
        </p>
      )}

      <ul className="ad-cf-rows">
        {items.map((item, i) => {
          const isOpen = open === i
          const errors = countFieldErrors(subFields, item)
          const summary = visibleFields(subFields, item)
            .filter(f => f.key !== titleKey && f.type !== 'list')
            .map(f => displayValue(f, item[f.key]))
            .filter(Boolean)
          return (
            <li key={i} className={`ad-cf-row${isOpen ? ' ad-cf-row--open' : ''}`}>
              <div className="ad-cf-row-main">
                <span className="ad-cf-row-num">{i + 1}</span>
                <div className="ad-cf-row-text">
                  <span className={`ad-cf-row-title${titleKey && item[titleKey] ? '' : ' ad-muted'}`}>
                    {(titleKey && item[titleKey]) || `Untitled ${itemLabel}`}
                  </span>
                  {summary.length > 0 && <span className="ad-cf-row-sub">{summary.join(' · ')}</span>}
                </div>
                {errors > 0 && <span className="ad-cf-row-warn">Needs fixing</span>}
                <div className="ad-cf-row-actions">
                  {!disabled && (
                    <>
                      <button type="button" className="ad-icon-btn" aria-label="Move up"
                        disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                      <button type="button" className="ad-icon-btn" aria-label="Move down"
                        disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                    </>
                  )}
                  {!isOpen && (
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                      aria-expanded={false} onClick={() => edit(i)}>
                      {disabled ? 'View' : 'Edit'}
                    </button>
                  )}
                  {!disabled && (
                    <button type="button" className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => remove(i)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {isOpen && (
                <div className="ad-cf-row-edit">
                  <SectionFields
                    fields={subFields}
                    values={item}
                    onChange={(key, next) => update(i, key, next)}
                    disabled={disabled}
                  />
                  <div className="ad-cf-row-edit-foot">
                    {disabled ? (
                      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={done}>
                        Close
                      </button>
                    ) : (
                      <>
                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={cancel}>
                          Cancel
                        </button>
                        <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={done}>
                          Done
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** A sub-field's value as short row text — a select shows its option label. */
function displayValue(field, value) {
  if (value === undefined || value === null || value === '') return ''
  if (field.type === 'select') return field.options?.find(o => o.value === value)?.label || value
  if (field.type === 'image' || field.type === 'toggle') return ''
  return String(value)
}

/**
 * Single-value fields (headings, text) shown read-only first, with Edit in the
 * corner. Edit swaps in the inputs; Done keeps the changes in the draft (saved
 * from the editor's save bar as before) and Cancel puts the fields back as
 * they were when Edit was pressed.
 *
 * `snapshot()` / `restore(snap)` come from the editor so Cancel covers every
 * locale, not just the one on screen. `editActions` (e.g. Reset to default)
 * only show while editing.
 */
export function FieldsCard({
  title, hint, fields, values, onChange, disabled, dirty, editActions, snapshot, restore,
}) {
  // Whether the inputs are showing is screen-only state, like an open row.
  const [editing, setEditing] = useState(false)
  const before = useRef(null)

  function edit() {
    before.current = snapshot?.()
    setEditing(true)
  }
  function cancel() {
    if (before.current !== undefined && before.current !== null) restore?.(before.current)
    before.current = null
    setEditing(false)
  }
  const shown = visibleFields(fields, values)
  const errors = countFieldErrors(fields, values)

  return (
    <section className={`ad-fieldset ad-cf-sec${dirty ? ' ad-cf-sec--dirty' : ''}`}>
      <div className={`ad-cf-sec-head${shown.length ? '' : ' ad-cf-sec-head--solo'}`}>
        <div>
          <h2 className="ad-cf-panel-title">{title}</h2>
          {hint && <p className="ad-cf-sec-hint">{hint}</p>}
        </div>
        <div className="ad-cf-row-actions">
          {!editing && errors > 0 && <span className="ad-cf-row-warn">Needs fixing</span>}
          {shown.length > 0 && (editing ? (
            disabled ? (
              <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() => setEditing(false)}>
                Close
              </button>
            ) : (
              <>
                {editActions}
                <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={cancel}>
                  Cancel
                </button>
                <button type="button" className="ad-btn ad-btn--primary ad-btn--sm"
                  onClick={() => { before.current = null; setEditing(false) }}>
                  Done
                </button>
              </>
            )
          ) : (
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={edit}>
              {disabled ? 'View' : 'Edit'}
            </button>
          ))}
        </div>
      </div>

      {shown.length > 0 && (editing ? (
        <SectionFields fields={fields} values={values} onChange={onChange} disabled={disabled} />
      ) : (
        <dl className="ad-cf-view">
          {shown.map(f => {
            const text = displayValue(f, values?.[f.key])
            const error = f.validate?.(values?.[f.key], values || {})
            return (
              <div key={f.key} className={`ad-cf-view-row${f.type === 'textarea' ? ' ad-cf-view-row--wide' : ''}`}>
                <dt>{f.label}</dt>
                <dd className={text ? '' : 'ad-cf-view-empty'}>
                  {f.type === 'image' && values?.[f.key]
                    ? <img src={values[f.key]} alt="" className="ad-cf-view-img" />
                    : text || 'Not set — hidden on the website'}
                  {error && <span className="ad-field-error">{error}</span>}
                </dd>
              </div>
            )
          })}
        </dl>
      ))}
    </section>
  )
}
