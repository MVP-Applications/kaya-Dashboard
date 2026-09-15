'use client'
import { useEffect, useState } from 'react'
import { useAdmin } from './AdminContext'
import { COUNTRY_OPTIONS } from '@/lib/admin/seed'
import { fetchClinicOptions } from '@/lib/admin/store'

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

export default function DoctorForm({ initial, isNew, onClose }) {
  const { verticals, services, doctors, upsertDoctor } = useAdmin()
  const [form, setForm] = useState(() => ({ image: '', ...cloneSafe(initial) }))
  const [error, setError] = useState('')
  const [clinicOptions, setClinicOptions] = useState([])
  const originalSlug = isNew ? null : initial.slug

  useEffect(() => {
    let cancelled = false
    fetchClinicOptions()
      .then(options => { if (!cancelled) setClinicOptions(options) })
      .catch(() => {}) // Clinics is a supporting field, not worth an error banner over.
    return () => { cancelled = true }
  }, [])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function toggleIn(field, value) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }))
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('image', reader.result)
    reader.readAsDataURL(file)
  }

  // list-of-strings helpers (languages)
  function updateItem(field, idx, value) {
    setForm(f => ({ ...f, [field]: f[field].map((s, i) => (i === idx ? value : s)) }))
  }
  function addItem(field) { setForm(f => ({ ...f, [field]: [...f[field], ''] })) }
  function removeItem(field, idx) {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }))
  }

  function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Name is required.')

    const slug = form.slug.trim() || slugify(name)
    const clash = doctors.some(d => d.slug === slug && d.slug !== originalSlug)
    if (clash) return setError(`The slug "${slug}" is already in use.`)

    const record = {
      ...form,
      name,
      slug,
      yearsExp: form.yearsExp === '' ? '' : Number(form.yearsExp),
      languages: form.languages.map(s => s.trim()).filter(Boolean),
    }
    upsertDoctor(record, originalSlug)
    onClose()
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New doctor' : 'Edit doctor'}</h1>
          <p className="ad-view-sub">{isNew ? 'Add a physician profile.' : form.slug}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create doctor' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Profile</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Name *</span>
              <input className="ad-input" value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Dr. …" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Slug</span>
              <input className="ad-input" value={form.slug}
                placeholder={slugify(form.name) || 'auto-generated'}
                onChange={e => set('slug', e.target.value)} />
            </label>
          </div>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Specialist / title</span>
              <input className="ad-input" value={form.specialist}
                onChange={e => set('specialist', e.target.value)}
                placeholder="e.g. Dermatologist & Aesthetic Physician" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Years of experience</span>
              <input className="ad-input" type="number" min="0" value={form.yearsExp}
                onChange={e => set('yearsExp', e.target.value)} />
            </label>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Bio</span>
            <textarea className="ad-input ad-textarea" rows={5} value={form.bio}
              onChange={e => set('bio', e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Photo</legend>
          <div className="ad-image-field">
            <div className="ad-image-preview ad-image-preview--doc">
              {form.image
                ? <img src={form.image} alt="" />
                : (
                  <div className="ad-image-ph">
                    <span className="ad-image-ph-icon" aria-hidden="true">👤</span>
                    <span>No photo yet</span>
                  </div>
                )}
            </div>
            <div className="ad-image-actions">
              <label className="ad-btn ad-btn--soft ad-file-btn">
                {form.image ? 'Replace photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handleImage} hidden />
              </label>
              {form.image && (
                <button type="button" className="ad-btn ad-btn--ghost" onClick={() => set('image', '')}>
                  Remove
                </button>
              )}
              <label className="ad-field ad-image-url">
                <span className="ad-field-label">or paste an image URL / path</span>
                <input className="ad-input" value={form.image?.startsWith('data:') ? '' : (form.image || '')}
                  placeholder="/Assets/doctor.jpg"
                  onChange={e => set('image', e.target.value)} />
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Classification</legend>
          <div className="ad-field">
            <span className="ad-field-label">Verticals</span>
            <div className="ad-check-grid">
              {verticals.map(v => (
                <label key={v.id} className={`ad-check${form.verticals.includes(v.id) ? ' active' : ''}`}>
                  <input type="checkbox" checked={form.verticals.includes(v.id)}
                    onChange={() => toggleIn('verticals', v.id)} />
                  <span className="ad-check-dot" style={{ background: v.color }} />
                  {v.label}
                </label>
              ))}
            </div>
          </div>
          <div className="ad-field">
            <span className="ad-field-label">Countries</span>
            <div className="ad-check-grid">
              {COUNTRY_OPTIONS.map(c => (
                <label key={c} className={`ad-check${form.countries.includes(c) ? ' active' : ''}`}>
                  <input type="checkbox" checked={form.countries.includes(c)}
                    onChange={() => toggleIn('countries', c)} />
                  {c}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Languages</legend>
          {form.languages.map((s, i) => (
            <div key={i} className="ad-repeat-row">
              <input className="ad-input" value={s}
                onChange={e => updateItem('languages', i, e.target.value)} placeholder="e.g. Arabic" />
              <button type="button" className="ad-icon-btn" onClick={() => removeItem('languages', i)}
                aria-label="Remove language">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={() => addItem('languages')}>+ Add language</button>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Clinics</legend>
          {clinicOptions.length === 0 ? (
            <p className="ad-muted">No clinics available yet.</p>
          ) : (
            <div className="ad-check-grid">
              {clinicOptions.map(c => (
                <label key={c.id} className={`ad-check${form.clinics.includes(c.id) ? ' active' : ''}`}>
                  <input type="checkbox" checked={form.clinics.includes(c.id)}
                    onChange={() => toggleIn('clinics', c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Treatments offered</legend>
          <p className="ad-fieldset-hint">Linked to your Treatments &amp; Services.</p>
          {services.length === 0 ? (
            <p className="ad-muted">No services available yet.</p>
          ) : (
            <div className="ad-check-grid ad-check-grid--3">
              {services.map(s => (
                <label key={s.slug} className={`ad-check${form.treatments.includes(s.slug) ? ' active' : ''}`}>
                  <input type="checkbox" checked={form.treatments.includes(s.slug)}
                    onChange={() => toggleIn('treatments', s.slug)} />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>
    </form>
  )
}
