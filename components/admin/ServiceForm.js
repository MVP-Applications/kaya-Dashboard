'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { BADGE_OPTIONS } from '@/lib/admin/seed'

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ServiceForm({ initial, isNew, onClose }) {
  const { verticals, upsertService, services } = useAdmin()
  const [form, setForm] = useState(() => ({
    slug: '', name: '', verticals: [], badge: '',
    what: '', mechanism: '', durationMins: '', sessions: '', downtimeNotes: '',
    benefits: [],
    ...initial,
  }))
  const [error, setError] = useState('')
  const originalSlug = isNew ? null : initial.slug

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }
  function toggleVertical(id) {
    setForm(f => ({
      ...f,
      verticals: f.verticals.includes(id)
        ? f.verticals.filter(v => v !== id)
        : [...f.verticals, id],
    }))
  }

  // ── Benefits (repeatable, one line of text each) ──
  function addBenefit() {
    setForm(f => ({ ...f, benefits: [...f.benefits, ''] }))
  }
  function updateBenefit(idx, value) {
    setForm(f => ({ ...f, benefits: f.benefits.map((b, i) => (i === idx ? value : b)) }))
  }
  function removeBenefit(idx) {
    setForm(f => ({ ...f, benefits: f.benefits.filter((_, i) => i !== idx) }))
  }

  function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Name is required.')
    const what = form.what.trim()
    if (!what) return setError('"What it is" is required.')
    const mechanism = form.mechanism.trim()
    if (!mechanism) return setError('"How it works" is required.')

    const slug = form.slug.trim() || slugify(name)
    const clash = services.some(s => s.slug === slug && s.slug !== originalSlug)
    if (clash) return setError(`The slug "${slug}" is already in use.`)

    const record = {
      slug,
      name,
      verticals: form.verticals,
      badge: form.badge,
      what,
      mechanism,
      durationMins: form.durationMins,
      sessions: form.sessions,
      downtimeNotes: form.downtimeNotes.trim(),
      benefits: form.benefits.map(b => b.trim()).filter(Boolean),
    }
    upsertService(record, originalSlug)
    onClose()
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New service' : 'Edit service'}</h1>
          <p className="ad-view-sub">
            {isNew ? 'Create a treatment for the site.' : form.slug}
          </p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create service' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Basics</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Name *</span>
              <input className="ad-input" value={form.name}
                onChange={e => set('name', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Slug</span>
              <input className="ad-input" value={form.slug}
                placeholder={slugify(form.name) || 'auto-generated'}
                onChange={e => set('slug', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Classification</legend>
          <div className="ad-field">
            <span className="ad-field-label">Verticals</span>
            <div className="ad-check-grid">
              {verticals.map(v => (
                <label key={v.id} className={`ad-check${form.verticals.includes(v.id) ? ' active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.verticals.includes(v.id)}
                    onChange={() => toggleVertical(v.id)}
                  />
                  <span className="ad-check-dot" style={{ background: v.color }} />
                  {v.label}
                </label>
              ))}
            </div>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Badge</span>
            <select className="ad-input" value={form.badge}
              onChange={e => set('badge', e.target.value)}>
              {BADGE_OPTIONS.map(b => <option key={b || 'none'} value={b}>{b || '— none —'}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Content</legend>
          <label className="ad-field">
            <span className="ad-field-label">What it is *</span>
            <textarea className="ad-input ad-textarea" rows={4} value={form.what}
              onChange={e => set('what', e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">How it works (mechanism) *</span>
            <textarea className="ad-input ad-textarea" rows={3} value={form.mechanism}
              onChange={e => set('mechanism', e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>What to expect</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Duration (minutes)</span>
              <input type="number" min="1" className="ad-input" value={form.durationMins}
                onChange={e => set('durationMins', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Sessions</span>
              <input type="number" min="1" className="ad-input" value={form.sessions}
                onChange={e => set('sessions', e.target.value)} />
            </label>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Downtime</span>
            <input className="ad-input" value={form.downtimeNotes}
              onChange={e => set('downtimeNotes', e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Benefits</legend>
          {form.benefits.map((b, i) => (
            <div key={i} className="ad-repeat-row">
              <div className="ad-repeat-main">
                <input className="ad-input" value={b} placeholder="Benefit"
                  onChange={e => updateBenefit(i, e.target.value)} />
              </div>
              <button type="button" className="ad-icon-btn" onClick={() => removeBenefit(i)}
                aria-label="Remove benefit">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={addBenefit}>+ Add benefit</button>
        </fieldset>
      </div>
    </form>
  )
}
