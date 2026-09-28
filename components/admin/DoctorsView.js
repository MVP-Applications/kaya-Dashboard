'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import ReorderCell from './ReorderCell'
import { emptyDoctor } from '@/lib/admin/seed'
import DoctorForm from './DoctorForm'

export default function DoctorsView() {
  const { doctors, verticals, countryRecords, deleteDoctor, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState('')
  const [country, setCountry] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const verticalMeta = useMemo(() => {
    const map = {}
    verticals.forEach(v => { map[v.id] = v })
    return map
  }, [verticals])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return doctors.filter(d => {
      if (vertical && !(d.verticals || []).includes(vertical)) return false
      if (country && !(d.countries || []).includes(country)) return false
      if (q && !(`${d.name} ${d.specialist} ${d.slug}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [doctors, query, vertical, country])

  const isFiltered = Boolean(query.trim() || vertical || country)
  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  if (editing) {
    return (
      <DoctorForm
        initial={editing.initial}
        isNew={editing.isNew}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Doctors</h1>
          <p className="ad-view-sub">{doctors.length} doctors · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyDoctor(), isNew: true })}>
            + New doctor
          </button>
        )}
      </div>

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search by name or specialist…"
          value={query} onChange={e => setQuery(e.target.value)} />
        <select className="ad-input ad-filter" value={vertical} onChange={e => setVertical(e.target.value)}>
          <option value="">All verticals</option>
          {verticals.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
        <select className="ad-input ad-filter" value={country} onChange={e => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countryRecords.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th className="ad-th-order">Order</th>
              <th>Doctor</th>
              <th>Verticals</th>
              <th>Countries</th>
              <th>Exp.</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.slug}>
                <td className="ad-td-order">
                  <ReorderCell
                    collection="doctors"
                    itemKey={d.slug}
                    index={doctors.indexOf(d)}
                    total={doctors.length}
                    disabled={isFiltered}
                  />
                </td>
                <td>
                  <div className="ad-doc-cell">
                    <span className="ad-doc-avatar">
                      {d.image
                        ? <img src={d.image} alt="" />
                        : (d.name || '?').replace(/^Dr\.?\s*/i, '').charAt(0)}
                    </span>
                    <span>
                      <span className="ad-cell-name">{d.name}</span>
                      <span className="ad-cell-slug">{d.specialist}</span>
                    </span>
                  </div>
                </td>
                <td>
                  {(d.verticals || []).length ? (
                    <span className="ad-pill-row">
                      {d.verticals.map(vid => (
                        <span key={vid} className="ad-vpill">
                          <span className="ad-vpill-dot" style={{ background: verticalMeta[vid]?.color || '#999' }} />
                          {verticalMeta[vid]?.label || vid}
                        </span>
                      ))}
                    </span>
                  ) : <span className="ad-muted">—</span>}
                </td>
                <td>{(d.countries || []).join(', ') || <span className="ad-muted">—</span>}</td>
                <td>{d.yearsExp !== '' && d.yearsExp != null ? `${d.yearsExp} yrs` : <span className="ad-muted">—</span>}</td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: d, isNew: false })}>Edit</button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(d.slug)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="ad-empty">
                {doctors.length === 0 ? 'No doctors yet. Add your first practitioner.' : 'No doctors match your filters.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete doctor?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteDoctor(confirm); setConfirm(null) }}
        >
          This will remove <strong>{confirm}</strong> and their profile page.
        </ConfirmDialog>
      )}
    </div>
  )
}
