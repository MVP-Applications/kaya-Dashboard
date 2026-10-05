'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { emptyReview } from '@/shared/lib/seed'
import ReviewForm from '@/features/reviews/components/ReviewForm'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryText } from '@/shared/hooks/useUrlState'
import { useCountryFilter } from '@/shared/hooks/useCountryFilter'

export default function ReviewsView() {
  const { reviews, services, deleteReview, allowed, dataVersion } = useAdmin()
  // Search and the open record live in the URL (?q, ?edit=<id>, ?new=1) so a
  // refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  // ?country is shared with the top-bar switcher; empty falls back to it.
  const [country, setCountry, countryOptions] = useCountryFilter()
  const editId = get('edit')
  const isNew = get('new') === '1'
  const newReview = useMemo(() => (isNew ? emptyReview() : null), [isNew])
  const [confirm, setConfirm] = useState(null)

  // `r.treatment` holds the linked treatment VERSION id (one per country) —
  // resolve it to a display name for the table and search.
  const treatmentName = useMemo(() => {
    const map = {}
    services.forEach(s => { map[s.id] = s.name })
    return map
  }, [services])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reviews.filter(r => {
      // A review with no country is shown in every country, so it always matches.
      if (country && r.country && r.country !== country) return false
      if (q && !`${r.name} ${treatmentName[r.treatment] || ''} ${r.location}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [reviews, query, country, treatmentName])

  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  const closeEditor = () => set({ edit: '', new: '' })

  if (isNew) {
    return <ReviewForm key="new" initial={newReview} isNew onClose={closeEditor} />
  }
  if (editId) {
    const record = reviews.find(r => String(r.id) === editId)
    if (!record) {
      return <MissingRecord loading={dataVersion === 0} label="review" backHref={href({ edit: '' })} />
    }
    return <ReviewForm key={editId} initial={record} isNew={false} onClose={closeEditor} />
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Reviews</h1>
          <p className="ad-view-sub">{reviews.length} testimonials · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New review
          </Link>
        )}
      </div>

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search by name, treatment, or location…"
          value={query} onChange={e => setQuery(e.target.value)} />
        <select className="ad-input ad-filter" value={country} onChange={e => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countryOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Treatment</th>
              <th>Rating</th>
              <th>Consent</th>
              <th>Media</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td>
                  <div className="ad-cell-name">{r.name}</div>
                  <div className="ad-cell-slug">{r.location || '—'}</div>
                </td>
                <td>{treatmentName[r.treatment] || <span className="ad-muted">—</span>}</td>
                <td>{'★'.repeat(r.rating || 0)}{'☆'.repeat(5 - (r.rating || 0))}</td>
                <td>
                  {r.consentGiven
                    ? <span className="ad-badge">given</span>
                    : <span className="ad-muted">not given</span>}
                </td>
                <td>
                  {r.before || r.after
                    ? <span className="ad-badge">before / after</span>
                    : <span className="ad-muted">quote only</span>}
                </td>
                <td className="ad-td-actions">
                  <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: r.id })}>Edit</Link>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(r.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="ad-empty">
                {reviews.length === 0 ? 'No reviews yet. Add one to show it on treatment pages.' : 'No reviews match your filters.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete review?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteReview(confirm); setConfirm(null) }}
        >
          This will remove <strong>{confirm}</strong> from the treatment pages it
          appears on.
        </ConfirmDialog>
      )}
    </div>
  )
}
