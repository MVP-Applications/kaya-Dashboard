'use client'
import { useState } from 'react'

const PHONE_RE = /^\+\d{7,15}$/

export default function ContactForm({ initial, isNew, availableCountries, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial })
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function chooseCountry(countryId) {
    const country = availableCountries.find(c => c.id === countryId)
    setForm(f => ({ ...f, countryId, countryName: country?.name || '', countryCode: country?.code || '' }))
  }

  function submit(e) {
    e.preventDefault()
    if (!form.countryId) return setError('Choose a country.')
    if (!PHONE_RE.test(form.phoneNumber.trim())) {
      return setError('Phone number is required, in E.164 format (e.g. "+97144501001").')
    }
    if (form.secondaryPhoneNumber && !PHONE_RE.test(form.secondaryPhoneNumber.trim())) {
      return setError('Secondary phone number must be in E.164 format.')
    }
    if (form.whatsappNumber && !PHONE_RE.test(form.whatsappNumber.trim())) {
      return setError('WhatsApp number must be in E.164 format.')
    }
    const id = isNew ? `contact-${form.countryId}` : form.id
    onSave({ ...form, id }, isNew ? null : initial.id)
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New contact' : 'Edit contact'}</h1>
          <p className="ad-view-sub">
            {isNew ? 'Add a phone/WhatsApp contact for a country.' : form.countryName}
          </p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create contact' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Country</legend>
          {isNew ? (
            <>
              <label className="ad-field">
                <span className="ad-field-label">Country *</span>
                <select className="ad-input" value={form.countryId} onChange={e => chooseCountry(e.target.value)}>
                  <option value="">Choose a country…</option>
                  {availableCountries.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <p className="ad-fieldset-hint">
                Don&apos;t see the country you&apos;re looking for? It either already has a contact (edit that one
                instead) or hasn&apos;t been added yet — add it first on the <strong>Countries</strong> screen.
              </p>
            </>
          ) : (
            <label className="ad-field">
              <span className="ad-field-label">Country</span>
              <input className="ad-input" value={form.countryName} disabled />
            </label>
          )}
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Numbers</legend>
          <p className="ad-fieldset-hint">
            Shown on the website for visitors browsing from this country. Phone number is required; WhatsApp and a
            secondary number are optional — leave either blank to hide that option on the site.
          </p>
          <label className="ad-field">
            <span className="ad-field-label">Phone number *</span>
            <input className="ad-input" value={form.phoneNumber}
              onChange={e => set('phoneNumber', e.target.value)} placeholder="+97144501001" />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">Secondary phone number</span>
            <input className="ad-input" value={form.secondaryPhoneNumber}
              onChange={e => set('secondaryPhoneNumber', e.target.value)} placeholder="+97144501002" />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">WhatsApp number</span>
            <input className="ad-input" value={form.whatsappNumber}
              onChange={e => set('whatsappNumber', e.target.value)} placeholder="+971501234567" />
          </label>
        </fieldset>
      </div>
    </form>
  )
}
