'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import { emptyReview } from '@/lib/admin/seed'
import ReviewForm from './ReviewForm'
import MissingRecord from './MissingRecord'
import { useQuery, useQueryText } from './useUrlState'

export default function ReviewsView() {
  const { reviews, services, deleteReview, allowed, dataVersion } = useAdmin()
  // Search and the open record live in the URL (?q, ?edit=<id>, ?new=1) so a
  // refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const editId = get('edit')
  const isNew = get('new') === '1'
  const newReview = useMemo(() => (isNew ? emptyReview() : null), [isNew])
  const [confirm, setConfirm] = useState(null)

  // `r.treatment` holds the linked Treatment's slug (KA-44) — resolve it to
  // a display name for the table and search instead of showing the slug.
  const treatmentName = useMemo(() => {
    const map = {}
    services.forEach(s => { map[s.slug] = s.name })
    return map
  }, [services])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return reviews
    return reviews.filter(r => (
      `${r.name} ${treatmentName[r.treatment] || r.treatment} ${r.location}`.toLowerCase().includes(q)
    ))
  }, [reviews, query, treatmentName])

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
