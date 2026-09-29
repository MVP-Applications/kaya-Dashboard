'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { emptyLocation, sortCountries } from '@/lib/admin/content'
import { createCity } from '@/lib/admin/store'
import LocaleToggle from './LocaleToggle'

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const DAYS = [
  ['sun', 'Sun'], ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'],
  ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'],
]

const SKELETON_ROWS = 6

function LocationRowSkeleton() {
  return (
    <tr aria-hidden="true">
      <td>
        <div className="ad-skeleton-block" style={{ width: '60%' }} />
        <div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '85%' }} />
      </td>
      <td><div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '40%' }} /></td>
      <td><div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '55%' }} /></td>
      <td><div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '65%' }} /></td>
      <td className="ad-td-actions"><div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '80%', marginLeft: 'auto' }} /></td>
    </tr>
  )
}

/** Stand-in for LocationForm while a clinic's latest copy is fetched. */
function LocationFormSkeleton({ onClose }) {
  return (
    <div className="ad-editor" role="status" aria-live="polite">
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">Edit clinic</h1>
          <p className="ad-view-sub">Loading clinic details…</p>
        </div>
      </div>
      <div className="ad-editor-body">
        {[0, 1, 2].map(i => (
          <div key={i} className="ad-fieldset" aria-hidden="true">
            <div className="ad-skeleton-block" style={{ width: '30%' }} />
            <div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '90%' }} />
            <div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '70%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LocationsView() {
  const { locations, saveLocation, loadLocation, deleteLocation, countryRecords, addCityToCountry, allowed, loading } = useAdmin()
  const [editing, setEditing] = useState(null) // { initial, isNew, loading? }
  const [confirm, setConfirm] = useState(null)
  const [country, setCountry] = useState('all')
  const [query, setQuery] = useState('')

  const canCreate = allowed('create')
  const canDelete = allowed('delete')

  // Edit always starts from the backend's latest copy, not the list's
  // possibly-stale one. Ignore the result if the admin has since gone Back
  // or opened another clinic.
  async function openEdit(l) {
    setEditing({ initial: l, isNew: false, loading: true })
    const fresh = await loadLocation(l.id)
    setEditing(e => {
      if (!e || !e.loading || e.initial.id !== l.id) return e
      return fresh ? { initial: fresh, isNew: false } : null
    })
  }

  if (editing?.loading) {
    return <LocationFormSkeleton onClose={() => setEditing(null)} />
  }

  if (editing) {
    return (
      <LocationForm
        initial={editing.initial}
        isNew={editing.isNew}
        existing={locations}
        countryOptions={countryRecords}
        onCityAdded={addCityToCountry}
        canAddCity={allowed('manageCountries')}
        onSave={async (rec, orig) => {
          const ok = await saveLocation(rec, orig)
          if (ok) setEditing(null)
          return ok
        }}
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

  // The same totals the website's About page counts (clinics per country, in display order).
  const countryTotals = sortCountries(countryRecords).map(c => ({
    ...c, clinics: locations.filter(l => l.country === c.code).length,
  }))

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Clinics</h1>
          <p className="ad-view-sub">
            Clinic records behind the Find a Clinic page — addresses, phone numbers, and opening hours.
          </p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary" disabled={loading}
            onClick={() => setEditing({ initial: emptyLocation(sortCountries(countryRecords)[0]?.code), isNew: true })}>
            + New clinic
          </button>
        )}
      </div>

      <div className="ad-stat-grid ad-loc-totals">
        <button type="button" className={`ad-stat-card${country === 'all' ? ' active' : ''}`}
          onClick={() => setCountry('all')}>
          <div className="ad-stat-value">{loading ? '—' : locations.length}</div>
          <div className="ad-stat-label">{locations.length === 1 ? 'Clinic' : 'Clinics'} in total</div>
          <div className="ad-stat-hint">
            across {countryTotals.filter(c => c.clinics > 0).length} of {countryTotals.length} countries
          </div>
        </button>
        {countryTotals.map(c => (
          <button key={c.code} type="button" className={`ad-stat-card${country === c.code ? ' active' : ''}`}
            onClick={() => setCountry(country === c.code ? 'all' : c.code)}>
            <div className="ad-stat-value">{loading ? '—' : c.clinics}</div>
            <div className="ad-stat-label">
              {c.flagUrl && <img src={c.flagUrl} alt="" className="ad-loc-flag" />}
              {c.name}
            </div>
            <div className="ad-stat-hint">{c.clinics === 1 ? 'clinic' : 'clinics'}</div>
          </button>
        ))}
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
          {sortCountries(countryRecords).map(c => (
            <option key={c.code} value={c.code}>
              {c.code} ({locations.filter(l => l.country === c.code).length})
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
            {loading && Array.from({ length: SKELETON_ROWS }).map((_, i) => <LocationRowSkeleton key={i} />)}
            {!loading && filtered.map(l => (
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
                    onClick={() => openEdit(l)}>Edit</button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(l.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
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

function LocationForm({ initial, isNew, existing, countryOptions, onCityAdded, onSave, onClose, canAddCity = true }) {
  const [form, setForm] = useState({ ...initial })
  const [error, setError] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [addingCity, setAddingCity] = useState(false)
  const [locale, setLocale] = useState('EN')
  const [submitting, setSubmitting] = useState(false)
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'
  const nameKey = isAr ? 'nameAr' : 'name'
  const addressKey = isAr ? 'addressAr' : 'address'

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
      onCityAdded?.(selectedCountry.id, city)
      setForm(f => ({ ...f, cityId: city.id, city: city.name }))
      setNewCityName('')
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingCity(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (submitting) return
    const name = form.name.trim()
    if (!name) return setError('Clinic name is required.')
    if (!form.cityId) return setError('Choose a city.')
    if (form.lat === '' || form.lng === '') return setError('Latitude and longitude are both required.')
    const id = form.id.trim() || slugify(name)
    if (existing.some(l => l.id === id && l.id !== originalId)) {
      return setError(`The id "${id}" is already in use.`)
    }
    setError('')
    setSubmitting(true)
    // On success the parent closes (unmounts) this form; on failure the toast
    // explains why and the form stays open with the admin's input intact.
    const ok = await onSave({ ...form, id, name }, originalId)
    if (!ok) setSubmitting(false)
  }

  const mapHref = form.lat !== '' && form.lng !== '' ? `https://maps.google.com/?q=${form.lat},${form.lng}` : null

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose} disabled={submitting}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New clinic' : 'Edit clinic'}</h1>
          <p className="ad-view-sub">{isNew ? 'Add a location to the Find a Clinic page.' : form.id}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Create clinic' : 'Save changes'}
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
                {!form.country && <option value="">Choose a country…</option>}
                {sortCountries(countryOptions).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
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
          {canAddCity ? (
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
              <span className="ad-field-hint">
                Adds the English name only — add its Arabic name on the <strong>Countries</strong> screen.
              </span>
            </div>
          ) : (
            <span className="ad-field-hint">
              City not listed? An administrator can add it on the <strong>Countries</strong> screen.
            </span>
          )}
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
