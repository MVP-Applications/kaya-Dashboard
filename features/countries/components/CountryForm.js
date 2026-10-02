'use client'
import { useState } from 'react'
import { createCity, updateCity } from '@/shared/lib/store'
import ImagePicker from '@/shared/components/ImagePicker'
import LocaleToggle from '@/shared/components/LocaleToggle'

export default function CountryForm({ initial, isNew, existing, onSave, onClose, onCityAdded, onCityUpdated, canEdit = true }) {
  const [form, setForm] = useState({ ...initial })
  const [error, setError] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [newCityNameAr, setNewCityNameAr] = useState('')
  const [addingCity, setAddingCity] = useState(false)
  const [editingCity, setEditingCity] = useState(null) // { id, name, nameAr }
  const [savingCity, setSavingCity] = useState(false)
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function addCity() {
    const name = newCityName.trim()
    if (!name || !form.id) return
    setAddingCity(true)
    try {
      const city = await createCity(form.id, name, newCityNameAr)
      setForm(f => ({ ...f, cities: [...f.cities, city] }))
      onCityAdded?.(form.id, city)
      setNewCityName('')
      setNewCityNameAr('')
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingCity(false)
    }
  }

  // Cities save on their own (like "+ Add city"), not with the country form.
  async function saveCity() {
    const name = editingCity.name.trim()
    if (!name) return setError('City name is required.')
    setSavingCity(true)
    try {
      const city = await updateCity(editingCity.id, { name, nameAr: editingCity.nameAr.trim() })
      setForm(f => ({ ...f, cities: f.cities.map(c => (c.id === city.id ? city : c)) }))
      onCityUpdated?.(form.id, city)
      setEditingCity(null)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingCity(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Country name is required.')
    if (!form.code.trim()) return setError('Country code is required.')
    if (!/^[A-Z]{2}$/.test(form.isoCode.trim())) return setError('ISO code must be 2 uppercase letters, e.g. "AE".')
    if (!/^\+[1-9]\d{0,3}$/.test(form.dialCode.trim())) return setError('Dial code must look like "+971".')
    const id = isNew ? (form.code.trim() || name) : form.id
    if (isNew && existing.some(c => c.id === id)) {
      return setError(`A country with code "${id}" already exists.`)
    }
    const order = String(form.displayOrder ?? '').trim()
    if (order !== '' && !/^\d{1,4}$/.test(order)) return setError('Display order must be a whole number from 0 to 9999.')
    onSave({ ...form, id, name, isoCode: form.isoCode.trim().toUpperCase(), displayOrder: order === '' ? 0 : Number(order) }, originalId)
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
          {canEdit && (
            <button type="submit" className="ad-btn ad-btn--primary">
              {isNew ? 'Create country' : 'Save changes'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}
      {!canEdit && (
        <p className="ad-cf-readonly">Only administrators can change countries and cities — this is read-only.</p>
      )}

      <div className="ad-editor-body">
        <fieldset disabled={!canEdit} style={{ display: 'contents' }}>
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
          <legend>Display order</legend>
          <p className="ad-fieldset-hint">
            Countries are listed in this order on the website (About page, region switcher) and across the
            dashboard — lowest first. Countries with the same number sort by name.
          </p>
          <input className="ad-input" type="number" min="0" max="9999" step="1" style={{ maxWidth: 140 }}
            value={form.displayOrder ?? 0} onChange={e => set('displayOrder', e.target.value)} />
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Flag</legend>
          <p className="ad-fieldset-hint">Shown next to the country on the website’s About page.</p>
          <ImagePicker value={form.flagUrl} onChange={v => set('flagUrl', v)} icon="🏳" />
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Contact</legend>
          <p className="ad-fieldset-hint">
            Phone and WhatsApp numbers are managed on the <strong>Contacts</strong> screen, not here — each
            country has exactly one contact record there.
          </p>
          {!isNew && (
            form.contact ? (
              <div className="ad-badge-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="ad-badge">Phone: {form.contact.phoneNumber}</span>
                {form.contact.secondaryPhoneNumber && (
                  <span className="ad-badge">Secondary: {form.contact.secondaryPhoneNumber}</span>
                )}
                {form.contact.whatsappNumber && (
                  <span className="ad-badge">WhatsApp: {form.contact.whatsappNumber}</span>
                )}
              </div>
            ) : (
              <p className="ad-fieldset-hint">No contact added yet for this country.</p>
            )
          )}
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
              <p className="ad-fieldset-hint">
                Click a city to rename it or add its Arabic name — the website shows the Arabic name to visitors
                browsing in Arabic.
              </p>
              {form.cities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {form.cities.map(c => (
                    <button key={c.id} type="button"
                      className={`ad-badge ad-city-chip${editingCity?.id === c.id ? ' active' : ''}${c.nameAr ? '' : ' ad-city-chip--no-ar'}`}
                      title={c.nameAr ? undefined : 'No Arabic name yet'}
                      onClick={() => setEditingCity({ id: c.id, name: c.name, nameAr: c.nameAr || '' })}>
                      {c.name}{c.nameAr && <span dir="rtl"> · {c.nameAr}</span>}
                    </button>
                  ))}
                </div>
              )}
              {editingCity && (
                <div className="ad-field">
                  <span className="ad-field-label">Edit city</span>
                  <div className="ad-repeat-row">
                    <input className="ad-input" value={editingCity.name} placeholder="English name"
                      onChange={e => setEditingCity(c => ({ ...c, name: e.target.value }))} />
                    <input className="ad-input" dir="rtl" value={editingCity.nameAr} placeholder="الاسم بالعربية"
                      onChange={e => setEditingCity(c => ({ ...c, nameAr: e.target.value }))} />
                    <button type="button" className="ad-btn ad-btn--primary" disabled={!editingCity.name.trim() || savingCity}
                      onClick={saveCity}>
                      {savingCity ? 'Saving…' : 'Save city'}
                    </button>
                    <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setEditingCity(null)}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="ad-field">
                <span className="ad-field-label">Add a city</span>
                <div className="ad-repeat-row">
                  <input className="ad-input" value={newCityName} placeholder="English name, e.g. Al Ain"
                    onChange={e => setNewCityName(e.target.value)} />
                  <input className="ad-input" dir="rtl" value={newCityNameAr} placeholder="الاسم بالعربية، مثل العين"
                    onChange={e => setNewCityNameAr(e.target.value)} />
                  <button type="button" className="ad-btn ad-btn--soft" disabled={!newCityName.trim() || addingCity}
                    onClick={addCity}>
                    {addingCity ? 'Adding…' : '+ Add city'}
                  </button>
                </div>
              </div>
            </>
          )}
        </fieldset>
        </fieldset>
      </div>
    </form>
  )
}
