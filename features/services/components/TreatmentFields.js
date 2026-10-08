'use client'
import { useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import { BADGE_OPTIONS, THUMB_OPTIONS } from '@/shared/lib/seed'
import LocaleToggle from '@/shared/components/LocaleToggle'
import ImagePicker from '@/shared/components/ImagePicker'
import SlugField from '@/shared/components/SlugField'

/**
 * Every field of one country's version of a treatment — what each country
 * tab in ServiceForm shows. `form` is that country's draft and `onChange`
 * receives a patch for it. Verticals and clinics only offer what exists in
 * `country` (clinics already come scoped to the signed-in user).
 */
export default function TreatmentFields({ country, form, onChange }) {
  const { verticals, categories, locations } = useAdmin()
  const [locale, setLocale] = useState('EN')

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

  // Verticals offered in this country, plus any already picked (so an old
  // link stays visible and can be removed).
  const verticalOptions = verticals.filter(v => (v.countries || []).includes(country) || form.verticals.includes(v.id))
  const clinicOptions = locations.filter(l => l.country === country)

  const set = (field, value) => onChange({ [field]: value })
  const toggleIn = (field, id) => onChange({
    [field]: form[field].includes(id) ? form[field].filter(v => v !== id) : [...form[field], id],
  })

  // ── Benefits (repeatable icon + title + description) — EN or AR depending on the active locale ──
  const addBenefit = () => set(benefitsKey, [...form[benefitsKey], { i: '', t: '', d: '' }])
  const updateBenefit = (idx, field, value) =>
    set(benefitsKey, form[benefitsKey].map((b, i) => (i === idx ? { ...b, [field]: value } : b)))
  const removeBenefit = idx => set(benefitsKey, form[benefitsKey].filter((_, i) => i !== idx))

  // ── Suitable for (repeatable, one line of text each) ──
  const addSuitable = () => set(suitableKey, [...form[suitableKey], ''])
  const updateSuitable = (idx, value) => set(suitableKey, form[suitableKey].map((s, i) => (i === idx ? value : s)))
  const removeSuitable = idx => set(suitableKey, form[suitableKey].filter((_, i) => i !== idx))

  return (
    <>
      <fieldset className="ad-fieldset">
        <legend>Name &amp; content</legend>
        <p className="ad-fieldset-hint">
          English is required. Fill in the Arabic Name, &quot;What it is&quot;
          and &quot;How it works&quot; to add an Arabic translation. The address only
          has to be unique within this country.
        </p>
        <LocaleToggle locale={locale} onChange={setLocale} />
        <div className="ad-frow">
          <label className="ad-field ad-w-lg">
            <span className="ad-field-label">{isAr ? 'الاسم (Name)' : 'Name *'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[nameKey]}
              onChange={e => set(nameKey, e.target.value)} />
          </label>
          <SlugField className="ad-field ad-w-md" value={form.slug} source={form.name}
            onChange={v => set('slug', v)} />
        </div>
        <label className="ad-field ad-w-xl">
          <span className="ad-field-label">{isAr ? 'مقتطف قصير (Short teaser)' : 'Short teaser'}</span>
          <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[subKey]}
            placeholder="A one-line summary shown on treatment cards"
            onChange={e => set(subKey, e.target.value)} />
        </label>
        <div className="ad-split">
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'ما هو (What it is)' : 'What it is *'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={4}
              value={form[whatKey]} onChange={e => set(whatKey, e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'كيف يعمل (How it works)' : 'How it works (mechanism) *'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={4}
              value={form[mechanismKey]} onChange={e => set(mechanismKey, e.target.value)} />
          </label>
        </div>
      </fieldset>

      <div className="ad-pair">
        <fieldset className="ad-fieldset">
          <legend>What to expect {isAr ? '(العربية)' : ''}</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic versions so visitors browsing
            in Arabic see these details in Arabic too.
          </p>
          <div className="ad-frow">
            <label className="ad-field ad-w-md">
              <span className="ad-field-label">{isAr ? 'المدة (Duration)' : 'Duration'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[durationKey]}
                placeholder="e.g. 45 mins"
                onChange={e => set(durationKey, e.target.value)} />
            </label>
            <label className="ad-field ad-w-md">
              <span className="ad-field-label">{isAr ? 'الجلسات (Sessions)' : 'Sessions'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[sessionsKey]}
                placeholder="e.g. 3–6 sessions"
                onChange={e => set(sessionsKey, e.target.value)} />
            </label>
          </div>
          <div className="ad-frow">
            <label className="ad-field ad-w-md">
              <span className="ad-field-label">{isAr ? 'فترة التعافي (Downtime)' : 'Downtime'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[downtimeNotesKey]}
                onChange={e => set(downtimeNotesKey, e.target.value)} />
            </label>
            <label className="ad-field ad-w-md">
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
              <div className="ad-frow">
                <input className="ad-input ad-w-grow" dir={isAr ? 'rtl' : undefined} value={s}
                  placeholder="e.g. Oily or acne-prone skin"
                  onChange={e => updateSuitable(i, e.target.value)} />
              </div>
              <button type="button" className="ad-icon-btn" onClick={() => removeSuitable(i)}
                aria-label="Remove">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={addSuitable}>+ Add</button>
        </fieldset>
      </div>

      <fieldset className="ad-fieldset">
        <legend>Benefits {isAr ? '(العربية)' : ''}</legend>
        {form[benefitsKey].map((b, i) => (
          <div key={i} className="ad-repeat-row">
            <div className="ad-frow">
              <input className="ad-input ad-w-xs" dir={isAr ? 'rtl' : undefined} value={b.i} placeholder="Icon (e.g. ✦)"
                aria-label="Icon" onChange={e => updateBenefit(i, 'i', e.target.value)} />
              <input className="ad-input ad-w-md" dir={isAr ? 'rtl' : undefined} value={b.t} placeholder="Title"
                aria-label="Title" onChange={e => updateBenefit(i, 't', e.target.value)} />
              <input className="ad-input ad-w-grow" dir={isAr ? 'rtl' : undefined} value={b.d} placeholder="Description"
                aria-label="Description" onChange={e => updateBenefit(i, 'd', e.target.value)} />
            </div>
            <button type="button" className="ad-icon-btn" onClick={() => removeBenefit(i)}
              aria-label="Remove benefit">✕</button>
          </div>
        ))}
        <button type="button" className="ad-btn ad-btn--soft" onClick={addBenefit}>+ Add benefit</button>
      </fieldset>

      <div className="ad-pair">
        <fieldset className="ad-fieldset">
          <legend>Images</legend>
          <div className="ad-field">
            <span className="ad-field-label">Card image</span>
            <ImagePicker value={form.cardImage} onChange={v => set('cardImage', v)} ratio={16 / 9}
              hint="Shown on treatment cards in lists — landscape 16:9. Use an image about 1600 × 900 px; keep the subject in the centre. If empty, the detail image is used (cropped to fit)." />
          </div>
          <div className="ad-field">
            <span className="ad-field-label">Detail image</span>
            <ImagePicker value={form.image} onChange={v => set('image', v)} ratio={4 / 5}
              hint="Shown on the treatment's own page and the homepage Popular treatments cards — portrait 4:5. Use about 840 × 1050 px." />
          </div>
          <label className="ad-field ad-w-md">
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
            {verticalOptions.length === 0 ? (
              <p className="ad-muted">No verticals are offered in this country yet.</p>
            ) : (
              <div className="ad-check-grid">
                {verticalOptions.map(v => (
                  <label key={v.id} className={`ad-check${form.verticals.includes(v.id) ? ' active' : ''}`}>
                    <input type="checkbox" checked={form.verticals.includes(v.id)}
                      onChange={() => toggleIn('verticals', v.id)} />
                    <span className="ad-check-dot" style={{ background: v.color }} />
                    {v.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="ad-frow">
            <label className="ad-field ad-w-md">
              <span className="ad-field-label">Category</span>
              <select className="ad-input" value={form.category}
                onChange={e => set('category', e.target.value)}>
                <option value="">— none —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="ad-field ad-w-md">
              <span className="ad-field-label">Badge</span>
              <select className="ad-input" value={form.badge}
                onChange={e => set('badge', e.target.value)}>
                {BADGE_OPTIONS.map(b => <option key={b.value || 'none'} value={b.value}>{b.label}</option>)}
              </select>
            </label>
          </div>
          <label className="ad-field ad-field--toggle">
            <span className="ad-field-label">Popular</span>
            <label className="ad-check">
              <input type="checkbox" checked={form.isPopular}
                onChange={e => set('isPopular', e.target.checked)} />
              Show this treatment in the site&apos;s Popular treatments section
            </label>
          </label>
        </fieldset>
      </div>

      <fieldset className="ad-fieldset">
        <legend>Clinics</legend>
        <p className="ad-fieldset-hint">Optional — leave empty to offer it at every clinic in this country.</p>
        {clinicOptions.length === 0 ? (
          <p className="ad-muted">No clinics in this country yet.</p>
        ) : (
          <div className="ad-check-grid">
            {clinicOptions.map(l => (
              <label key={l.id} className={`ad-check${form.clinics.includes(l.id) ? ' active' : ''}`}>
                <input type="checkbox" checked={form.clinics.includes(l.id)}
                  onChange={() => toggleIn('clinics', l.id)} />
                {l.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </>
  )
}
