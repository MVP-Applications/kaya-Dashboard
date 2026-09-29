'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { VOUCHER_TYPE_OPTIONS, BADGE_STYLE_OPTIONS } from '@/lib/admin/seed'
import { parsePriceInput } from '@/lib/admin/price'
import CountryFields from './CountryFields'
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

export default function VoucherForm({ initial, isNew, onClose }) {
  const { vouchers, upsertVoucher } = useAdmin()
  // Back-fill fields for vouchers saved before they existed.
  const [form, setForm] = useState(() => {
    const base = cloneSafe(initial)
    return {
      ...base,
      regions: Array.isArray(base.regions) ? base.regions : [],
      pricing: base.pricing && typeof base.pricing === 'object' ? base.pricing : {},
      validityMonths: base.validityMonths ?? 6,
      isPublished: base.isPublished !== false,
    }
  })
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'
  const titleKey = isAr ? 'titleAr' : 'title'
  const subtitleKey = isAr ? 'subtitleAr' : 'subtitle'
  const descriptionKey = isAr ? 'descriptionAr' : 'description'
  const badgeKey = isAr ? 'badgeAr' : 'badge'
  const redemptionTermsKey = isAr ? 'redemptionTermsAr' : 'redemptionTerms'

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function submit(e) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return setError('Title is required.')
    if (!form.description.trim()) return setError('Description is required.')
    const badPrice = Object.entries(form.pricing || {}).find(([, p]) => parsePriceInput(p?.price) === null)
    if (badPrice) {
      return setError(`The ${badPrice[0]} price "${badPrice[1].price}" isn't a number — use digits, e.g. 1800 or 1,800.`)
    }
    const months = Number(form.validityMonths)
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      return setError('Valid for must be a whole number of months, from 1 to 120.')
    }

    const id = form.id.trim() || slugify(title)
    const clash = vouchers.some(v => v.id === id && v.id !== originalId)
    if (clash) return setError(`The id "${id}" is already in use.`)

    upsertVoucher(
      { ...form, id, title, price: form.price === '' ? '' : Number(form.price), validityMonths: months },
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
              <span className="ad-field-label">ID</span>
              <input className="ad-input" value={form.id} disabled={!isNew}
                placeholder={slugify(form.title) || 'auto-generated'}
                onChange={e => set('id', e.target.value)} />
            </label>
          </div>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic title and description to add an Arabic translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'العنوان (Title)' : 'Title *'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[titleKey]}
              onChange={e => set(titleKey, e.target.value)} placeholder="e.g. Gift Card" />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'العنوان الفرعي (Subtitle)' : 'Subtitle'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[subtitleKey]}
              onChange={e => set(subtitleKey, e.target.value)}
              placeholder="e.g. AED 500 treatment credit" />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'الوصف (Description)' : 'Description *'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={3} value={form[descriptionKey]}
              onChange={e => set(descriptionKey, e.target.value)}
              placeholder="What the voucher includes." />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'شروط الاسترداد (Redemption terms)' : 'Redemption terms'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={2} value={form[redemptionTermsKey]}
              onChange={e => set(redemptionTermsKey, e.target.value)}
              placeholder="e.g. Valid for 6 months from purchase date." />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Pricing &amp; validity</legend>
          <p className="ad-fieldset-hint">
            The default price applies in every country that has no price of its own (set those under
            Availability). The price a customer was quoted is kept with their request.
          </p>
          <div className="ad-grid3">
            <label className="ad-field">
              <span className="ad-field-label">Default price</span>
              <input className="ad-input" type="number" min="0" value={form.price}
                onChange={e => set('price', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Currency</span>
              <input className="ad-input" value={form.currency}
                onChange={e => set('currency', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Valid for (months)</span>
              <input className="ad-input" type="number" min="1" max="120" step="1" value={form.validityMonths}
                onChange={e => set('validityMonths', e.target.value)} />
            </label>
          </div>
          <span className="ad-field-hint">
            An issued voucher can be redeemed for this long; the expiry date is set when it&apos;s issued.
          </span>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Availability</legend>
          <CountryFields
            countries={form.regions}
            pricing={form.pricing}
            pricingHint="Leave a country blank to use the default price there."
            onChange={({ countries, pricing }) => setForm(f => ({ ...f, regions: countries, pricing }))}
          />
          <label className="ad-field ad-field--toggle">
            <span className="ad-field-label">Website</span>
            <label className="ad-check">
              <input type="checkbox" checked={form.isPublished}
                onChange={e => set('isPublished', e.target.checked)} />
              Show this voucher on the Indulgence page
            </label>
          </label>
          <p className="ad-fieldset-hint">
            Untick to hide it without deleting — a voucher that already has requests can&apos;t be deleted.
          </p>
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
              <span className="ad-field-label">{isAr ? 'شارة (Badge label)' : 'Badge label'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[badgeKey]}
                onChange={e => set(badgeKey, e.target.value)} placeholder="e.g. Most Popular" />
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
