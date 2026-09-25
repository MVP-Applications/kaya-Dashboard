'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { emptyCountry } from '@/lib/admin/content'
import CountryForm from './CountryForm'

export default function CountriesView() {
  const { countryRecords, upsertCountryRecord, deleteCountryRecord, addCityToCountry, allowed } = useAdmin()
  const [editing, setEditing] = useState(null) // { initial, isNew }
  const [confirm, setConfirm] = useState(null)
  const [query, setQuery] = useState('')

  const canCreate = allowed('create')
  const canDelete = allowed('delete')

  if (editing) {
    return (
      <CountryForm
        initial={editing.initial}
        isNew={editing.isNew}
        existing={countryRecords}
        onSave={(rec, orig) => { upsertCountryRecord(rec, orig); setEditing(null) }}
        onClose={() => setEditing(null)}
        onCityAdded={addCityToCountry}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const filtered = countryRecords.filter(c => (
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
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyCountry(), isNew: true })}>
            + New country
          </button>
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
              <th>Country</th>
              <th>Code</th>
              <th>Dial code</th>
              <th>Cities</th>
              <th>Call number</th>
              <th>WhatsApp</th>
              <th>Language</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
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
                <td>{c.primaryCallNumber || '—'}</td>
                <td>{c.whatsappNumber || '—'}</td>
                <td>{c.preferredLanguage}</td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: c, isNew: false })}>Edit</button>
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
