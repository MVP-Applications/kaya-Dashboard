'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { usePageParam, useQuery, useQueryParam, useQueryText } from '@/shared/hooks/useUrlState'
import {
  fetchVoucherRequestsPage, fetchVoucherRequest, fetchVoucherStatuses, findVoucherByCode, persistVoucherRequestStatus,
  redeemVoucher, removeVoucherRequestRecord,
} from '@/shared/lib/store'
import { VOUCHER_STATUS, VOUCHER_STATUS_CONSEQUENCES, voucherStatusLabel } from '@/shared/lib/voucher-status'

const PAGE_SIZE = 20

const formatDate = d => (d
  ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '')
const formatPrice = v => (v.offerPrice == null ? '' : `${v.offerCurrency || ''} ${Number(v.offerPrice).toLocaleString()}`.trim())

function StatusPill({ status }) {
  return <span className={`ad-vstatus ad-vstatus--${String(status).toLowerCase()}`}>{voucherStatusLabel(status)}</span>
}

/** The voucher's expiry or redemption line, when it has one. */
function voucherDates(v) {
  if (v.status === VOUCHER_STATUS.REDEEMED && v.redeemedAt) return `Redeemed ${formatDate(v.redeemedAt)}`
  if (v.status === VOUCHER_STATUS.EXPIRED && v.expiresAt) return `Expired ${formatDate(v.expiresAt)}`
  if (v.expiresAt) return `Valid until ${formatDate(v.expiresAt)}`
  return ''
}

