'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import LocaleToggle from './LocaleToggle'
import ImagePicker from './ImagePicker'

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// The vertical page hero renders full-bleed at ~2:1 (see vp-hero in the
// website's globals.css) — anything far off that gets cropped hard by
// object-fit: cover. This is a nudge, not a hard rule, so a slightly off
// image is still allowed through.
const HERO_MIN_RATIO = 1.8
const HERO_MAX_RATIO = 2.2

const empty = {
  id: '', label: '', labelAr: '', hint: '', color: '#6E5A96', heroImage: '',
  heroEyebrow: '', heroHeadline: '', heroHeadlineEm: '', heroSub: '',
  heroTrustPoints: [], heroStats: [],
  heroEyebrowAr: '', heroHeadlineAr: '', heroHeadlineEmAr: '', heroSubAr: '',
  heroTrustPointsAr: [], heroStatsAr: [],
}

export default function VerticalsView() {
  const { verticals, services, upsertVertical, deleteVertical, allowed, saving } = useAdmin()
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
        saving={saving}
        onSave={async (rec, orig) => {
          // Only leave the editor once the write actually lands — closing
          // early (as this used to) meant a failed save's rollback and error
          // toast appeared back on the list, with no sign of which edit had
          // failed or that it was still in flight.
          const ok = await upsertVertical(rec, orig)
          if (ok) setEditing(null)
        }}
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
 * `hint`/`color` have no backend column (KA-30) — edited here anyway
 * (per KA-30) but `persistVerticals` (lib/admin/store-api.js) only ever
 * sends `slug`/`translations` to the backend, so these never make it past
 * a save; a reload of this vertical from the API comes back blank again.
 */
function VerticalForm({ initial, isNew, existing, saving, onSave, onClose }) {
  const [form, setForm] = useState({
    ...empty, ...initial,
    // A native color input needs a valid hex value — an existing vertical
    // fetched with no color set yet (backend returns '') would otherwise
    // land here as '', which the browser just silently swaps for black.
    color: initial.color || '#6E5A96',
  })
  const [error, setError] = useState('')
  const [heroImageWarning, setHeroImageWarning] = useState('')
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'
  const eyebrowKey = isAr ? 'heroEyebrowAr' : 'heroEyebrow'
  const headlineKey = isAr ? 'heroHeadlineAr' : 'heroHeadline'
  const headlineEmKey = isAr ? 'heroHeadlineEmAr' : 'heroHeadlineEm'
  const subKey = isAr ? 'heroSubAr' : 'heroSub'
  const trustPointsKey = isAr ? 'heroTrustPointsAr' : 'heroTrustPoints'
  const statsKey = isAr ? 'heroStatsAr' : 'heroStats'

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  // Only a freshly-uploaded file can be measured here — a pasted URL/path
  // may not even be reachable from the browser (private bucket, CORS), so
  // that case is let through unchecked rather than silently failing closed.
  function setHeroImage(value) {
    set('heroImage', value)
    if (typeof value !== 'string' || !value.startsWith('data:image')) {
      setHeroImageWarning('')
      return
    }
    const img = new window.Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      if (ratio < HERO_MIN_RATIO || ratio > HERO_MAX_RATIO) {
        setHeroImageWarning(
          `This image is ${ratio.toFixed(2)}:1 — the hero banner shows best around 2:1 `
          + `(e.g. 1920×1000px). It'll still save, but may look cropped or squeezed on the site.`
        )
      } else {
        setHeroImageWarning('')
      }
    }
    img.onerror = () => setHeroImageWarning('')
    img.src = value
  }

  // ── Trust points (repeatable icon + label + hint) — EN or AR depending on the active tab ──
  function addTrustPoint() {
    setForm(f => ({ ...f, [trustPointsKey]: [...f[trustPointsKey], { icon: '', label: '', hint: '' }] }))
  }
  function updateTrustPoint(idx, field, value) {
    setForm(f => ({
      ...f,
      [trustPointsKey]: f[trustPointsKey].map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }))
  }
  function removeTrustPoint(idx) {
    setForm(f => ({ ...f, [trustPointsKey]: f[trustPointsKey].filter((_, i) => i !== idx) }))
  }

  // ── Stats (repeatable value + label) — EN or AR depending on the active tab ──
  function addStat() {
    setForm(f => ({ ...f, [statsKey]: [...f[statsKey], { value: '', label: '' }] }))
  }
  function updateStat(idx, field, value) {
    setForm(f => ({
      ...f,
      [statsKey]: f[statsKey].map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }))
  }
  function removeStat(idx) {
    setForm(f => ({ ...f, [statsKey]: f[statsKey].filter((_, i) => i !== idx) }))
  }

  function submit(e) {
    e.preventDefault()
    const label = form.label.trim()
    if (!label) return setError('Label is required.')
    const id = (form.id.trim() || slugify(label))
    if (existing.some(v => v.id === id && v.id !== originalId)) {
      return setError(`The slug "${id}" is already in use.`)
    }

    // Trust points/stats need at least a label/value to be worth keeping —
    // same "drop incomplete rows" rule ServiceForm applies to benefits.
    const cleanTrustPoints = list => list
      .map(p => ({ icon: (p.icon || '').trim(), label: (p.label || '').trim(), hint: (p.hint || '').trim() }))
      .filter(p => p.label)
    const cleanStats = list => list
      .map(s => ({ value: (s.value || '').trim(), label: (s.label || '').trim() }))
      .filter(s => s.value && s.label)

    onSave({
      ...initial, id, slug: id, label, labelAr: form.labelAr.trim(),
      hint: form.hint.trim(), color: form.color, heroImage: form.heroImage,
      heroEyebrow: form.heroEyebrow.trim(), heroHeadline: form.heroHeadline.trim(),
      heroHeadlineEm: form.heroHeadlineEm.trim(), heroSub: form.heroSub.trim(),
      heroTrustPoints: cleanTrustPoints(form.heroTrustPoints),
      heroStats: cleanStats(form.heroStats),
      heroEyebrowAr: form.heroEyebrowAr.trim(), heroHeadlineAr: form.heroHeadlineAr.trim(),
      heroHeadlineEmAr: form.heroHeadlineEmAr.trim(), heroSubAr: form.heroSubAr.trim(),
      heroTrustPointsAr: cleanTrustPoints(form.heroTrustPointsAr),
      heroStatsAr: cleanStats(form.heroStatsAr),
    }, originalId)
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose} disabled={saving}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New vertical' : 'Edit vertical'}</h1>
          <p className="ad-view-sub">
            {isNew ? 'Create a top-level treatment group.' : form.id}
          </p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Saving…' : (isNew ? 'Create vertical' : 'Save changes')}
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
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Color</span>
              <input className="ad-input" type="color" value={form.color}
                onChange={e => set('color', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Hint text</span>
              <input className="ad-input" value={form.hint}
                placeholder="Short helper text shown with this vertical"
                onChange={e => set('hint', e.target.value)} />
            </label>
          </div>
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

        <fieldset className="ad-fieldset">
          <legend>Vertical page hero</legend>
          <p className="ad-fieldset-hint">
            Shown at the top of this vertical&apos;s public page. Leave blank to fall back to a plain title.
          </p>
          <div className="ad-field">
            <span className="ad-field-label">Hero image</span>
            <p className="ad-fieldset-hint">
              A wide, landscape photo - about 1920×1000px (roughly 2:1).
            </p>
            <ImagePicker value={form.heroImage} onChange={setHeroImage} />
            {heroImageWarning && <div className="ad-field-warning">{heroImageWarning}</div>}
          </div>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'الشعار (Eyebrow)' : 'Eyebrow'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[eyebrowKey]}
              placeholder="e.g. Men's Treatments"
              onChange={e => set(eyebrowKey, e.target.value)} />
          </label>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'العنوان (Headline)' : 'Headline'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[headlineKey]}
                placeholder="e.g. Built for men."
                onChange={e => set(headlineKey, e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'تتمة العنوان (Headline emphasis)' : 'Headline emphasis'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[headlineEmKey]}
                placeholder="e.g. Backed by medicine."
                onChange={e => set(headlineEmKey, e.target.value)} />
            </label>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'النص الفرعي (Sub text)' : 'Sub text'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={2}
              value={form[subKey]} onChange={e => set(subKey, e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Trust points {isAr ? '(العربية)' : ''}</legend>
          {form[trustPointsKey].map((p, i) => (
            <div key={i} className="ad-repeat-row">
              <div className="ad-repeat-main">
                <div className="ad-grid2">
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={p.icon || ''} placeholder="Icon (e.g. 🩺)"
                    onChange={e => updateTrustPoint(i, 'icon', e.target.value)} />
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={p.label || ''} placeholder="Label"
                    onChange={e => updateTrustPoint(i, 'label', e.target.value)} />
                </div>
                <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={p.hint || ''} placeholder="Hint"
                  onChange={e => updateTrustPoint(i, 'hint', e.target.value)} />
              </div>
              <button type="button" className="ad-icon-btn" onClick={() => removeTrustPoint(i)}
                aria-label="Remove trust point">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={addTrustPoint}>+ Add trust point</button>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Stats {isAr ? '(العربية)' : ''}</legend>
          {form[statsKey].map((s, i) => (
            <div key={i} className="ad-repeat-row">
              <div className="ad-repeat-main">
                <div className="ad-grid2">
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={s.value || ''} placeholder="Value (e.g. 23)"
                    onChange={e => updateStat(i, 'value', e.target.value)} />
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={s.label || ''} placeholder="Label"
                    onChange={e => updateStat(i, 'label', e.target.value)} />
                </div>
              </div>
              <button type="button" className="ad-icon-btn" onClick={() => removeStat(i)}
                aria-label="Remove stat">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={addStat}>+ Add stat</button>
        </fieldset>
      </div>
    </form>
  )
}
