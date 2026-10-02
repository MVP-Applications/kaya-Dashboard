'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import { emptyLocation, sortCountries } from '@/shared/lib/content'
import { createCity, updateCity } from '@/shared/lib/store'
import LocaleToggle from '@/shared/components/LocaleToggle'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryParam, useQueryText } from '@/shared/hooks/useUrlState'

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
  const { locations, saveLocation, loadLocation, deleteLocation, countryRecords, addCityToCountry, replaceCityInCountry, allowed, loading, dataVersion } = useAdmin()
  // Filters and the open record live in the URL (?q, ?country — 'all' is
  // the default and left out — ?edit=<id>, ?new=1) so a refresh or a new tab
  // reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const [country, setCountry] = useQueryParam('country', 'all')
  const editId = get('edit')
  const isNew = get('new') === '1'
  const firstCountry = sortCountries(countryRecords)[0]?.code
  const newLocation = useMemo(() => (isNew ? emptyLocation(firstCountry) : null), [isNew, firstCountry])
  // The backend's latest copy of the clinic in ?edit: { id, record } once
  // fetched (record null if it couldn't be loaded); null while loading.
  const [fresh, setFresh] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const canCreate = allowed('create')
  const canDelete = allowed('delete')

  // Edit always starts from the backend's latest copy, not the list's
  // possibly-stale one. Ignore the result if the admin has since gone Back
  // or opened another clinic.
  useEffect(() => {
    setFresh(null)
    if (!editId) return
    let current = true
    loadLocation(editId).then(record => {
      if (current) setFresh({ id: editId, record })
    })
    return () => { current = false }
  }, [editId, loadLocation])

  const closeEditor = () => set({ edit: '', new: '' })

  if (editId && fresh?.id !== editId) {
    return <LocationFormSkeleton onClose={closeEditor} />
  }

  // A fresh page load on ?new=1 waits for the countries, so the new clinic
  // defaults to the first one like it does from the list.
  if ((isNew && dataVersion === 0) || (editId && !fresh.record)) {
    return <MissingRecord loading={!editId} label="clinic" backHref={href({ edit: '', new: '' })} />
  }

  if (isNew || editId) {
    return (
      <LocationForm
        key={isNew ? 'new' : editId}
        initial={isNew ? newLocation : fresh.record}
        isNew={isNew}
        countryOptions={countryRecords}
        onCityAdded={addCityToCountry}
        onCityUpdated={replaceCityInCountry}
        canManageCities={allowed('manageCountries')}
        onSave={async (rec, orig) => {
          const ok = await saveLocation(rec, orig)
          if (ok) closeEditor()
          return ok
        }}
        onClose={closeEditor}
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
        {/* A link can't be disabled, so it stays a button while the list loads. */}
        {canCreate && (loading ? (
          <button className="ad-btn ad-btn--primary" disabled>+ New clinic</button>
        ) : (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New clinic
          </Link>
        ))}
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
                  <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: l.id })}>Edit</Link>
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