export default function VoucherRequestsView() {
  const { allowed, dataVersion } = useAdmin()
  // Search, status, page and the open request live in the URL (?q, ?status,
  // ?page, ?open=<id>) so a refresh or a new tab reopens the same screen —
  // Overview links here with ?status=PAID. Changing a filter resets ?page.
  const { get, set, href } = useQuery()
  const [search, setSearch, committedSearch] = useQueryText('q', { resets: ['page'] })
  const [status, setStatus] = useQueryParam('status', '', { resets: ['page'] })
  const [page, setPage] = usePageParam()
  const openId = get('open')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flow, setFlow] = useState([]) // [{ status, next[], final }] from the backend
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [statusConfirm, setStatusConfirm] = useState(null) // { voucher, to }
  const [redeemConfirm, setRedeemConfirm] = useState(null) // voucher
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  // The last record the backend returned after an action — lets the Redeem
  // panel pick up a change made from the table without trusting older rows.
  const [latestChange, setLatestChange] = useState(null)

  const canDelete = allowed('delete')
  const canEdit = allowed('edit')

  useEffect(() => {
    fetchVoucherStatuses().then(setFlow).catch(e => setError(e.message))
  }, [dataVersion])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchVoucherRequestsPage({ page, pageSize: PAGE_SIZE, status: status || undefined, search: committedSearch || undefined })
      setItems(result.items)
      setTotal(result.total)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
    // dataVersion: refetch after Refresh content / Reset sample data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, committedSearch, dataVersion])

  useEffect(() => { load() }, [load])

  // The open request isn't on the loaded page — fetch it by id instead.
  const [fetched, setFetched] = useState(null)
  useEffect(() => {
    if (!openId || loading || items.some(v => v.id === openId) || fetched?.id === openId) return
    let alive = true
    fetchVoucherRequest(openId)
      .then(v => { if (alive) setFetched(v) })
      .catch(() => { if (alive) setFetched(null) })
    return () => { alive = false }
  }, [openId, loading, items]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Put the backend's updated record into the list (and the open lookup, if any). */
  function applyUpdate(updated) {
    setItems(list => list.map(v => (v.id === updated.id ? updated : v)))
    setFetched(f => (f?.id === updated.id ? updated : f))
    setLatestChange(updated)
  }

  function cancelAction() {
    if (busy) return
    setStatusConfirm(null)
    setRedeemConfirm(null)
    setActionError('')
  }

  // Waits for the API before changing anything on screen — the backend is
  // what decides whether a move is allowed.
  async function confirmStatusChange() {
    const { voucher, to } = statusConfirm
    setBusy(true)
    setActionError('')
    try {
      applyUpdate(await persistVoucherRequestStatus(voucher.id, to))
      setStatusConfirm(null)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmRedeem(onDone) {
    setBusy(true)
    setActionError('')
    try {
      const updated = await redeemVoucher(redeemConfirm.id)
      applyUpdate(updated)
      onDone?.(updated)
      setRedeemConfirm(null)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setConfirmDelete(null)
    const prev = items
    setItems(list => list.filter(v => v.id !== id))
    try {
      await removeVoucherRequestRecord(id)
      setTotal(t => t - 1)
      if (openId === id) closeDrawer()
    } catch (e) {
      setItems(prev)
      setError(e.message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const deleteTarget = confirmDelete ? items.find(v => v.id === confirmDelete) : null
  // ?open=<id> usually points at a row on this page; when it doesn't (a
  // shared link, a different filter) the record is fetched on its own.
  const open = openId ? (items.find(v => v.id === openId) || (fetched?.id === openId ? fetched : null)) : null
  const closeDrawer = useCallback(() => set({ open: '' }), [set])

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Voucher Requests</h1>
          <p className="ad-view-sub">
            Purchase and gift requests from the Indulgence page. Move each one forward as it&apos;s paid;
            issuing it generates the voucher code and expiry date.
          </p>
        </div>
      </div>

      {error && <div className="ad-form-error">{error}</div>}

      <RedeemPanel canRedeem={canEdit} onRedeem={setRedeemConfirm} latestChange={latestChange} />

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search by name, email, phone or voucher code…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="ad-input ad-filter" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {flow.map(f => <option key={f.status} value={f.status}>{voucherStatusLabel(f.status)}</option>)}
        </select>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Offer</th>
              <th>Purchaser</th>
              <th>Recipient</th>
              <th>Status</th>
              <th>Voucher</th>
              <th>Submitted</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(v => (
              <tr key={v.id}>
                <td>
                  <div className="ad-cell-name">{v.offerTitle}</div>
                  <div className="ad-cell-slug">{formatPrice(v)}{v.countryCode && ` · ${v.countryCode}`}</div>
                </td>
                <td>
                  <div className="ad-cell-name">{v.purchaserName}</div>
                  <div className="ad-cell-slug">{v.purchaserEmail}</div>
                </td>
                <td>
                  {v.isGift
                    ? <><div className="ad-cell-name">{v.recipientName || '—'}</div>
                        <div className="ad-cell-slug">{v.recipientEmail || v.recipientPhone}</div></>
                    : <span className="ad-muted">Self-purchase</span>}
                </td>
                <td>
                  <StatusPill status={v.status} />
                  {canEdit && v.allowedNextStatuses.length > 0 && (
                    <select className="ad-input ad-vstatus-next" value=""
                      aria-label={`Move ${v.purchaserName}'s voucher to…`}
                      onChange={e => e.target.value && setStatusConfirm({ voucher: v, to: e.target.value })}>
                      <option value="">Move to…</option>
                      {v.allowedNextStatuses.map(s => <option key={s} value={s}>{voucherStatusLabel(s)}</option>)}
                    </select>
                  )}
                </td>
                <td>
                  {v.code ? <code className="ad-vcode">{v.code}</code> : <span className="ad-muted">—</span>}
                  {voucherDates(v) && <div className="ad-cell-slug">{voucherDates(v)}</div>}
                </td>
                <td>{formatDate(v.submittedAt)}</td>
                <td className="ad-td-actions">
                  <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ open: v.id })} scroll={false}>View</Link>
                  {canEdit && v.status === VOUCHER_STATUS.FULFILLED && (
                    <button className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => setRedeemConfirm(v)}>Redeem</button>
                  )}
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setConfirmDelete(v.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="ad-empty">No voucher requests match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="ad-toolbar">
          <button className="ad-btn ad-btn--soft ad-btn--sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="ad-muted">Page {page} of {totalPages}</span>
          <button className="ad-btn ad-btn--soft ad-btn--sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {open && <VoucherDrawer voucher={open} onClose={closeDrawer} />}

      {statusConfirm && (
        <ConfirmDialog
          title={`Move to “${voucherStatusLabel(statusConfirm.to)}”?`}
          confirmLabel={statusConfirm.to === VOUCHER_STATUS.FULFILLED ? 'Issue voucher' : 'Confirm'}
          tone={statusConfirm.to === VOUCHER_STATUS.CANCELLED ? 'danger' : 'primary'}
          busy={busy}
          error={actionError}
          consequenceNote={null}
          onCancel={cancelAction}
          onConfirm={confirmStatusChange}
        >
          <strong>{statusConfirm.voucher.purchaserName}</strong>&apos;s {statusConfirm.voucher.offerTitle}:{' '}
          {voucherStatusLabel(statusConfirm.voucher.status)} → {voucherStatusLabel(statusConfirm.to)}.
          {VOUCHER_STATUS_CONSEQUENCES[statusConfirm.to] && <> {VOUCHER_STATUS_CONSEQUENCES[statusConfirm.to]}</>}
        </ConfirmDialog>
      )}

      {redeemConfirm && (
        <ConfirmDialog
          title="Redeem this voucher?"
          confirmLabel="Redeem"
          tone="primary"
          busy={busy}
          error={actionError}
          consequenceNote={null}
          onCancel={cancelAction}
          onConfirm={() => confirmRedeem(redeemConfirm.onDone)}
        >
          <code className="ad-vcode">{redeemConfirm.code}</code> — {redeemConfirm.offerTitle}
          {redeemConfirm.isGift ? ` for ${redeemConfirm.recipientName}` : ` for ${redeemConfirm.purchaserName}`}.
          {' '}It will be marked as used and can&apos;t be redeemed again.
        </ConfirmDialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete voucher request?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(deleteTarget.id)}
        >
          This will permanently remove <strong>{deleteTarget.purchaserName}</strong>&apos;s request.
        </ConfirmDialog>
      )}
    </div>
  )
}

/**
 * At the clinic: type the code the customer shows, see the voucher, redeem it.
 * The backend re-checks everything on Redeem (issued, not expired, not used).
 */
function RedeemPanel({ canRedeem, onRedeem, latestChange }) {
  const [code, setCode] = useState('')
  const [found, setFound] = useState(null)
  const [error, setError] = useState('')
  const [looking, setLooking] = useState(false)

  // The fresh lookup is what's shown; an action taken *after* it on the same
  // voucher (e.g. Redeem pressed in the table) replaces it.
  useEffect(() => {
    if (latestChange) setFound(f => (f && f.id === latestChange.id ? latestChange : f))
  }, [latestChange])
  const current = found

  async function lookUp(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLooking(true)
    setError('')
    setFound(null)
    try {
      setFound(await findVoucherByCode(code))
    } catch (err) {
      setError(err.message)
    } finally {
      setLooking(false)
    }
  }

  return (
    <section className="ad-fieldset ad-redeem">
      <form className="ad-redeem-form" onSubmit={lookUp}>
        <label className="ad-field">
          <span className="ad-field-label">Redeem a voucher</span>
          <input className="ad-input ad-redeem-input" value={code} placeholder="KAYA-XXXX-XXXX"
            onChange={e => setCode(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} />
        </label>
        <button type="submit" className="ad-btn ad-btn--soft" disabled={!code.trim() || looking}>
          {looking ? 'Looking up…' : 'Find voucher'}
        </button>
      </form>
      {error && <div className="ad-form-error">{error}</div>}
      {current && (
        <div className="ad-redeem-result">
          <div>
            <div className="ad-cell-name">{current.offerTitle} <StatusPill status={current.status} /></div>
            <div className="ad-cell-slug">
              {current.isGift ? `Gift for ${current.recipientName} · from ${current.purchaserName}` : current.purchaserName}
              {voucherDates(current) && ` · ${voucherDates(current)}`}
            </div>
          </div>
          {current.status === VOUCHER_STATUS.FULFILLED
            ? canRedeem && (
              <button className="ad-btn ad-btn--primary"
                onClick={() => onRedeem({ ...current, onDone: updated => setFound(updated) })}>
                Redeem
              </button>
            )
            : <span className="ad-muted">
                {current.status === VOUCHER_STATUS.REDEEMED ? 'Already used — can’t be redeemed again.'
                  : current.status === VOUCHER_STATUS.EXPIRED ? 'Expired — can’t be redeemed.'
                  : current.status === VOUCHER_STATUS.CANCELLED ? 'Cancelled — can’t be redeemed.'
                  : 'Not issued yet — it must be paid and issued first.'}
              </span>}
        </div>
      )}
    </section>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="ad-req-row">
      <span className="ad-req-key">{label}</span>
      <span className="ad-req-val">{children || <span className="ad-muted">—</span>}</span>
    </div>
  )
}

function VoucherDrawer({ voucher: v, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ad-drawer-scrim" onClick={onClose}>
      <div className="ad-drawer ad-drawer--sm" onClick={e => e.stopPropagation()}>
        <div className="ad-drawer-head">
          <div>
            <div className="ad-drawer-title">{v.offerTitle}</div>
            <div className="ad-cell-slug">{formatPrice(v)} · requested {formatDate(v.submittedAt)}</div>
          </div>
          <button className="ad-icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ad-drawer-body">
          <div className="ad-req-detail">
            <DetailRow label="Status"><StatusPill status={v.status} /></DetailRow>
            <DetailRow label="Voucher code">{v.code && <code className="ad-vcode">{v.code}</code>}</DetailRow>
            <DetailRow label="Valid until">{formatDate(v.expiresAt)}</DetailRow>
            <DetailRow label="Redeemed">{formatDate(v.redeemedAt)}</DetailRow>
            <DetailRow label="Country">{v.countryCode}</DetailRow>
          </div>
          <div className="ad-req-detail">
            <DetailRow label="Purchaser">{v.purchaserName}</DetailRow>
            <DetailRow label="Email">
              {v.purchaserEmail && <a className="ad-req-link" href={`mailto:${v.purchaserEmail}`}>{v.purchaserEmail}</a>}
            </DetailRow>
            <DetailRow label="Phone">
              {v.purchaserPhone && <a className="ad-req-link" href={`tel:${v.purchaserPhone.replace(/\s/g, '')}`}>{v.purchaserPhone}</a>}
            </DetailRow>
            <DetailRow label="Deliver by">{v.sendVia === 'WHATSAPP' ? 'WhatsApp' : 'Email'}</DetailRow>
          </div>
          {v.isGift && (
            <div className="ad-req-detail">
              <DetailRow label="Gift for">{v.recipientName}</DetailRow>
              <DetailRow label="Recipient email">{v.recipientEmail}</DetailRow>
              <DetailRow label="Recipient phone">{v.recipientPhone}</DetailRow>
            </div>
          )}
          {v.personalMessage && (
            <div className="ad-field">
              <span className="ad-field-label">Gift message</span>
              <p className="ad-req-message">{v.personalMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
