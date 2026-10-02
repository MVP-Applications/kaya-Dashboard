'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import ReorderCell from './ReorderCell'
import { VOUCHER_TYPE_OPTIONS, emptyVoucher } from '@/lib/admin/seed'
import VoucherForm from './VoucherForm'
import MissingRecord from './MissingRecord'
import { useQuery, useQueryParam, useQueryText } from './useUrlState'

export default function IndulgenceView() {
  const { vouchers, deleteVoucher, allowed, dataVersion } = useAdmin()
  // Filters and the open record live in the URL (?q, ?type, ?edit=<id>,
  // ?new=1) so a refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const [type, setType] = useQueryParam('type')
  const editId = get('edit')
  const isNew = get('new') === '1'
  const newVoucher = useMemo(() => (isNew ? emptyVoucher() : null), [isNew])
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

  const closeEditor = () => set({ edit: '', new: '' })

  if (isNew) {
    return <VoucherForm key="new" initial={newVoucher} isNew onClose={closeEditor} />
  }
  if (editId) {
    const record = vouchers.find(v => String(v.id) === editId)
    if (!record) {
      return <MissingRecord loading={dataVersion === 0} label="voucher" backHref={href({ edit: '' })} />
    }
    return <VoucherForm key={editId} initial={record} isNew={false} onClose={closeEditor} />
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Indulgence</h1>
          <p className="ad-view-sub">{vouchers.length} vouchers · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New voucher
          </Link>
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
              <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: v.id })}>Edit</Link>
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
