'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ReorderCell from '@/shared/components/ReorderCell'
import { emptyDoctor } from '@/shared/lib/seed'
import DoctorForm from '@/features/doctors/components/DoctorForm'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryParam, useQueryText } from '@/shared/hooks/useUrlState'
import { useCountryFilter } from '@/shared/hooks/useCountryFilter'

export default function DoctorsView() {
  const { doctors, verticals, deleteDoctor, allowed, dataVersion } = useAdmin()
  // Filters and the open record live in the URL (?q, ?vertical, ?country,
  // ?edit=<slug>, ?new=1) so a refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const [vertical, setVertical] = useQueryParam('vertical')
  // ?country is shared with the top-bar switcher; empty falls back to it.
  const [country, setCountry, countryOptions] = useCountryFilter()
  const editSlug = get('edit')
  const isNew = get('new') === '1'
  const newDoctor = useMemo(() => (isNew ? emptyDoctor() : null), [isNew])
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

  const closeEditor = () => set({ edit: '', new: '' })

  if (isNew) {
    return <DoctorForm key="new" initial={newDoctor} isNew onClose={closeEditor} />
  }
  if (editSlug) {
    const record = doctors.find(d => d.slug === editSlug)
    if (!record) {
      return <MissingRecord loading={dataVersion === 0} label="doctor" backHref={href({ edit: '' })} />
    }
    return <DoctorForm key={editSlug} initial={record} isNew={false} onClose={closeEditor} />
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Doctors</h1>
          <p className="ad-view-sub">{doctors.length} doctors · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New doctor
          </Link>
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
          {countryOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
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
                  <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: d.slug })}>Edit</Link>
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
