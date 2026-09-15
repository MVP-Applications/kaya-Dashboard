'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import {
  fetchVoucherRequestsPage, persistVoucherRequestStatus, removeVoucherRequestRecord,
} from '@/lib/admin/store'

const STATUS_OPTIONS = ['REQUESTED', 'PAYMENT_LINK_SENT', 'PAID', 'FULFILLED', 'EXPIRED', 'CANCELLED']
const STATUS_LABELS = {
  REQUESTED: 'Requested',
  PAYMENT_LINK_SENT: 'Payment link sent',
  PAID: 'Paid',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

const PAGE_SIZE = 20

export default function VoucherRequestsView() {
  const { allowed } = useAdmin()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)

  const canDelete = allowed('delete')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchVoucherRequestsPage({ page, pageSize: PAGE_SIZE, status: status || undefined, search: search || undefined })
      setItems(result.items)
      setTotal(result.total)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => { load() }, [load])

  async function changeStatus(id, next) {
    const prev = items
    setItems(list => list.map(v => (v.id === id ? { ...v, status: next } : v)))
    try {
      await persistVoucherRequestStatus(id, next)
    } catch (e) {
      setItems(prev)
      setError(e.message)
    }
  }

  async function remove(id) {
    setConfirm(null)
    const prev = items
    setItems(list => list.filter(v => v.id !== id))
    try {
      await removeVoucherRequestRecord(id)
      setTotal(t => t - 1)
    } catch (e) {
      setItems(prev)
      setError(e.message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const target = confirm ? items.find(v => v.id === confirm) : null

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Voucher Requests</h1>
          <p className="ad-view-sub">Purchase and gift requests submitted against Indulgence vouchers.</p>
        </div>
      </div>

      {error && <div className="ad-form-error">{error}</div>}

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search by purchaser name, email or phone…"
          value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} />
        <select className="ad-input ad-filter" value={status} onChange={e => { setPage(1); setStatus(e.target.value) }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
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
              <th>Submitted</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(v => (
              <tr key={v.id}>
                <td>
                  <div className="ad-cell-name">{v.offerTitle}</div>
                  <div className="ad-cell-slug">{v.offerCurrency} {v.offerPrice}</div>
                </td>
                <td>
                  <div className="ad-cell-name">{v.purchaserName}</div>
                  <div className="ad-cell-slug">{v.purchaserEmail}</div>
                </td>
                <td>
                  {v.isGift
                    ? <><div className="ad-cell-name">{v.recipientName || '—'}</div>
                        <div className="ad-cell-slug">{v.recipientEmail}</div></>
                    : <span className="ad-muted">Self-purchase</span>}
                </td>
                <td>
                  <select className="ad-input" value={v.status} onChange={e => changeStatus(v.id, e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </td>
                <td>{new Date(v.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="ad-td-actions">
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setConfirm(v.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="ad-empty">No voucher requests match this filter.</td></tr>
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

      {target && (
        <ConfirmDialog
          title="Delete voucher request?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(target.id)}
        >
          This will permanently remove <strong>{target.purchaserName}</strong>&apos;s request.
        </ConfirmDialog>
      )}
    </div>
  )
}
