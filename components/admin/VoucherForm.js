'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { VOUCHER_TYPE_OPTIONS, BADGE_STYLE_OPTIONS } from '@/lib/admin/seed'
import CountryFields from './CountryFields'
import ImagePicker from './ImagePicker'

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

export default function VoucherForm({ initial, isNew, onClose }) {
  const { vouchers, upsertVoucher } = useAdmin()
  // Back-fill `regions` for vouchers saved before it existed.
  const [form, setForm] = useState(() => {
    const base = cloneSafe(initial)
    return { ...base, regions: Array.isArray(base.regions) ? base.regions : [] }
  })
  const [error, setError] = useState('')
  const originalId = isNew ? null : initial.id

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function submit(e) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return setError('Title is required.')
    if (!form.description.trim()) return setError('Description is required.')

    const id = form.id.trim() || slugify(title)
    const clash = vouchers.some(v => v.id === id && v.id !== originalId)
    if (clash) return setError(`The id "${id}" is already in use.`)

    upsertVoucher(
      { ...form, id, title, price: form.price === '' ? '' : Number(form.price) },
      originalId,
    )
    onClose()
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New voucher' : 'Edit voucher'}</h1>
          <p className="ad-view-sub">{isNew ? 'Add a gift card or offer.' : form.id}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create voucher' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Details</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Title *</span>
              <input className="ad-input" value={form.title}
                onChange={e => set('title', e.target.value)} placeholder="e.g. Gift Card" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">ID</span>
              <input className="ad-input" value={form.id} disabled={!isNew}
                placeholder={slugify(form.title) || 'auto-generated'}
                onChange={e => set('id', e.target.value)} />
            </label>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Subtitle</span>
            <input className="ad-input" value={form.subtitle}
              onChange={e => set('subtitle', e.target.value)}
              placeholder="e.g. AED 500 treatment credit" />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">Description *</span>
            <textarea className="ad-input ad-textarea" rows={3} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What the voucher includes." />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">Redemption terms</span>
            <textarea className="ad-input ad-textarea" rows={2} value={form.redemptionTerms}
              onChange={e => set('redemptionTerms', e.target.value)}
              placeholder="e.g. Valid for 6 months from purchase date." />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Pricing</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Price</span>
              <input className="ad-input" type="number" min="0" value={form.price}
                onChange={e => set('price', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Currency</span>
              <input className="ad-input" value={form.currency}
                onChange={e => set('currency', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Availability</legend>
          <CountryFields
            countries={form.regions}
            showPricing={false}
            onChange={({ countries }) => set('regions', countries)}
          />
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Classification</legend>
          <div className="ad-grid3">
            <label className="ad-field">
              <span className="ad-field-label">Type</span>
              <select className="ad-input" value={form.type}
                onChange={e => set('type', e.target.value)}>
                {VOUCHER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Badge label</span>
              <input className="ad-input" value={form.badge}
                onChange={e => set('badge', e.target.value)} placeholder="e.g. Most Popular" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Badge style</span>
              <select className="ad-input" value={form.badgeStyle}
                onChange={e => set('badgeStyle', e.target.value)}>
                {BADGE_STYLE_OPTIONS.map(b => <option key={b || 'none'} value={b}>{b || '— none —'}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Image</legend>
          <ImagePicker value={form.img} onChange={v => set('img', v)} />
        </fieldset>
      </div>
    </form>
  )
}
