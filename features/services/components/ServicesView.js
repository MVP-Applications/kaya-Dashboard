'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ReorderCell from '@/shared/components/ReorderCell'
import ServiceForm from '@/features/services/components/ServiceForm'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryParam, useQueryText } from '@/shared/hooks/useUrlState'

function ServiceFormSkeleton({ onClose }) {
  return (
    <div className="ad-editor" role="status" aria-live="polite">
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">Edit treatment</h1>
          <p className="ad-view-sub">Loading treatment details…</p>
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

/**
 * Treatments list. Each treatment has one version per country; with a
 * country picked in the top-bar switcher (`?country=`) the list shows that
 * country's versions in their display order (reorderable), otherwise one row
 * per treatment with the countries it's offered in.
 */
export default function ServicesView() {
  const {
    services, verticals, deleteService, loadService, allowed, dataVersion,
    activeCountry, accessibleCountries,
  } = useAdmin()
  // Filters and the open record live in the URL (?q, ?vertical,
  // ?edit=<treatment id>, ?new=1) so a refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const [vertical, setVertical] = useQueryParam('vertical')
  const editId = get('edit')
  const isNew = get('new') === '1'
  const [loaded, setLoaded] = useState(null)     // { id, versions } — undefined while loading, null if not found
  const [confirm, setConfirm] = useState(null)    // { groupId, name } pending delete
  const ready = dataVersion > 0

  const verticalMeta = useMemo(() => {
    const map = {}
    verticals.forEach(v => { map[v.id] = v })
    return map
  }, [verticals])

  const countryName = useMemo(() => {
    const map = {}
    accessibleCountries.forEach(c => { map[c.code] = c.name })
    return map
  }, [accessibleCountries])

  // One country: its versions. All countries: one row per treatment, named
  // after its first version, with every country it's offered in.
  const rows = useMemo(() => {
    if (activeCountry) {
      return services
        .filter(s => s.country === activeCountry)
        .map(s => ({ key: s.id, groupId: s.groupId, version: s, countries: [s.country] }))
    }
    const groups = new Map()
    services.forEach(s => {
      const g = groups.get(s.groupId)
      if (g) g.countries.push(s.country)
      else groups.set(s.groupId, { key: s.groupId, groupId: s.groupId, version: s, countries: [s.country] })
    })
    return [...groups.values()]
  }, [services, activeCountry])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(({ version: s }) => {
      if (vertical && !(s.verticals || []).includes(vertical)) return false
      if (q && !(`${s.name} ${s.slug}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [rows, query, vertical])

  const canDelete = allowed('delete')
  const canCreate = allowed('create')
  const isFiltered = Boolean(query.trim() || vertical)
  // Order is per country, so it can only be changed with one country in view.
  const canReorder = Boolean(activeCountry) && !isFiltered
  const treatmentCount = useMemo(() => new Set(services.map(s => s.groupId)).size, [services])

  // Edit always starts from the backend's latest copy, not the list's
  // possibly-stale one. Ignores the result if the admin has since gone Back
  // or opened another treatment.
  useEffect(() => {
    if (!editId || !ready) { setLoaded(null); return }
    let cancelled = false
    setLoaded({ id: editId, versions: undefined })
    loadService(editId).then(fresh => {
      if (!cancelled) setLoaded({ id: editId, versions: fresh && fresh.length ? fresh : null })
    })
    return () => { cancelled = true }
  }, [editId, ready, loadService])

  const closeEditor = () => set({ edit: '', new: '', tab: '' })

  // The create/edit form is a full page within the dashboard.
  if (isNew) {
    return <ServiceForm key="new" groupId={null} initialVersions={[]} onClose={closeEditor} />
  }
  if (editId) {
    const current = loaded?.id === editId ? loaded.versions : undefined
    if (current === undefined) {
      return <ServiceFormSkeleton onClose={closeEditor} />
    }
    if (!current) {
      return <MissingRecord label="treatment" backHref={href({ edit: '' })} />
    }
    return <ServiceForm key={editId} groupId={editId} initialVersions={current} onClose={closeEditor} />
  }

  const scopeLabel = activeCountry ? countryName[activeCountry] || activeCountry : 'all your countries'

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Treatments &amp; Services</h1>
          <p className="ad-view-sub">
            {treatmentCount} treatments · showing {filtered.length} in {scopeLabel}
          </p>
        </div>
        {canCreate && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New treatment
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
              {activeCountry && <th className="ad-th-order">Order</th>}
              <th>Name</th>
              <th>Countries</th>
              <th>Verticals</th>
              <th>Badge</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ key, groupId, version: s, countries }, i) => (
              <tr key={key}>
                {activeCountry && (
                  <td className="ad-td-order">
                    <ReorderCell
                      collection="services"
                      itemKey={s.id}
                      index={i}
                      total={filtered.length}
                      disabled={!canReorder}
                    />
                  </td>
                )}
                <td>
                  <div className="ad-cell-name">{s.name}</div>
                  <div className="ad-cell-slug">{s.slug}</div>
                </td>
                <td>
                  <span className="ad-pill-row">
                    {countries.map(code => (
                      <span key={code} className="ad-badge" title={countryName[code] || code}>{code}</span>
                    ))}
                  </span>
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
                  <Link className="ad-btn ad-btn--soft ad-btn--sm"
                    href={href({ edit: groupId, tab: activeCountry || countries[0] })}>Edit</Link>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm({ groupId, name: s.name })}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={activeCountry ? 6 : 5} className="ad-empty">
                  {rows.length === 0
                    ? `No treatments in ${scopeLabel} yet. Create your first one to see it on the site.`
                    : 'No treatments match your filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete treatment?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteService(confirm.groupId); setConfirm(null) }}
        >
          This will remove <strong>{confirm.name}</strong> in every country it&apos;s offered in
          and take it off every page it appears on. To stop offering it in one country only,
          open it and switch that country off.
        </ConfirmDialog>
      )}
    </div>
  )
}
