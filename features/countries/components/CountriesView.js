'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import { emptyCountry, sortCountries } from '@/shared/lib/content'
import CountryForm from '@/features/countries/components/CountryForm'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryText } from '@/shared/hooks/useUrlState'

export default function CountriesView() {
  const { countryRecords, upsertCountryRecord, deleteCountryRecord, addCityToCountry, replaceCityInCountry, allowed, dataVersion } = useAdmin()
  // Search and the open record live in the URL (?q, ?edit=<id>, ?new=1) so a
  // refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const editId = get('edit')
  const isNew = get('new') === '1'
  const newCountry = useMemo(() => (isNew ? emptyCountry() : null), [isNew])
  const [confirm, setConfirm] = useState(null)

  // Countries and cities are ADMIN-only on the backend.
  const canCreate = allowed('manageCountries')
  const canDelete = allowed('delete')

  const closeEditor = () => set({ edit: '', new: '' })

  if (isNew || editId) {
    const record = isNew ? newCountry : countryRecords.find(c => String(c.id) === editId)
    if (!record) {
      return <MissingRecord loading={dataVersion === 0} label="country" backHref={href({ edit: '' })} />
    }
    return (
      <CountryForm
        key={isNew ? 'new' : editId}
        initial={record}
        isNew={isNew}
        existing={countryRecords}
        canEdit={allowed('manageCountries')}
        onSave={(rec, orig) => { upsertCountryRecord(rec, orig); closeEditor() }}
        onClose={closeEditor}
        onCityAdded={addCityToCountry}
        onCityUpdated={replaceCityInCountry}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const filtered = sortCountries(countryRecords).filter(c => (
    !q || `${c.name} ${c.nameAr} ${c.code} ${c.isoCode}`.toLowerCase().includes(q)
  ))

  const target = confirm ? countryRecords.find(c => c.id === confirm) : null

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Countries</h1>
          <p className="ad-view-sub">
            The markets Kaya operates in — cities, flag, contact numbers, dial code, and default language for the website.
          </p>
        </div>
        {canCreate && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New country
          </Link>
        )}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search countries…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Country</th>
              <th>Code</th>
              <th>Dial code</th>
              <th>Cities</th>
              <th>Contact</th>
              <th>Language</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>{c.displayOrder ?? 0}</td>
                <td>
                  <div className="ad-cell-name">
                    {c.flagUrl && <img src={c.flagUrl} alt="" style={{ width: 20, height: 14, objectFit: 'cover', marginRight: 8, verticalAlign: 'middle' }} />}
                    {c.name}
                  </div>
                  {c.nameAr && <div className="ad-cell-slug" dir="rtl">{c.nameAr}</div>}
                </td>
                <td><span className="ad-badge">{c.code}</span></td>
                <td>{c.dialCode}</td>
                <td>{c.cities.length}</td>
                <td>{c.contact ? c.contact.phoneNumber : <span className="ad-cell-slug">Not added</span>}</td>
                <td>{c.preferredLanguage}</td>
                <td className="ad-td-actions">
                  <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: c.id })}>
                    {allowed('manageCountries') ? 'Edit' : 'View'}
                  </Link>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(c.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="ad-empty">No countries match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="ad-drawer-scrim" onClick={() => setConfirm(null)}>
          <div className="ad-confirm" onClick={e => e.stopPropagation()}>
            <h3 className="ad-confirm-title">Delete country?</h3>
            <p className="ad-confirm-text">
              <strong>{target.name}</strong> will be removed. This isn&apos;t possible while it still has cities or
              clinics under it — remove those first.
            </p>
            <div className="ad-confirm-actions">
              <button className="ad-btn ad-btn--ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="ad-btn ad-btn--danger"
                onClick={() => { deleteCountryRecord(target.id); setConfirm(null) }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
