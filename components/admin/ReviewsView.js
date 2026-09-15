'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import { emptyReview } from '@/lib/admin/seed'
import ReviewForm from './ReviewForm'

export default function ReviewsView() {
  const { reviews, deleteReview, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return reviews
    return reviews.filter(r => `${r.name} ${r.treatment} ${r.location}`.toLowerCase().includes(q))
  }, [reviews, query])

  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  if (editing) {
    return (
      <ReviewForm initial={editing.initial} isNew={editing.isNew} onClose={() => setEditing(null)} />
    )
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Reviews</h1>
          <p className="ad-view-sub">{reviews.length} testimonials · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyReview(), isNew: true })}>
            + New review
          </button>
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
                <td>{r.treatment || <span className="ad-muted">—</span>}</td>
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
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: r, isNew: false })}>Edit</button>
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
