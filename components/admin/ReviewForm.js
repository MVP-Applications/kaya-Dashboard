'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import ImagePicker from './ImagePicker'
import LocaleToggle from './LocaleToggle'

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

export default function ReviewForm({ initial, isNew, onClose }) {
  const { services, reviews, upsertReview } = useAdmin()
  const [form, setForm] = useState(() => cloneSafe(initial))
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'
  const nameKey = isAr ? 'nameAr' : 'name'
  const locationKey = isAr ? 'locationAr' : 'location'
  const quoteKey = isAr ? 'quoteAr' : 'quote'

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Name is required.')
    if (!form.quote.trim()) return setError('Quote is required.')

    const id = form.id.trim() || slugify(`${name}-${form.treatment}`) || slugify(name)
    const clash = reviews.some(r => r.id === id && r.id !== originalId)
    if (clash) return setError(`The id "${id}" is already in use.`)

    upsertReview({ ...form, id, name }, originalId)
    onClose()
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New review' : 'Edit review'}</h1>
          <p className="ad-view-sub">{isNew ? 'Add a patient testimonial.' : form.id}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create review' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Patient</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic name and quote to add an Arabic translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'الاسم (Name)' : 'Name *'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[nameKey]}
                onChange={e => set(nameKey, e.target.value)} placeholder="e.g. Sarah A." />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'الموقع (Location)' : 'Location'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[locationKey]}
                onChange={e => set(locationKey, e.target.value)} placeholder="e.g. Dubai" />
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Treatment</legend>
          <label className="ad-field">
            <span className="ad-field-label">Treatment</span>
            <select className="ad-input" value={form.treatment}
              onChange={e => set('treatment', e.target.value)}>
              <option value="">— none —</option>
              {services.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>{isAr ? 'الاقتباس (Quote) *' : 'Quote *'}</legend>
          <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={4} value={form[quoteKey]}
            onChange={e => set(quoteKey, e.target.value)} placeholder="What the patient said…" />
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Rating *</span>
              <select className="ad-input" value={form.rating}
                onChange={e => set('rating', Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
              </select>
            </label>
            <label className="ad-field ad-field--toggle">
              <span className="ad-field-label">Consent</span>
              <label className="ad-check">
                <input type="checkbox" checked={!!form.consentGiven}
                  onChange={e => set('consentGiven', e.target.checked)} />
                Patient consented to this being published
              </label>
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Before</legend>
          <ImagePicker value={form.before} onChange={v => set('before', v)} />
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>After</legend>
          <ImagePicker value={form.after} onChange={v => set('after', v)} />
        </fieldset>
      </div>
    </form>
  )
}
