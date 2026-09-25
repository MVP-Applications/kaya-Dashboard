'use client'
import { useState } from 'react'
import { createCity } from '@/lib/admin/store'
import ImagePicker from './ImagePicker'
import LocaleToggle from './LocaleToggle'

export default function CountryForm({ initial, isNew, existing, onSave, onClose, onCityAdded }) {
  const [form, setForm] = useState({ ...initial })
  const [error, setError] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [addingCity, setAddingCity] = useState(false)
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function addCity() {
    const name = newCityName.trim()
    if (!name || !form.id) return
    setAddingCity(true)
    try {
      const city = await createCity(form.id, name)
      setForm(f => ({ ...f, cities: [...f.cities, city] }))
      onCityAdded?.(form.id, city)
      setNewCityName('')
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingCity(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Country name is required.')
    if (!form.code.trim()) return setError('Country code is required.')
    if (!/^[A-Z]{2}$/.test(form.isoCode.trim())) return setError('ISO code must be 2 uppercase letters, e.g. "AE".')
    if (!/^\+[1-9]\d{0,3}$/.test(form.dialCode.trim())) return setError('Dial code must look like "+971".')
    if (!/^\+\d{7,15}$/.test(form.primaryCallNumber.trim())) {
      return setError('Primary call number is required, in E.164 format (e.g. "+97144501001").')
    }
    if (form.secondaryCallNumber && !/^\+\d{7,15}$/.test(form.secondaryCallNumber.trim())) {
      return setError('Secondary call number must be in E.164 format.')
    }
    if (form.whatsappNumber && !/^\+\d{7,15}$/.test(form.whatsappNumber.trim())) {
      return setError('WhatsApp number must be in E.164 format.')
    }
    const id = isNew ? (form.code.trim() || name) : form.id
    if (isNew && existing.some(c => c.id === id)) {
      return setError(`A country with code "${id}" already exists.`)
    }
    onSave({ ...form, id, name, isoCode: form.isoCode.trim().toUpperCase() }, originalId)
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New country' : 'Edit country'}</h1>
          <p className="ad-view-sub">{isNew ? 'Add a market the website and clinics operate in.' : form.name}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create country' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Name</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic name so the website can show it when a visitor browses in Arabic.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          {!isAr ? (
            <label className="ad-field">
              <span className="ad-field-label">Country name *</span>
              <input className="ad-input" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Saudi Arabia" />
            </label>
          ) : (
            <label className="ad-field">
              <span className="ad-field-label">اسم الدولة (Country name)</span>
              <input className="ad-input" dir="rtl" value={form.nameAr}
                onChange={e => set('nameAr', e.target.value)} placeholder="المملكة العربية السعودية" />
            </label>
          )}
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Codes</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Country code *</span>
              <input className="ad-input" value={form.code} disabled={!isNew}
                onChange={e => set('code', e.target.value.toUpperCase())} placeholder="KSA" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">ISO code *</span>
              <input className="ad-input" value={form.isoCode}
                onChange={e => set('isoCode', e.target.value.toUpperCase())} placeholder="SA" maxLength={2} />
            </label>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Dial code *</span>
            <input className="ad-input" value={form.dialCode} onChange={e => set('dialCode', e.target.value)}
              placeholder="+966" />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Flag</legend>
          <ImagePicker value={form.flagUrl} onChange={v => set('flagUrl', v)} icon="🏳" />
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Contact</legend>
          <p className="ad-fieldset-hint">
            Shown on the website for visitors browsing from this country. Primary call number is required;
            WhatsApp and a secondary number are optional — leave either blank to hide that option on the site.
          </p>
          <label className="ad-field">
            <span className="ad-field-label">Primary call number *</span>
            <input className="ad-input" value={form.primaryCallNumber}
              onChange={e => set('primaryCallNumber', e.target.value)} placeholder="+97144501001" />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">Secondary call number</span>
            <input className="ad-input" value={form.secondaryCallNumber}
              onChange={e => set('secondaryCallNumber', e.target.value)} placeholder="+97144501002" />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">WhatsApp number</span>
            <input className="ad-input" value={form.whatsappNumber}
              onChange={e => set('whatsappNumber', e.target.value)} placeholder="+971501234567" />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Preferred language</legend>
          <p className="ad-fieldset-hint">
            The language the website shows first for visitors from this country. They can still switch manually.
          </p>
          <select className="ad-input" value={form.preferredLanguage}
            onChange={e => set('preferredLanguage', e.target.value)}>
            <option value="EN">English</option>
            <option value="AR">العربية (Arabic)</option>
          </select>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Cities</legend>
          {isNew ? (
            <p className="ad-fieldset-hint">Save the country first, then add cities under it.</p>
          ) : (
            <>
              {form.cities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {form.cities.map(c => <span key={c.id} className="ad-badge">{c.name}</span>)}
                </div>
              )}
              <div className="ad-field">
                <span className="ad-field-label">Add a city</span>
                <div className="ad-repeat-row">
                  <input className="ad-input" value={newCityName} placeholder="e.g. Al Ain"
                    onChange={e => setNewCityName(e.target.value)} />
                  <button type="button" className="ad-btn ad-btn--soft" disabled={!newCityName.trim() || addingCity}
                    onClick={addCity}>
                    {addingCity ? 'Adding…' : '+ Add city'}
                  </button>
                </div>
              </div>
            </>
          )}
        </fieldset>
      </div>
    </form>
  )
}
