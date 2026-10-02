'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ReorderCell from '@/shared/components/ReorderCell'
import { emptyService } from '@/shared/lib/seed'
import ServiceForm from '@/features/services/components/ServiceForm'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryParam, useQueryText } from '@/shared/hooks/useUrlState'

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
  const { services, verticals, deleteService, loadService, allowed, dataVersion } = useAdmin()
  // Filters and the open record live in the URL (?q, ?vertical,
  // ?edit=<slug>, ?new=1) so a refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const [vertical, setVertical] = useQueryParam('vertical')
  const editSlug = get('edit')
  const isNew = get('new') === '1'
  const newService = useMemo(() => (isNew ? emptyService() : null), [isNew])
  const [loaded, setLoaded] = useState(null)     // { slug, record } — record undefined while loading, null if not found
  const [confirm, setConfirm] = useState(null)    // slug pending delete
  const ready = dataVersion > 0

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
  // possibly-stale one. Waits for the first data load (the API looks the
  // slug up in the list), and ignores the result if the admin has since gone
  // Back or opened another service.
  useEffect(() => {
    if (!editSlug || !ready) { setLoaded(null); return }
    let cancelled = false
    setLoaded({ slug: editSlug, record: undefined })
    loadService(editSlug).then(fresh => {
      if (!cancelled) setLoaded({ slug: editSlug, record: fresh || null })
    })
    return () => { cancelled = true }
  }, [editSlug, ready, loadService])

  const closeEditor = () => set({ edit: '', new: '' })

  // The create/edit form is a full page within the dashboard.
  if (isNew) {
    return <ServiceForm key="new" initial={newService} isNew onClose={closeEditor} />
  }
  if (editSlug) {
    const current = loaded?.slug === editSlug ? loaded.record : undefined
    if (current === undefined) {
      return <ServiceFormSkeleton onClose={closeEditor} />
    }
    if (!current) {
      return <MissingRecord label="service" backHref={href({ edit: '' })} />
    }
    return <ServiceForm key={editSlug} initial={current} isNew={false} onClose={closeEditor} />
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Treatments &amp; Services</h1>
          <p className="ad-view-sub">{services.length} services · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New service
          </Link>
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
                  <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: s.slug })}>Edit</Link>
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
