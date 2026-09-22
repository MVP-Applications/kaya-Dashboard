'use client'
import { useEffect, useState } from 'react'
import { useAdmin } from './AdminContext'
import { CLINIC_COUNTRIES, emptyLocation } from '@/lib/admin/content'
import { fetchCountryOptions, createCity } from '@/lib/admin/store'
import LocaleToggle from './LocaleToggle'

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const DAYS = [
  ['sun', 'Sun'], ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'],
  ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'],
]

export default function LocationsView() {
  const { locations, upsertLocation, deleteLocation, allowed } = useAdmin()
  const [editing, setEditing] = useState(null) // { initial, isNew }
  const [confirm, setConfirm] = useState(null)
  const [country, setCountry] = useState('all')
  const [query, setQuery] = useState('')

  const canCreate = allowed('create')
  const canDelete = allowed('delete')

  if (editing) {
    return (
      <LocationForm
        initial={editing.initial}
        isNew={editing.isNew}
        existing={locations}
        onSave={(rec, orig) => { upsertLocation(rec, orig); setEditing(null) }}
        onClose={() => setEditing(null)}
      />
    )
  }

  const q = query.trim().toLowerCase()

  const filtered = locations.filter(l => {
    if (country !== 'all' && l.country !== country) return false
    if (!q) return true
    return `${l.name} ${l.city} ${l.address}`.toLowerCase().includes(q)
  })

  const target = confirm ? locations.find(l => l.id === confirm) : null

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Locations</h1>
          <p className="ad-view-sub">
            Clinic records behind the Find a Clinic page — addresses, phone numbers, and opening hours.
          </p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyLocation(), isNew: true })}>
            + New clinic
          </button>
        )}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search clinics…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select className="ad-input ad-filter" value={country} onChange={e => setCountry(e.target.value)}>
          <option value="all">All countries ({locations.length})</option>
          {CLINIC_COUNTRIES.map(c => (
            <option key={c} value={c}>
              {c} ({locations.filter(l => l.country === c).length})
            </option>
          ))}
        </select>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Country</th>
              <th>City</th>
              <th>Telephone</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td>
                  <div className="ad-cell-name">{l.name}</div>
                  <div className="ad-cell-slug">{l.address}</div>
                </td>
                <td><span className="ad-badge">{l.country}</span></td>
                <td>{l.city}</td>
                <td>{l.tel || '—'}</td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: l, isNew: false })}>Edit</button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(l.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="ad-empty">No clinics match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="ad-drawer-scrim" onClick={() => setConfirm(null)}>
          <div className="ad-confirm" onClick={e => e.stopPropagation()}>
            <h3 className="ad-confirm-title">Delete clinic?</h3>
            <p className="ad-confirm-text">
              <strong>{target.name}</strong> will be removed from the Find a Clinic page.
            </p>
            <div className="ad-confirm-actions">
              <button className="ad-btn ad-btn--ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="ad-btn ad-btn--danger"
                onClick={() => { deleteLocation(target.id); setConfirm(null) }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LocationForm({ initial, isNew, existing, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial })
  const [error, setError] = useState('')
  const [countryOptions, setCountryOptions] = useState([]) // [{id, code, name, cities:[{id,name}]}]
  const [newCityName, setNewCityName] = useState('')
  const [addingCity, setAddingCity] = useState(false)
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'
  const nameKey = isAr ? 'nameAr' : 'name'
  const addressKey = isAr ? 'addressAr' : 'address'

  useEffect(() => {
    let cancelled = false
    fetchCountryOptions()
      .then(options => { if (!cancelled) setCountryOptions(options) })
      .catch(() => {}) // Country/City is a supporting field, not worth an error banner over.
    return () => { cancelled = true }
  }, [])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }
  function setHour(day, value) { setForm(f => ({ ...f, hours: { ...f.hours, [day]: value } })) }

  const selectedCountry = countryOptions.find(c => c.code === form.country)
  const cities = selectedCountry?.cities || []

  function chooseCountry(code) {
    set('country', code)
    set('cityId', '')
    set('city', '')
  }

  function chooseCity(cityId) {
    const city = cities.find(c => c.id === cityId)
    setForm(f => ({ ...f, cityId, city: city?.name || '' }))
  }

  async function addCity() {
    const name = newCityName.trim()
    if (!name || !selectedCountry) return
    setAddingCity(true)
    try {
      const city = await createCity(selectedCountry.id, name)
      setCountryOptions(options => options.map(c => (
        c.id === selectedCountry.id ? { ...c, cities: [...c.cities, city] } : c
      )))
      setForm(f => ({ ...f, cityId: city.id, city: city.name }))
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
    if (!name) return setError('Clinic name is required.')
    if (!form.cityId) return setError('Choose a city.')
    if (form.lat === '' || form.lng === '') return setError('Latitude and longitude are both required.')
    const id = form.id.trim() || slugify(name)
    if (existing.some(l => l.id === id && l.id !== originalId)) {
      return setError(`The id "${id}" is already in use.`)
    }
    onSave({ ...form, id, name }, originalId)
  }

  const mapHref = form.lat !== '' && form.lng !== '' ? `https://maps.google.com/?q=${form.lat},${form.lng}` : null

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New clinic' : 'Edit clinic'}</h1>
          <p className="ad-view-sub">{isNew ? 'Add a location to the Find a Clinic page.' : form.id}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create clinic' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Basics</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">ID</span>
              <input className="ad-input" value={form.id} disabled={!isNew}
                placeholder={slugify(form.name) || 'auto'}
                onChange={e => set('id', e.target.value)} />
            </label>
          </div>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Country</span>
              <select className="ad-input" value={form.country} onChange={e => chooseCountry(e.target.value)}>
                {CLINIC_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="ad-field">
              <span className="ad-field-label">City *</span>
              <select className="ad-input" value={form.cityId} onChange={e => chooseCity(e.target.value)}>
                <option value="">Choose a city…</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="ad-field">
            <span className="ad-field-label">City not listed?</span>
            <div className="ad-repeat-row">
              <input className="ad-input" value={newCityName} placeholder="e.g. Al Ain"
                onChange={e => setNewCityName(e.target.value)} />
              <button type="button" className="ad-btn ad-btn--soft" disabled={!newCityName.trim() || addingCity}
                onClick={addCity}>
                {addingCity ? 'Adding…' : '+ Add city'}
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Name &amp; address</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic name and address to add an Arabic translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'اسم العيادة (Clinic name)' : 'Clinic name *'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[nameKey]}
              onChange={e => set(nameKey, e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'العنوان (Address)' : 'Address'}</span>
            <textarea className="ad-textarea" dir={isAr ? 'rtl' : undefined} rows={2} value={form[addressKey]}
              onChange={e => set(addressKey, e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Contact</legend>
          <label className="ad-field">
            <span className="ad-field-label">Telephone</span>
            <input className="ad-input" value={form.tel} onChange={e => set('tel', e.target.value)}
              placeholder="04 450 1001" />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Opening hours</legend>
          {DAYS.map(([key, label]) => {
            const closed = form.hours[key] === 'closed'
            const [openAt, closeAt] = closed ? ['', ''] : form.hours[key].split('-')
            return (
              <div key={key} className="ad-grid2" style={{ alignItems: 'end' }}>
                <label className="ad-field">
                  <span className="ad-field-label">{label}</span>
                  <label className="ad-check">
                    <input type="checkbox" checked={closed}
                      onChange={e => setHour(key, e.target.checked ? 'closed' : '09:00-18:00')} />
                    Closed
                  </label>
                </label>
                {!closed && (
                  <div className="ad-grid2">
                    <label className="ad-field">
                      <span className="ad-field-label">Open</span>
                      <input className="ad-input" type="time" value={openAt || ''}
                        onChange={e => setHour(key, `${e.target.value}-${closeAt || '18:00'}`)} />
                    </label>
                    <label className="ad-field">
                      <span className="ad-field-label">Close</span>
                      <input className="ad-input" type="time" value={closeAt || ''}
                        onChange={e => setHour(key, `${openAt || '09:00'}-${e.target.value}`)} />
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Coordinates</legend>
          <p className="ad-fieldset-hint">Used for the Find a Clinic map and directions link.</p>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Latitude *</span>
              <input className="ad-input" type="number" step="any" value={form.lat}
                onChange={e => set('lat', e.target.value)} placeholder="25.2048" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Longitude *</span>
              <input className="ad-input" type="number" step="any" value={form.lng}
                onChange={e => set('lng', e.target.value)} placeholder="55.2708" />
            </label>
          </div>
          {mapHref && (
            <a className="ad-btn ad-btn--soft ad-btn--sm" href={mapHref} target="_blank" rel="noreferrer">
              Preview on Google Maps ↗
            </a>
          )}
        </fieldset>
      </div>
    </form>
  )
}
