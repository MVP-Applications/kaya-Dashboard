'use client'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import LocaleToggle from '@/shared/components/LocaleToggle'
import ImagePicker from '@/shared/components/ImagePicker'
import MarketScopeFields from '@/shared/components/MarketScopeFields'
import SlugField from '@/shared/components/SlugField'
import { resolveSlug } from '@/shared/lib/slug'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery } from '@/shared/hooks/useUrlState'
import { useCountryFilter } from '@/shared/hooks/useCountryFilter'

// The vertical page hero renders full-bleed at ~2:1 (see vp-hero in the
// website's globals.css) — anything far off that gets cropped hard by
// object-fit: cover. This is a nudge, not a hard rule, so a slightly off
// image is still allowed through.
const HERO_MIN_RATIO = 1.8
const HERO_MAX_RATIO = 2.2

const empty = {
  id: '', label: '', labelAr: '', hint: '', hintAr: '', color: '#6E5A96', heroImage: '',
  heroEyebrow: '', heroHeadline: '', heroHeadlineEm: '', heroSub: '',
  heroTrustPoints: [], heroStats: [],
  heroEyebrowAr: '', heroHeadlineAr: '', heroHeadlineEmAr: '', heroSubAr: '',
  heroTrustPointsAr: [], heroStatsAr: [],
  countries: [], clinics: [],
}