function LocationForm({ initial, isNew, countryOptions, onCityAdded, onCityUpdated, onSave, onClose, canManageCities = true }) {
  const [form, setForm] = useState({ ...initial })
  const [error, setError] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [newCityNameAr, setNewCityNameAr] = useState('')
  const [addingCity, setAddingCity] = useState(false)
  // Draft of the selected city's Arabic name; null = untouched (show the saved one).
  const [cityArDraft, setCityArDraft] = useState(null)
  const [savingCityAr, setSavingCityAr] = useState(false)
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
  const selectedCity = cities.find(c => c.id === form.cityId)
  const cityAr = cityArDraft ?? selectedCity?.nameAr ?? ''
  const cityArChanged = cityArDraft !== null && cityArDraft.trim() !== (selectedCity?.nameAr || '')

  function chooseCountry(code) {
    set('country', code)
    set('cityId', '')
    set('city', '')
    setCityArDraft(null)
  }

  function chooseCity(cityId) {
    const city = cities.find(c => c.id === cityId)
    setForm(f => ({ ...f, cityId, city: city?.name || '' }))
    setCityArDraft(null)
  }

  async function addCity() {
    const name = newCityName.trim()
    if (!name || !selectedCountry) return
    setAddingCity(true)
    try {
      const city = await createCity(selectedCountry.id, name, newCityNameAr)
      onCityAdded?.(selectedCountry.id, city)
      setForm(f => ({ ...f, cityId: city.id, city: city.name }))
      setCityArDraft(null)
      setNewCityName('')
      setNewCityNameAr('')
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingCity(false)
    }
  }

  // Like "+ Add city", this saves the city straight away (it's a Countries
  // record shared by every clinic in that city), not with the clinic form.
  async function saveCityAr() {
    if (!selectedCity || !cityArChanged) return
    setSavingCityAr(true)
    try {
      const city = await updateCity(selectedCity.id, { name: selectedCity.name, nameAr: cityArDraft.trim() })
      onCityUpdated?.(selectedCountry.id, city)
      setCityArDraft(null)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingCityAr(false)
    }
  }

  // Enter in a city input should act on that city, not submit the clinic form.
  const onEnter = action => e => {
    if (e.key === 'Enter') { e.preventDefault(); action() }
  }

  async function submit(e) {
    e.preventDefault()
    if (submitting) return
    const name = form.name.trim()
    if (!name) return setError('Clinic name is required.')
    if (!form.cityId) return setError('Choose a city.')
    if (form.lat === '' || form.lng === '') return setError('Latitude and longitude are both required.')
    setError('')
    setSubmitting(true)
    // On success the parent closes (unmounts) this form; on failure the toast
    // explains why and the form stays open with the admin's input intact.
    // The clinic id is generated by the backend, so none is sent from here.
    const ok = await onSave({ ...form, name }, originalId)
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

      <div className="ad-editor-body ad-form-sections">
        <div className="ad-pair">
          <fieldset className="ad-fieldset">
            <legend>Name &amp; address</legend>
            <p className="ad-fieldset-hint">
              English is required. Fill in the Arabic name and address to add an Arabic translation.
            </p>
            <LocaleToggle locale={locale} onChange={setLocale} />
            <label className="ad-field ad-w-lg">
              <span className="ad-field-label">{isAr ? 'اسم العيادة (Clinic name)' : 'Clinic name *'}</span>
              <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[nameKey]}
                onChange={e => set(nameKey, e.target.value)} />
            </label>
            <label className="ad-field ad-w-xl">
              <span className="ad-field-label">{isAr ? 'العنوان (Address)' : 'Address'}</span>
              <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={2} value={form[addressKey]}
                onChange={e => set(addressKey, e.target.value)} />
            </label>
          </fieldset>

          <fieldset className="ad-fieldset">
            <legend>Contact &amp; map</legend>
            <div className="ad-frow">
              <label className="ad-field ad-w-md">
                <span className="ad-field-label">Telephone</span>
                <input className="ad-input" type="tel" value={form.tel} onChange={e => set('tel', e.target.value)}
                  placeholder="04 450 1001" />
              </label>
            </div>
            <p className="ad-fieldset-hint ad-fsub">Coordinates are used for the Find a Clinic map and directions link.</p>
            <div className="ad-frow">
              <label className="ad-field ad-w-sm">
                <span className="ad-field-label">Latitude *</span>
                <input className="ad-input" type="number" step="any" value={form.lat}
                  onChange={e => set('lat', e.target.value)} placeholder="25.2048" />
              </label>
              <label className="ad-field ad-w-sm">
                <span className="ad-field-label">Longitude *</span>
                <input className="ad-input" type="number" step="any" value={form.lng}
                  onChange={e => set('lng', e.target.value)} placeholder="55.2708" />
              </label>
              {mapHref && (
                <a className="ad-btn ad-btn--soft ad-frow-btn" href={mapHref} target="_blank" rel="noreferrer">
                  Preview on Google Maps ↗
                </a>
              )}
            </div>
          </fieldset>
        </div>

        <fieldset className="ad-fieldset">
          <legend>Location</legend>
          <div className="ad-loc-cityline">
            <div className="ad-frow">
              <label className="ad-field ad-w-md">
                <span className="ad-field-label">Country</span>
                <select className="ad-input" value={form.country} onChange={e => chooseCountry(e.target.value)}>
                  {!form.country && <option value="">Choose a country…</option>}
                  {sortCountries(countryOptions).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className="ad-field ad-w-md">
                <span className="ad-field-label">City *</span>
                <select className="ad-input" value={form.cityId} onChange={e => chooseCity(e.target.value)}>
                  <option value="">Choose a city…</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            {selectedCity && (
              canManageCities ? (
                <div className="ad-fblock">
                  <div className="ad-frow">
                    <label className="ad-field ad-w-md">
                      <span className="ad-field-label">City name in Arabic</span>
                      <input className="ad-input" dir="rtl" value={cityAr} placeholder="الاسم بالعربية، مثل دبي"
                        onChange={e => setCityArDraft(e.target.value)} onKeyDown={onEnter(saveCityAr)} />
                    </label>
                    <button type="button" className="ad-btn ad-btn--soft ad-frow-btn" disabled={!cityArChanged || savingCityAr}
                      onClick={saveCityAr}>
                      {savingCityAr ? 'Saving…' : 'Save Arabic name'}
                    </button>
                  </div>
                  <span className="ad-field-hint">
                    Saves to the city itself, so every clinic in {selectedCity.name} shows it on the Arabic site.
                  </span>
                </div>
              ) : (
                <p className="ad-field-hint ad-fblock">
                  Arabic city name: {selectedCity.nameAr ? <span dir="rtl">{selectedCity.nameAr}</span> : 'not set'}
                  {' '}— an administrator can change it here or on the <strong>Countries</strong> screen.
                </p>
              )
            )}
          </div>
          {canManageCities ? (
            <div className="ad-fblock ad-fsub">
              <span className="ad-field-label">City not listed? Add it to {selectedCountry?.name || 'this country'}</span>
              <div className="ad-frow">
                <input className="ad-input ad-w-md" value={newCityName} placeholder="English name, e.g. Al Ain"
                  aria-label="New city name in English"
                  onChange={e => setNewCityName(e.target.value)} onKeyDown={onEnter(addCity)} />
                <input className="ad-input ad-w-md" dir="rtl" value={newCityNameAr} placeholder="الاسم بالعربية، مثل العين"
                  aria-label="New city name in Arabic"
                  onChange={e => setNewCityNameAr(e.target.value)} onKeyDown={onEnter(addCity)} />
                <button type="button" className="ad-btn ad-btn--soft ad-frow-btn" disabled={!newCityName.trim() || addingCity}
                  onClick={addCity}>
                  {addingCity ? 'Adding…' : '+ Add city'}
                </button>
              </div>
            </div>
          ) : (
            <p className="ad-field-hint ad-fblock">
              City not listed? An administrator can add it on the <strong>Countries</strong> screen.
            </p>
          )}
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Opening hours</legend>
          <div className="ad-hours">
            <div className="ad-hours-row ad-hours-head" aria-hidden="true">
              <span className="ad-field-label">Day</span>
              <span className="ad-field-label ad-hours-open">Opens</span>
              <span className="ad-field-label ad-hours-close">Closes</span>
            </div>
            {DAYS.map(([key, label]) => {
              const closed = form.hours[key] === 'closed'
              const [openAt, closeAt] = closed ? ['', ''] : form.hours[key].split('-')
              return (
                <div key={key} className={`ad-hours-row${closed ? ' is-closed' : ''}`}>
                  <span className="ad-hours-day">{label}</span>
                  {closed ? (
                    <span className="ad-hours-closed-note">Closed all day</span>
                  ) : (
                    <>
                      <label className="ad-hours-open">
                        <span className="ad-hours-cap">Opens</span>
                        <input className="ad-input" type="time" value={openAt || ''} aria-label={`${label} opens`}
                          onChange={e => setHour(key, `${e.target.value}-${closeAt || '18:00'}`)} />
                      </label>
                      <label className="ad-hours-close">
                        <span className="ad-hours-cap">Closes</span>
                        <input className="ad-input" type="time" value={closeAt || ''} aria-label={`${label} closes`}
                          onChange={e => setHour(key, `${openAt || '09:00'}-${e.target.value}`)} />
                      </label>
                    </>
                  )}
                  <label className={`ad-check ad-hours-toggle${closed ? ' active' : ''}`}>
                    <input type="checkbox" checked={closed}
                      onChange={e => setHour(key, e.target.checked ? 'closed' : '09:00-18:00')} />
                    Closed
                  </label>
                </div>
              )
            })}
          </div>
        </fieldset>
      </div>
    </form>
  )
}
