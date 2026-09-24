'use client'
import ImagePicker from './ImagePicker'
import { BLOCK_TYPES } from '@/lib/admin/page-builder'

/**
 * The settings form for one page-builder block, generated from its schema in
 * BLOCK_TYPES. Localised fields edit `<key>` in English and `<key>Ar` in
 * Arabic; everything else (images, links, pickers) is shared by both.
 */

function keyFor(field, locale) {
  return field.localized && locale === 'AR' ? `${field.key}Ar` : field.key
}

function PickList({ value = [], options, onChange, addLabel, emptyLabel }) {
  const nameOf = Object.fromEntries(options.map(o => [o.value, o.label]))
  const available = options.filter(o => !value.includes(o.value))
  const move = (i, dir) => {
    const to = i + dir
    if (to < 0 || to >= value.length) return
    const next = [...value]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }
  return (
    <div className="ad-pb-picks">
      {value.length === 0 && <span className="ad-field-hint">{emptyLabel}</span>}
      {value.map((v, i) => (
        <div key={v} className="ad-pb-pick">
          <span className="ad-reorder">
            <button type="button" className="ad-reorder-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
            <button type="button" className="ad-reorder-btn" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
          </span>
          <span className={`ad-pb-pick-name${nameOf[v] ? '' : ' ad-pb-pick-name--missing'}`}>
            {nameOf[v] || `${v} (no longer exists)`}
          </span>
          <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => onChange(value.filter(x => x !== v))}>Remove</button>
        </div>
      ))}
      {available.length > 0 && (
        <select className="ad-input" value="" onChange={e => e.target.value && onChange([...value, e.target.value])} aria-label={addLabel}>
          <option value="">{addLabel}</option>
          {available.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  )
}

function Field({ field, data, locale, onChange, services, doctors }) {
  const k = keyFor(field, locale)
  const isAr = field.localized && locale === 'AR'
  const value = data[k]
  const label = isAr ? `${field.label} (Arabic)` : field.label
  const placeholder = isAr ? (data[field.key] || '') : field.placeholder

  switch (field.type) {
    case 'textarea':
      return (
        <label className="ad-field">
          <span className="ad-field-label">{label}</span>
          <textarea className="ad-input ad-textarea" rows={field.rows || 3} dir={isAr ? 'rtl' : undefined}
            value={value || ''} placeholder={placeholder} onChange={e => onChange(k, e.target.value)} />
          {field.hint && <span className="ad-field-hint">{field.hint}</span>}
        </label>
      )
    case 'select':
      return (
        <label className="ad-field">
          <span className="ad-field-label">{label}</span>
          <select className="ad-input" value={value || field.options[0].value} onChange={e => onChange(k, e.target.value)}>
            {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )
    case 'image':
      return (
        <div className="ad-field">
          <span className="ad-field-label">{label}</span>
          <ImagePicker value={value || ''} onChange={v => onChange(k, v)} />
        </div>
      )
    case 'treatments':
      return (
        <div className="ad-field">
          <span className="ad-field-label">{label}</span>
          <PickList value={value} onChange={v => onChange(k, v)} addLabel="+ Add treatment" emptyLabel="No treatments picked yet."
            options={services.map(s => ({ value: s.slug, label: s.name }))} />
        </div>
      )
    case 'doctors':
      return (
        <div className="ad-field">
          <span className="ad-field-label">{label}</span>
          <PickList value={value} onChange={v => onChange(k, v)} addLabel="+ Add doctor" emptyLabel="No doctors picked yet."
            options={doctors.map(d => ({ value: d.slug, label: d.name }))} />
        </div>
      )
    case 'items':
      return <Items field={field} items={value || []} locale={locale} onChange={v => onChange(k, v)} />
    default:
      return (
        <label className={`ad-field${field.width === 'narrow' ? ' ad-pb-narrow' : ''}`}>
          <span className="ad-field-label">{label}</span>
          <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={value || ''} placeholder={placeholder}
            onChange={e => onChange(k, e.target.value)} />
          {field.hint && <span className="ad-field-hint">{field.hint}</span>}
        </label>
      )
  }
}

function Items({ field, items, locale, onChange }) {
  const set = (i, key, v) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)))
  const move = (i, dir) => {
    const to = i + dir
    if (to < 0 || to >= items.length) return
    const next = [...items]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }
  return (
    <div className="ad-field">
      <span className="ad-field-label">{field.label}</span>
      <div className="ad-pb-items">
        {items.map((it, i) => (
          <div key={i} className="ad-pb-item">
            <div className="ad-pb-item-head">
              <span className="ad-pb-item-n">{i + 1}</span>
              <span className="ad-reorder">
                <button type="button" className="ad-reorder-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                <button type="button" className="ad-reorder-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
              </span>
              <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
            </div>
            {field.itemFields.map(f => (
              <Field key={f.key} field={f} data={it} locale={locale} onChange={(key, v) => set(i, key, v)} services={[]} doctors={[]} />
            ))}
          </div>
        ))}
        <button type="button" className="ad-btn ad-btn--soft ad-btn--sm ad-pb-add-item"
          onClick={() => onChange([...items, { ...field.emptyItem }])}>
          {field.addLabel || '+ Add'}
        </button>
      </div>
    </div>
  )
}

export default function BlockFields({ block, locale, onChange, services = [], doctors = [] }) {
  const def = BLOCK_TYPES[block.type]
  const set = (key, value) => onChange({ ...block.data, [key]: value })
  return (
    <div className="ad-pb-fields">
      {def.fields.filter(f => !f.showIf || f.showIf(block.data)).map(f => (
        <Field key={f.key} field={f} data={block.data} locale={locale} onChange={set} services={services} doctors={doctors} />
      ))}
    </div>
  )
}
