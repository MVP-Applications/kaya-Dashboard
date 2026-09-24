'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import { siteUrl } from '@/lib/site'
import { downloadCsv, stampedName } from '@/lib/admin/csv'
import { exportRequestsCsv } from '@/lib/admin/store'
import {
  REQUEST_STATUS_OPTIONS,
  REQUEST_SOURCE_OPTIONS,
  REQUEST_STATUS_LABELS,
  REQUEST_SOURCE_LABELS,
} from '@/lib/admin/seed'

const PAGE_SIZE = 20

// Fixed count rather than PAGE_SIZE — a full page of shimmer rows reads as
// "here's your data" rather than "still loading," and is needless work for
// something about to be thrown away.
const SKELETON_ROWS = 6

function RequestRowSkeleton() {
  return (
    <tr aria-hidden="true">
      <td>
        <div className="ad-skeleton-block" style={{ width: '72%' }} />
        <div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '45%' }} />
      </td>
      <td>
        <div className="ad-skeleton-block" style={{ width: '70%' }} />
        <div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '40%' }} />
      </td>
      <td>
        <div className="ad-skeleton-block" style={{ width: '50%' }} />
        <div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '65%' }} />
      </td>
      <td>
        <div className="ad-skeleton-block" style={{ width: '55%' }} />
        <div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '35%' }} />
      </td>
      <td><div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '60%' }} /></td>
      <td><div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '50%' }} /></td>
      <td className="ad-td-actions"><div className="ad-skeleton-block ad-skeleton-block--sm" style={{ width: '80%', marginLeft: 'auto' }} /></td>
    </tr>
  )
}

// Date ranges offered in the toolbar. `days` counts back from now; null is
// "no limit" so the option list stays a single flat shape.
const DATE_RANGES = [
  { id: '', label: 'Any time', days: null },
  { id: '1', label: 'Last 24 hours', days: 1 },
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'custom', label: 'Between two dates…', days: null },
]