export default function VerticalsView() {
  const { verticals, services, upsertVertical, deleteVertical, allowed, saving, dataVersion } = useAdmin()
  // The open record lives in the URL (?edit=<id>, ?new=1) so a refresh or a
  // new tab reopens the same screen.
  const { get, set, href } = useQuery()
  // ?country is shared with the top-bar switcher; empty falls back to it.
  const [country, setCountry, countryOptions] = useCountryFilter()
  const editId = get('edit')
  const isNew = get('new') === '1'
  const newVertical = useMemo(() => (isNew ? { ...empty } : null), [isNew])
  const [confirm, setConfirm] = useState(null)
  // The record the open editor was started from. Saving an id rename swaps
  // it out of `verticals` (optimistically) before ?edit catches up, so keep
  // the form on screen instead of flashing "not found" mid-save.
  const held = useRef(null)

  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  // `services` holds one version per country — count treatments (groupId),
  // limited to the filtered country when one is picked.
  function countFor(id) {
    const groups = new Set(services
      .filter(s => (s.verticals || []).includes(id) && (!country || s.country === country))
      .map(s => s.groupId ?? s.id))
    return groups.size
  }

  const shown = country ? verticals.filter(v => (v.countries || []).includes(country)) : verticals

  const closeEditor = () => set({ edit: '', new: '' })

  const found = editId ? verticals.find(v => v.id === editId) : null
  if (found) held.current = found
  else if (held.current?.id !== editId) held.current = null
  const editRecord = found || held.current
  if (editId && !isNew && !editRecord) {
    return <MissingRecord loading={dataVersion === 0} label="vertical" backHref={href({ edit: '' })} />
  }

  if (isNew || editRecord) {
    return (
      <VerticalForm
        key={isNew ? 'new' : editId}
        initial={isNew ? newVertical : editRecord}
        isNew={isNew}
        existing={verticals}
        saving={saving}
        onSave={async (rec, orig) => {
          // Only leave the editor once the write actually lands — closing
          // early (as this used to) meant a failed save's rollback and error
          // toast appeared back on the list, with no sign of which edit had
          // failed or that it was still in flight.
          const ok = await upsertVertical(rec, orig)
          if (ok) closeEditor()
        }}
        onClose={closeEditor}
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
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New vertical
          </Link>
        )}
      </div>

      <div className="ad-toolbar">
        <select className="ad-input ad-filter" value={country} onChange={e => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countryOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      <div className="ad-vert-grid">
        {shown.length === 0 && (
          <div className="ad-empty ad-empty--grid">
            {verticals.length === 0 ? 'No verticals yet.' : 'No verticals in this country.'}
          </div>
        )}
        {shown.map(v => (
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
              <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: v.id })}>Edit</Link>
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
  const hintKey = isAr ? 'hintAr' : 'hint'
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
    if (!form.countries.length) return setError('Pick at least one country.')
    const { slug: id, error: slugError } = resolveSlug(
      form.id, label, existing.map(v => v.id).filter(v => v !== originalId),
    )
    if (slugError) return setError(slugError)

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
      hint: form.hint.trim(), hintAr: form.hintAr.trim(), color: form.color, heroImage: form.heroImage,
      heroEyebrow: form.heroEyebrow.trim(), heroHeadline: form.heroHeadline.trim(),
      heroHeadlineEm: form.heroHeadlineEm.trim(), heroSub: form.heroSub.trim(),
      heroTrustPoints: cleanTrustPoints(form.heroTrustPoints),
      heroStats: cleanStats(form.heroStats),
      heroEyebrowAr: form.heroEyebrowAr.trim(), heroHeadlineAr: form.heroHeadlineAr.trim(),
      heroHeadlineEmAr: form.heroHeadlineEmAr.trim(), heroSubAr: form.heroSubAr.trim(),
      heroTrustPointsAr: cleanTrustPoints(form.heroTrustPointsAr),
      heroStatsAr: cleanStats(form.heroStatsAr),
      countries: form.countries, clinics: form.clinics,
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

      <div className="ad-editor-body ad-form-sections">
        <fieldset className="ad-fieldset">
          <legend>Label</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic label and hint text to add a translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <div className="ad-frow">
            {locale === 'EN' ? (
              <label className="ad-field ad-w-md">
                <span className="ad-field-label">Label *</span>
                <input className="ad-input" value={form.label} onChange={e => set('label', e.target.value)} />
              </label>
            ) : (
              <label className="ad-field ad-w-md">
                <span className="ad-field-label">التسمية (Label)</span>
                <input className="ad-input" dir="rtl" value={form.labelAr}
                  onChange={e => set('labelAr', e.target.value)} />
              </label>
            )}
            <SlugField className="ad-field ad-w-md" value={form.id} source={form.label}
              onChange={v => set('id', v)} />
            <label className="ad-field">
              <span className="ad-field-label">Color</span>
              <input className="ad-color" type="color" value={form.color}
                onChange={e => set('color', e.target.value)} />
            </label>
          </div>
          <label className="ad-field ad-w-xl">
            <span className="ad-field-label">{isAr ? 'نص التلميح (Hint text)' : 'Hint text'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[hintKey]}
              placeholder="Short helper text shown with this vertical"
              onChange={e => set(hintKey, e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Vertical page hero</legend>
          <p className="ad-fieldset-hint">
            Shown at the top of this vertical&apos;s public page. Leave blank to fall back to a plain title.
          </p>
          <div className="ad-split">
            <div className="ad-field">
              <span className="ad-field-label">Hero image</span>
              <ImagePicker value={form.heroImage} onChange={setHeroImage} ratio={16 / 9}
                hint="Full-screen background at the top of the vertical page, about 16:9 on desktop; phones crop it to a tall middle strip. Also used as a short wide strip on the Tell us Everything cards. Use about 1920 × 1080 px with the subject in the centre." />
              {heroImageWarning && <div className="ad-field-warning">{heroImageWarning}</div>}
            </div>
            <div>
              <label className="ad-field">
                <span className="ad-field-label">{isAr ? 'الشعار (Eyebrow)' : 'Eyebrow'}</span>
                <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[eyebrowKey]}
                  placeholder="e.g. Men's Treatments"
                  onChange={e => set(eyebrowKey, e.target.value)} />
              </label>
              <div className="ad-frow">
                <label className="ad-field ad-w-grow">
                  <span className="ad-field-label">{isAr ? 'العنوان (Headline)' : 'Headline'}</span>
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[headlineKey]}
                    placeholder="e.g. Built for men."
                    onChange={e => set(headlineKey, e.target.value)} />
                </label>
                <label className="ad-field ad-w-grow">
                  <span className="ad-field-label">{isAr ? 'تتمة العنوان (Headline emphasis)' : 'Headline emphasis'}</span>
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[headlineEmKey]}
                    placeholder="e.g. Backed by medicine."
                    onChange={e => set(headlineEmKey, e.target.value)} />
                </label>
              </div>
              <label className="ad-field">
                <span className="ad-field-label">{isAr ? 'النص الفرعي (Sub text)' : 'Sub text'}</span>
                <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={3}
                  value={form[subKey]} onChange={e => set(subKey, e.target.value)} />
              </label>
            </div>
          </div>
        </fieldset>

        <div className="ad-pair">
          <fieldset className="ad-fieldset">
            <legend>Trust points {isAr ? '(العربية)' : ''}</legend>
            {form[trustPointsKey].map((p, i) => (
              <div key={i} className="ad-repeat-row">
                <div className="ad-frow">
                  <input className="ad-input ad-w-xs" dir={isAr ? 'rtl' : undefined} value={p.icon || ''} placeholder="Icon (e.g. 🩺)"
                    aria-label="Icon" onChange={e => updateTrustPoint(i, 'icon', e.target.value)} />
                  <input className="ad-input ad-w-grow" dir={isAr ? 'rtl' : undefined} value={p.label || ''} placeholder="Label"
                    aria-label="Label" onChange={e => updateTrustPoint(i, 'label', e.target.value)} />
                  <input className="ad-input ad-w-grow" dir={isAr ? 'rtl' : undefined} value={p.hint || ''} placeholder="Hint"
                    aria-label="Hint" onChange={e => updateTrustPoint(i, 'hint', e.target.value)} />
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
                <div className="ad-frow">
                  <input className="ad-input ad-w-sm" dir={isAr ? 'rtl' : undefined} value={s.value || ''} placeholder="Value (e.g. 23)"
                    aria-label="Value" onChange={e => updateStat(i, 'value', e.target.value)} />
                  <input className="ad-input ad-w-grow" dir={isAr ? 'rtl' : undefined} value={s.label || ''} placeholder="Label"
                    aria-label="Label" onChange={e => updateStat(i, 'label', e.target.value)} />
                </div>
                <button type="button" className="ad-icon-btn" onClick={() => removeStat(i)}
                  aria-label="Remove stat">✕</button>
              </div>
            ))}
            <button type="button" className="ad-btn ad-btn--soft" onClick={addStat}>+ Add stat</button>
          </fieldset>
        </div>

        <MarketScopeFields countries={form.countries} clinics={form.clinics}
          onChange={scope => setForm(f => ({ ...f, ...scope }))} />
      </div>
    </form>
  )
}
