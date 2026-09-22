'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { BADGE_OPTIONS, THUMB_OPTIONS } from '@/lib/admin/seed'
import LocaleToggle from './LocaleToggle'
import ImagePicker from './ImagePicker'

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ServiceForm({ initial, isNew, onClose }) {
  const { verticals, categories, upsertService, services } = useAdmin()
  const [form, setForm] = useState(() => ({
    slug: '', name: '', image: '', thumb: '', category: '', verticals: [], badge: '',
    isPopular: false,
    sub: '', what: '', mechanism: '', durationMins: '', sessions: '',
    downtimeNotes: '', downtimeLevel: '', suitable: [],
    benefits: [],
    nameAr: '', subAr: '', whatAr: '', mechanismAr: '', suitableAr: [], benefitsAr: [],
    durationMinsAr: '', sessionsAr: '', downtimeNotesAr: '', downtimeLevelAr: '',
    ...initial,
  }))
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('EN')
  const originalSlug = isNew ? null : initial.slug

  const isAr = locale === 'AR'
  const nameKey = isAr ? 'nameAr' : 'name'
  const subKey = isAr ? 'subAr' : 'sub'
  const whatKey = isAr ? 'whatAr' : 'what'
  const mechanismKey = isAr ? 'mechanismAr' : 'mechanism'
  const suitableKey = isAr ? 'suitableAr' : 'suitable'
  const benefitsKey = isAr ? 'benefitsAr' : 'benefits'
  const durationKey = isAr ? 'durationMinsAr' : 'durationMins'
  const sessionsKey = isAr ? 'sessionsAr' : 'sessions'
  const downtimeNotesKey = isAr ? 'downtimeNotesAr' : 'downtimeNotes'
  const downtimeLevelKey = isAr ? 'downtimeLevelAr' : 'downtimeLevel'

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

  // ── Benefits (repeatable icon + title + description) — EN or AR depending on the active tab ──
  function addBenefit() {
    setForm(f => ({ ...f, [benefitsKey]: [...f[benefitsKey], { i: '', t: '', d: '' }] }))
  }
  function updateBenefit(idx, field, value) {
    setForm(f => ({
      ...f,
      [benefitsKey]: f[benefitsKey].map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    }))
  }
  function removeBenefit(idx) {
    setForm(f => ({ ...f, [benefitsKey]: f[benefitsKey].filter((_, i) => i !== idx) }))
  }

  // ── Suitable for (repeatable, one line of text each) — EN or AR depending on the active tab ──
  function addSuitable() {
    setForm(f => ({ ...f, [suitableKey]: [...f[suitableKey], ''] }))
  }
  function updateSuitable(idx, value) {
    setForm(f => ({ ...f, [suitableKey]: f[suitableKey].map((s, i) => (i === idx ? value : s)) }))
  }
  function removeSuitable(idx) {
    setForm(f => ({ ...f, [suitableKey]: f[suitableKey].filter((_, i) => i !== idx) }))
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

    // The backend requires a title per benefit (not a description) — a row
    // with only an icon/description typed in is dropped as incomplete.
    const cleanBenefits = list => list
      .map(b => ({ i: b.i.trim(), t: b.t.trim(), d: b.d.trim() }))
      .filter(b => b.t)

    const record = {
      id: form.id,
      slug,
      name,
      image: form.image,
      thumb: form.thumb,
      category: form.category,
      verticals: form.verticals,
      badge: form.badge,
      isPopular: form.isPopular,
      sub: form.sub.trim(),
      what,
      mechanism,
      durationMins: form.durationMins,
      sessions: form.sessions,
      downtimeNotes: form.downtimeNotes.trim(),
      downtimeLevel: form.downtimeLevel.trim(),
      suitable: form.suitable.map(s => s.trim()).filter(Boolean),
      benefits: cleanBenefits(form.benefits),
      nameAr: form.nameAr.trim(),
      subAr: form.subAr.trim(),
      whatAr: form.whatAr.trim(),
      mechanismAr: form.mechanismAr.trim(),
      suitableAr: form.suitableAr.map(s => s.trim()).filter(Boolean),
      benefitsAr: cleanBenefits(form.benefitsAr),
      durationMinsAr: form.durationMinsAr.trim(),
      sessionsAr: form.sessionsAr.trim(),
      downtimeNotesAr: form.downtimeNotesAr.trim(),
      downtimeLevelAr: form.downtimeLevelAr.trim(),
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
          <label className="ad-field">
            <span className="ad-field-label">Slug</span>
            <input className="ad-input" value={form.slug}
              placeholder={slugify(form.name) || 'auto-generated'}
              onChange={e => set('slug', e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Media</legend>
          <div className="ad-field">
            <span className="ad-field-label">Image</span>
            <ImagePicker value={form.image} onChange={v => set('image', v)} />
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Icon</span>
            <select className="ad-input" value={form.thumb}
              onChange={e => set('thumb', e.target.value)}>
              <option value="">— none —</option>
              {THUMB_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
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
            <span className="ad-field-label">Category</span>
            <select className="ad-input" value={form.category}
              onChange={e => set('category', e.target.value)}>
              <option value="">— none —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="ad-field">
            <span className="ad-field-label">Badge</span>
            <select className="ad-input" value={form.badge}
              onChange={e => set('badge', e.target.value)}>
              {BADGE_OPTIONS.map(b => <option key={b.value || 'none'} value={b.value}>{b.label}</option>)}
            </select>
          </label>
          <label className="ad-field ad-field--toggle">
            <span className="ad-field-label">Popular</span>
            <label className="ad-check">
              <input type="checkbox" checked={form.isPopular}
                onChange={e => set('isPopular', e.target.checked)} />
              Show this treatment in the site&apos;s Popular treatments section
            </label>
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Name &amp; content</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic Name, &quot;What it is&quot;
            and &quot;How it works&quot; to add an Arabic translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'الاسم (Name)' : 'Name *'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[nameKey]}
              onChange={e => set(nameKey, e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'مقتطف قصير (Short teaser)' : 'Short teaser'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[subKey]}
              placeholder="A one-line summary shown on service cards"
              onChange={e => set(subKey, e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'ما هو (What it is)' : 'What it is *'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={4}
              value={form[whatKey]} onChange={e => set(whatKey, e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'كيف يعمل (How it works)' : 'How it works (mechanism) *'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={3}
              value={form[mechanismKey]} onChange={e => set(mechanismKey, e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>What to expect {isAr ? '(العربية)' : ''}</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic versions so visitors browsing
            in Arabic see these details in Arabic too.
          </p>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'المدة (Duration)' : 'Duration'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[durationKey]}
                placeholder="e.g. 45 mins"
                onChange={e => set(durationKey, e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'الجلسات (Sessions)' : 'Sessions'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[sessionsKey]}
                placeholder="e.g. 3–6 sessions"
                onChange={e => set(sessionsKey, e.target.value)} />
            </label>
          </div>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'فترة التعافي (Downtime)' : 'Downtime'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[downtimeNotesKey]}
                onChange={e => set(downtimeNotesKey, e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">
                {isAr ? 'شدة فترة التعافي (Downtime severity)' : 'Downtime severity'}
              </span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[downtimeLevelKey]}
                placeholder="e.g. Minimal, Mild, Moderate"
                onChange={e => set(downtimeLevelKey, e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Suitable for {isAr ? '(العربية)' : ''}</legend>
          {form[suitableKey].map((s, i) => (
            <div key={i} className="ad-repeat-row">
              <div className="ad-repeat-main">
                <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={s}
                  placeholder="e.g. Oily or acne-prone skin"
                  onChange={e => updateSuitable(i, e.target.value)} />
              </div>
              <button type="button" className="ad-icon-btn" onClick={() => removeSuitable(i)}
                aria-label="Remove">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={addSuitable}>+ Add</button>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Benefits {isAr ? '(العربية)' : ''}</legend>
          {form[benefitsKey].map((b, i) => (
            <div key={i} className="ad-repeat-row">
              <div className="ad-repeat-main">
                <div className="ad-grid2">
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={b.i} placeholder="Icon (e.g. ✦)"
                    onChange={e => updateBenefit(i, 'i', e.target.value)} />
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={b.t} placeholder="Title"
                    onChange={e => updateBenefit(i, 't', e.target.value)} />
                </div>
                <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={b.d} placeholder="Description"
                  onChange={e => updateBenefit(i, 'd', e.target.value)} />
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