/** Start of the given day, local time, as an ISO string for the API. */
function dayStartIso(value) {
  if (!value) return undefined
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** End of the given day — 23:59:59.999 local — inclusive, as an ISO string. */
function dayEndIso(value) {
  if (!value) return undefined
  const d = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function StatusPill({ status }) {
  return (
    <span className={`ad-status ad-status--${status}`}>
      <span className="ad-status-dot" />
      {REQUEST_STATUS_LABELS[status] || status}
    </span>
  )
}

// "23 Jul 2026, 08:12" — compact and locale-stable enough for the demo.
function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// "3 hours ago" / "2 days ago" relative to now — a light freshness cue.
function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function RequestsView() {
  const {
    requestStatusCounts, loadRequestsPage, loadRequestCountries,
    updateRequestStatus, updateRequestNotes, deleteRequestRecord, allowed, services,
  } = useAdmin()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  // A treatment's slug — the store resolves it to whatever the backend matches on.
  const [treatment, setTreatment] = useState('')
  const [range, setRange] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [countries, setCountries] = useState([])
  const [openId, setOpenId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [statusConfirm, setStatusConfirm] = useState(null) // { id, name, to } | null
  const [statusChanging, setStatusChanging] = useState(false)
  const [statusChangeError, setStatusChangeError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const canDelete = allowed('delete')

  // Debounce free-text search — every keystroke is now a real network
  // request, unlike the old client-side filter.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Any filter change starts back at page 1 — staying on page 6 of a filter
  // that now has 2 pages would just show an empty screen.
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, status, source, country, city, treatment, range, from, to])

  const dateBounds = useMemo(() => {
    const preset = DATE_RANGES.find(d => d.id === range)
    if (range === 'custom') return { from: dayStartIso(from), to: dayEndIso(to) }
    if (preset?.days) return { from: new Date(Date.now() - preset.days * 86400_000).toISOString(), to: undefined }
    return { from: undefined, to: undefined }
  }, [range, from, to])

  // The list of countries (and their cities) to populate the filters — loaded
  // once; it doesn't change while the screen is open.
  useEffect(() => {
    let alive = true
    loadRequestCountries().then(list => { if (alive) setCountries(list) }).catch(() => {})
    return () => { alive = false }
  }, [loadRequestCountries])

  // Cities narrow to the selected country, same as before KA-23 — offering
  // Riyadh while filtering UAE is a dead end.
  const cities = useMemo(() => {
    if (!country) return countries.flatMap(c => c.cities || [])
    return countries.find(c => c.id === country)?.cities || []
  }, [countries, country])

  const treatmentOptions = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services],
  )

  const filters = useMemo(() => ({
    search: debouncedQuery, status, source, country, city,
    // Only sent when set, so an unfiltered request is exactly what it was before.
    ...(treatment ? { treatment } : {}),
    from: dateBounds.from, to: dateBounds.to,
  }), [debouncedQuery, status, source, country, city, treatment, dateBounds])

  useEffect(() => {
    let alive = true
    setLoading(true)
    loadRequestsPage({ ...filters, page, pageSize: PAGE_SIZE })
      .then(res => {
        if (!alive) return
        setItems(res.items)
        setTotal(res.total)
        setLoadError('')
      })
      .catch(e => { if (alive) setLoadError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [loadRequestsPage, filters, page])

  const open = openId ? items.find(r => r.id === openId) : null

  // Seed the note draft from whichever record is opened, but only when the
  // open record itself changes — not on every re-render, which would wipe
  // out an in-progress edit each time `items` gets replaced by a poll/save.
  useEffect(() => {
    setNoteDraft(open?.notes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const isFiltered = Boolean(query.trim() || status || source || country || city || treatment || range || from || to)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function clearFilters() {
    setQuery(''); setStatus(''); setSource('')
    setCountry(''); setCity(''); setTreatment(''); setRange(''); setFrom(''); setTo('')
  }

  /** Opens the confirmation prompt; the actual API call waits for confirmStatusChange. */
  function requestStatusChange(record, next) {
    if (record.status === next) return
    setStatusChangeError('')
    setStatusConfirm({ id: record.id, name: record.name, to: next })
  }

  /**
   * Unlike the optimistic update/rollback pattern everywhere else in this
   * screen, this applies the new status only once the API call actually
   * succeeds — the confirm dialog is showing a busy state in the meantime,
   * so there's no UI benefit to updating early, and it keeps "dismissed the
   * dialog" and "the change is live" the same moment.
   */
  async function confirmStatusChange() {
    if (!statusConfirm) return
    setStatusChanging(true)
    setStatusChangeError('')
    try {
      await updateRequestStatus(statusConfirm.id, statusConfirm.to)
      setItems(list => list.map(r => (r.id === statusConfirm.id ? { ...r, status: statusConfirm.to } : r)))
      setStatusConfirm(null)
    } catch (e) {
      setStatusChangeError(e.message)
    } finally {
      setStatusChanging(false)
    }
  }

  function cancelStatusChange() {
    if (statusChanging) return
    setStatusConfirm(null)
    setStatusChangeError('')
  }

  /** Saved on blur, not per keystroke — every keystroke is a real network call now, unlike the old client-side store. */
  async function handleNotesBlur() {
    if (!open || open.notes === noteDraft) return
    const prev = items
    setItems(items.map(r => (r.id === open.id ? { ...r, notes: noteDraft } : r)))
    try {
      await updateRequestNotes(open.id, noteDraft)
    } catch {
      setItems(prev)
      setNoteDraft(open.notes || '')
    }
  }

  async function handleDelete(record) {
    const prev = items
    setItems(items.filter(r => r.id !== record.id))
    setTotal(t => Math.max(0, t - 1))
    try {
      await deleteRequestRecord(record.id)
      if (openId === record.id) setOpenId(null)
    } catch {
      setItems(prev)
      setTotal(t => t + 1)
    }
    setConfirm(null)
  }

  /** Export every enquiry matching the current filters, not just this page. */
  async function exportCsv() {
    setExporting(true)
    setExportError('')
    try {
      const csv = await exportRequestsCsv(filters)
      downloadCsv(stampedName('kaya-enquiries'), csv)
    } catch (e) {
      setExportError(e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Requests</h1>
          <p className="ad-view-sub">
            {requestStatusCounts.total} enquiries from the site · {requestStatusCounts.new} new
          </p>
        </div>
        <div>
          <button
            className="ad-btn ad-btn--primary"
            onClick={exportCsv}
            disabled={exporting || total === 0}
            title={total === 0 ? 'Nothing to export' : `Download ${total} ${total === 1 ? 'enquiry' : 'enquiries'} as CSV`}
          >
            {exporting ? 'Exporting…' : `↓ Export ${isFiltered ? `${total} matching` : 'all'}`}
          </button>
          {exportError && <p className="ad-req-export-error">{exportError}</p>}
        </div>
      </div>

      {/* Status summary chips (also act as quick filters) */}
      <div className="ad-req-summary">
        {REQUEST_STATUS_OPTIONS.map(s => (
          <button
            key={s}
            className={`ad-req-stat ad-req-stat--${s}${status === s ? ' active' : ''}`}
            onClick={() => setStatus(status === s ? '' : s)}
          >
            <span className="ad-req-stat-num">{requestStatusCounts[s]}</span>
            <span className="ad-req-stat-lbl">{REQUEST_STATUS_LABELS[s]}</span>
          </button>
        ))}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search by name, phone, treatment, doctor…"
          value={query} onChange={e => setQuery(e.target.value)}
        />
        <select className="ad-input ad-filter" value={source} onChange={e => setSource(e.target.value)}>
          <option value="">All sources</option>
          {REQUEST_SOURCE_OPTIONS.map(s => (
            <option key={s} value={s}>{REQUEST_SOURCE_LABELS[s]}</option>
          ))}
        </select>
        <select className="ad-input ad-filter" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {REQUEST_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="ad-input ad-filter"
          value={country}
          // Changing country clears the city, which may not exist in the new one.
          onChange={e => { setCountry(e.target.value); setCity('') }}
        >
          <option value="">All countries</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="ad-input ad-filter"
          value={city}
          onChange={e => setCity(e.target.value)}
          disabled={cities.length === 0}
        >
          <option value="">All cities</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="ad-input ad-filter"
          value={treatment}
          onChange={e => setTreatment(e.target.value)}
          disabled={treatmentOptions.length === 0}
          aria-label="Treatment"
        >
          <option value="">All treatments</option>
          {treatmentOptions.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
        <select
          className="ad-input ad-filter"
          value={range}
          // Leaving the custom range clears its dates, so they can't keep
          // filtering invisibly from behind a preset.
          onChange={e => {
            setRange(e.target.value)
            if (e.target.value !== 'custom') { setFrom(''); setTo('') }
          }}
        >
          {DATE_RANGES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        {range === 'custom' && (
          <span className="ad-daterange">
            <label className="ad-daterange-part">
              <span>From</span>
              <input
                type="date"
                className="ad-input ad-date-input"
                value={from}
                max={to || undefined}
                onChange={e => setFrom(e.target.value)}
              />
            </label>
            <label className="ad-daterange-part">
              <span>To</span>
              <input
                type="date"
                className="ad-input ad-date-input"
                value={to}
                min={from || undefined}
                onChange={e => setTo(e.target.value)}
              />
            </label>
          </span>
        )}
        {isFiltered && (
          <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Consumer</th>
              <th>Treatment</th>
              <th>Interest</th>
              <th>Location</th>
              <th>Received</th>
              <th>Status</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: SKELETON_ROWS }).map((_, i) => <RequestRowSkeleton key={i} />)}
            {!loading && items.map(r => (
              <tr key={r.id} className={r.status === 'new' ? 'ad-row-unread' : ''}>
                <td>
                  <div className="ad-cell-name">{r.name}</div>
                  <div className="ad-cell-slug">{r.mobile}</div>
                </td>
                <td>
                  {/* Concern-finder enquiries often name only an area, not a treatment. */}
                  <div>{r.treatment || <span className="ad-muted">Not specified</span>}</div>
                  {r.treatmentArea && <div className="ad-cell-slug">{r.treatmentArea}</div>}
                </td>
                <td>
                  <span className={`ad-source-pill ad-source-pill--${r.source}`}>
                    {r.source === 'consultation' ? 'Consultation' : 'Concern finder'}
                  </span>
                  {r.doctor && <div className="ad-req-interest ad-req-doc">{r.doctor}</div>}
                </td>
                <td>
                  <div>{r.city || <span className="ad-muted">—</span>}</div>
                  <div className="ad-cell-slug">{r.country}</div>
                </td>
                <td>
                  <div>{timeAgo(r.createdAt)}</div>
                </td>
                <td><StatusPill status={r.status} /></td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => setOpenId(r.id)}>
                    View
                  </button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setConfirm(r)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="ad-empty">
                {loadError
                  ? `Could not load enquiries — ${loadError}`
                  : total === 0 && !isFiltered
                    ? 'No enquiries yet. They arrive here from the booking form and the concern finder.'
                    : 'No enquiries match your filters.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="ad-req-pager">
          <span className="ad-cell-slug">
            Page {page} of {totalPages} · {total} {total === 1 ? 'enquiry' : 'enquiries'}
          </span>
          <span>
            <button
              className="ad-btn ad-btn--ghost ad-btn--sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              ← Previous
            </button>
            <button
              className="ad-btn ad-btn--ghost ad-btn--sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Next →
            </button>
          </span>
        </div>
      )}

      {/* Detail drawer */}
      {open && (
        <div className="ad-drawer-scrim" onClick={() => setOpenId(null)}>
          <div className="ad-drawer ad-drawer--sm" onClick={e => e.stopPropagation()}>
            <div className="ad-drawer-head">
              <div>
                <div className="ad-drawer-title">{open.name}</div>
                <div className="ad-cell-slug">
                  {REQUEST_SOURCE_LABELS[open.source]} · {formatDate(open.createdAt)}
                </div>
              </div>
              <button className="ad-icon-btn" onClick={() => setOpenId(null)} aria-label="Close">✕</button>
            </div>

            <div className="ad-drawer-body">
              {/* Status changer */}
              <div className="ad-field">
                <span className="ad-field-label">Status</span>
                <div className="ad-status-row">
                  {REQUEST_STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      className={`ad-status-btn ad-status-btn--${s}${open.status === s ? ' active' : ''}`}
                      onClick={() => requestStatusChange(open, s)}
                      disabled={open.status === s}
                    >
                      {REQUEST_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="ad-req-detail">
                <div className="ad-req-row">
                  <span className="ad-req-key">Mobile</span>
                  <a className="ad-req-val ad-req-link" href={`tel:${open.mobile.replace(/\s/g, '')}`}>{open.mobile}</a>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Email</span>
                  {open.email
                    ? <a className="ad-req-val ad-req-link" href={`mailto:${open.email}`}>{open.email}</a>
                    : <span className="ad-req-val ad-muted">Not provided</span>}
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Gender</span>
                  <span className="ad-req-val">{open.gender || <span className="ad-muted">Not specified</span>}</span>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Location</span>
                  <span className="ad-req-val">{[open.city, open.country].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>

              {/* Interest */}
              <div className="ad-req-detail">
                <div className="ad-req-row">
                  <span className="ad-req-key">Area</span>
                  <span className="ad-req-val">{open.treatmentArea || '—'}</span>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Treatment</span>
                  <span className="ad-req-val">{open.treatment || <span className="ad-muted">No preference</span>}</span>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Doctor</span>
                  <span className="ad-req-val">{open.doctor || <span className="ad-muted">No preference</span>}</span>
                </div>
                {open.concerns && open.concerns.length > 0 && (
                  <div className="ad-req-row">
                    <span className="ad-req-key">Concerns</span>
                    <span className="ad-req-val">
                      <span className="ad-req-tags">
                        {open.concerns.map(c => <span key={c} className="ad-badge">{c}</span>)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Tell Us Everything answers — worded as the person saw them. */}
              {open.answers && open.answers.length > 0 && (
                <div className="ad-field">
                  <span className="ad-field-label">Tell Us Everything answers</span>
                  <div className="ad-req-detail">
                    {open.answers.map(a => (
                      <div key={a.questionId || a.question} className="ad-req-row">
                        <span className="ad-req-key">{a.question}</span>
                        <span className="ad-req-val">{(a.answers || []).join(', ') || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {open.message && (
                <div className="ad-field">
                  <span className="ad-field-label">Message from consumer</span>
                  <p className="ad-req-message">{open.message}</p>
                </div>
              )}

              {/* Internal note — saved on blur (KA-31) */}
              <div className="ad-field">
                <label className="ad-field-label" htmlFor="ad-req-note">Internal note</label>
                <textarea
                  id="ad-req-note"
                  className="ad-input ad-textarea"
                  rows={3}
                  placeholder="Add a note for the team…"
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onBlur={handleNotesBlur}
                />
              </div>
            </div>

            <div className="ad-drawer-foot">
              {open.source === 'consultation' || open.treatment
                ? (
                  <a
                    className="ad-btn ad-btn--ghost"
                    href={siteUrl(`/booking?${new URLSearchParams({
                      ...(open.treatment ? { treatment: open.treatment } : {}),
                      ...(open.doctor ? { doctor: open.doctor } : {}),
                    }).toString()}`)}
                    target="_blank" rel="noreferrer"
                  >
                    Open booking ↗
                  </a>
                )
                : <span />}
              <button className="ad-btn ad-btn--primary" onClick={() => setOpenId(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Status change confirm */}
      {statusConfirm && (
        <ConfirmDialog
          title="Change status?"
          confirmLabel="Confirm"
          tone="primary"
          busy={statusChanging}
          error={statusChangeError}
          consequenceNote={null}
          onCancel={cancelStatusChange}
          onConfirm={confirmStatusChange}
        >
          Mark <strong>{statusConfirm.name}</strong>&rsquo;s request as{' '}
          <strong>{REQUEST_STATUS_LABELS[statusConfirm.to]}</strong>?
        </ConfirmDialog>
      )}

      {/* Delete confirm */}
      {confirm && (
        <ConfirmDialog
          title="Delete enquiry?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => handleDelete(confirm)}
        >
          This will remove the enquiry from <strong>{confirm.name}</strong>, including
          any notes your team has added.
        </ConfirmDialog>
      )}
    </div>
  )
}
