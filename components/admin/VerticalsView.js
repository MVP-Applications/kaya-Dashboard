'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import LocaleToggle from './LocaleToggle'

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const empty = { id: '', label: '' }

export default function VerticalsView() {
  const { verticals, services, upsertVertical, deleteVertical, allowed } = useAdmin()
  const [editing, setEditing] = useState(null) // { initial, isNew }
  const [confirm, setConfirm] = useState(null)

  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  function countFor(id) {
    return services.filter(s => (s.verticals || []).includes(id)).length
  }

  if (editing) {
    return (
      <VerticalForm
        initial={editing.initial}
        isNew={editing.isNew}
        existing={verticals}
        onSave={(rec, orig) => { upsertVertical(rec, orig); setEditing(null) }}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Verticals</h1>
          <p className="ad-view-sub">Top-level treatment groups used across the site.</p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: { ...empty }, isNew: true })}>
            + New vertical
          </button>
        )}
      </div>

      <div className="ad-vert-grid">
        {verticals.map(v => (
          <div key={v.id} className="ad-vert-card">
            <span className="ad-vert-swatch" style={{ background: v.color }} />
            <div className="ad-vert-body">
              <div className="ad-vert-label">{v.label}</div>
              <div className="ad-vert-hint">{v.hint || '—'}</div>
              <div className="ad-vert-meta">
                <span className="ad-vert-id">{v.id}</span>
                <span className="ad-vert-count">{countFor(v.id)} services</span>
              </div>
            </div>
            <div className="ad-vert-actions">
              <button className="ad-btn ad-btn--soft ad-btn--sm"
                onClick={() => setEditing({ initial: v, isNew: false })}>Edit</button>
              {canDelete && (
                <button className="ad-btn ad-btn--danger ad-btn--sm"
                  onClick={() => setConfirm(v.id)}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirm && (
        <div className="ad-drawer-scrim" onClick={() => setConfirm(null)}>
          <div className="ad-confirm" onClick={e => e.stopPropagation()}>
            <h3 className="ad-confirm-title">Delete vertical?</h3>
            <p className="ad-confirm-text">
              Removing <strong>{confirm}</strong> won’t delete its services, but they’ll lose this grouping.
            </p>
            <div className="ad-confirm-actions">
              <button className="ad-btn ad-btn--ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="ad-btn ad-btn--danger"
                onClick={() => { deleteVertical(confirm); setConfirm(null) }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * `hint`/`color` have no backend column (see KA-30) so this form no longer
 * lets anyone edit them — but a record that already has them (from preview
 * seed data) keeps them untouched on save, rather than wiping them, since
 * nothing forces the display grid below to stop reading them.
 */
function VerticalForm({ initial, isNew, existing, onSave, onClose }) {
  const [form, setForm] = useState({ label: '', id: '', labelAr: '', ...initial })
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function submit(e) {
    e.preventDefault()
    const label = form.label.trim()
    if (!label) return setError('Label is required.')
    const id = (form.id.trim() || slugify(label))
    if (existing.some(v => v.id === id && v.id !== originalId)) {
      return setError(`The slug "${id}" is already in use.`)
    }
    onSave({ ...initial, id, slug: id, label, labelAr: form.labelAr.trim() }, originalId)
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New vertical' : 'Edit vertical'}</h1>
          <p className="ad-view-sub">
            {isNew ? 'Create a top-level treatment group.' : form.id}
          </p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create vertical' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Basics</legend>
          <label className="ad-field">
            <span className="ad-field-label">Slug</span>
            <input className="ad-input" value={form.id}
              placeholder={slugify(form.label) || 'auto'}
              onChange={e => set('id', e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Label</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic label to add a translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          {locale === 'EN' ? (
            <label className="ad-field">
              <span className="ad-field-label">Label *</span>
              <input className="ad-input" value={form.label} onChange={e => set('label', e.target.value)} />
            </label>
          ) : (
            <label className="ad-field">
              <span className="ad-field-label">التسمية (Label)</span>
              <input className="ad-input" dir="rtl" value={form.labelAr}
                onChange={e => set('labelAr', e.target.value)} />
            </label>
          )}
        </fieldset>
      </div>
    </form>
  )
}
