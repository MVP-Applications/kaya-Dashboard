'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import ReorderCell from './ReorderCell'
import { VOUCHER_TYPE_OPTIONS, emptyVoucher } from '@/lib/admin/seed'
import VoucherForm from './VoucherForm'

export default function IndulgenceView() {
  const { vouchers, deleteVoucher, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vouchers.filter(v => {
      if (type && v.type !== type) return false
      if (q && !(`${v.title} ${v.subtitle}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [vouchers, query, type])

  const isFiltered = Boolean(query.trim() || type)
  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  if (editing) {
    return (
      <VoucherForm initial={editing.initial} isNew={editing.isNew} onClose={() => setEditing(null)} />
    )
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Indulgence</h1>
          <p className="ad-view-sub">{vouchers.length} vouchers · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyVoucher(), isNew: true })}>
            + New voucher
          </button>
        )}
      </div>

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search vouchers…"
          value={query} onChange={e => setQuery(e.target.value)} />
        <select className="ad-input ad-filter" value={type} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>
          {VOUCHER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="ad-voucher-grid">
        {filtered.map(v => (
          <div key={v.id} className="ad-voucher-card">
            <div className="ad-voucher-img">
              {v.img
                ? <img src={v.img} alt="" />
                : <div className="ad-image-ph"><span className="ad-image-ph-icon">🎁</span></div>}
              {v.badge && <span className={`ad-voucher-badge ad-vb--${v.badgeStyle || 'default'}`}>{v.badge}</span>}
            </div>
            <div className="ad-voucher-body">
              <div className="ad-voucher-type">
                {v.type}
                {v.isPublished === false && <span className="ad-badge ad-voucher-hidden">Hidden</span>}
              </div>
              <div className="ad-voucher-title">{v.title}</div>
              <div className="ad-voucher-sub">{v.subtitle}</div>
              <div className="ad-voucher-price">
                {v.price !== '' && v.price != null
                  ? <>{v.currency} {Number(v.price).toLocaleString()}</>
                  : <span className="ad-muted">no price</span>}
              </div>
            </div>
            <div className="ad-voucher-actions">
              <ReorderCell
                collection="vouchers"
                itemKey={v.id}
                index={vouchers.indexOf(v)}
                total={vouchers.length}
                disabled={isFiltered}
              />
              <button className="ad-btn ad-btn--soft ad-btn--sm"
                onClick={() => setEditing({ initial: v, isNew: false })}>Edit</button>
              {canDelete && (
                <button className="ad-btn ad-btn--danger ad-btn--sm"
                  onClick={() => setConfirm(v.id)}>Delete</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="ad-empty ad-empty--grid">
            {vouchers.length === 0
              ? 'No vouchers yet. Create one to feature it on the Indulgence page.'
              : 'No vouchers match your filters.'}
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete voucher?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteVoucher(confirm); setConfirm(null) }}
        >
          This will remove <strong>{confirm}</strong> from the Indulgence page.
        </ConfirmDialog>
      )}
    </div>
  )
}
