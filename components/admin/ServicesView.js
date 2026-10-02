'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import ReorderCell from './ReorderCell'
import { emptyService } from '@/lib/admin/seed'
import ServiceForm from './ServiceForm'

function ServiceFormSkeleton({ onClose }) {
  return (
    <div className="ad-editor" role="status" aria-live="polite">
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">Edit service</h1>
          <p className="ad-view-sub">Loading service details…</p>
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

export default function ServicesView() {
  const { services, verticals, deleteService, loadService, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState('')
  const [editing, setEditing] = useState(null)   // { initial, isNew, loading? } | null
  const [confirm, setConfirm] = useState(null)    // slug pending delete

  const verticalMeta = useMemo(() => {
    const map = {}
    verticals.forEach(v => { map[v.id] = v })
    return map
  }, [verticals])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter(s => {
      if (vertical && !(s.verticals || []).includes(vertical)) return false
      if (q && !(`${s.name} ${s.slug}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [services, query, vertical])

  const canDelete = allowed('delete')
  const canCreate = allowed('create')
  const isFiltered = Boolean(query.trim() || vertical)

  // Edit always starts from the backend's latest copy, not the list's
  // possibly-stale one. Ignore the result if the admin has since gone Back
  // or opened another service.
  async function openEdit(s) {
    setEditing({ initial: s, isNew: false, loading: true })
    const fresh = await loadService(s.slug)
    setEditing(e => {
      if (!e || !e.loading || e.initial.slug !== s.slug) return e
      return fresh ? { initial: fresh, isNew: false } : null
    })
  }

  if (editing?.loading) {
    return <ServiceFormSkeleton onClose={() => setEditing(null)} />
  }

  // The create/edit form is a full page within the dashboard.
  if (editing) {
    return (
      <ServiceForm
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
          <h1 className="ad-view-title">Treatments &amp; Services</h1>
          <p className="ad-view-sub">{services.length} services · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyService(), isNew: true })}>
            + New service
          </button>
        )}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search by name, slug, or tag…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select className="ad-input ad-filter" value={vertical} onChange={e => setVertical(e.target.value)}>
          <option value="">All verticals</option>
          {verticals.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th className="ad-th-order">Order</th>
              <th>Name</th>
              <th>Verticals</th>
              <th>Badge</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.slug}>
                <td className="ad-td-order">
                  <ReorderCell
                    collection="services"
                    itemKey={s.slug}
                    index={services.indexOf(s)}
                    total={services.length}
                    disabled={isFiltered}
                  />
                </td>
                <td>
                  <div className="ad-cell-name">{s.name}</div>
                  <div className="ad-cell-slug">{s.slug}</div>
                </td>
                <td>
                  {(s.verticals || []).length ? (
                    <span className="ad-pill-row">
                      {s.verticals.map(vid => (
                        <span key={vid} className="ad-vpill">
                          <span className="ad-vpill-dot" style={{ background: verticalMeta[vid]?.color || '#999' }} />
                          {verticalMeta[vid]?.label || vid}
                        </span>
                      ))}
                    </span>
                  ) : <span className="ad-muted">—</span>}
                </td>
                <td>{s.badge ? <span className="ad-badge">{s.badge}</span> : <span className="ad-muted">—</span>}</td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => openEdit(s)}>Edit</button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(s.slug)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="ad-empty">
                  {services.length === 0
                    ? 'No services yet. Create your first one to see it on the site.'
                    : 'No services match your filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete service?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteService(confirm); setConfirm(null) }}
        >
          This will remove <strong>{confirm}</strong> and take it off every page it
          appears on.
        </ConfirmDialog>
      )}
    </div>
  )
}
