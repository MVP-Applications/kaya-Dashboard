'use client'
import { useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { PAGE_STATUS_LABELS } from '@/features/pages/lib/page-builder'

const STATUS_TONE = { PUBLISHED: 'booked', DRAFT: 'contacted', ARCHIVED: 'closed' }

/** A page's status as a small coloured badge. */
export function StatusBadge({ status }) {
  return (
    <span className={`ad-status ad-status--${STATUS_TONE[status] || 'closed'}`}>
      <span className="ad-status-dot" />{PAGE_STATUS_LABELS[status] || status}
    </span>
  )
}

/** What changing to `to` will do, for the confirmation popup. */
function consequence(page, to) {
  const where = page.path || `/${page.slug}`
  if (to === 'PUBLISHED') return `It will be live on the website at ${where}${page.headerPosition !== 'NONE' || page.footerColumn !== 'NONE' ? ', with its menu link' : ''}.`
  if (to === 'DRAFT') {
    if (where === '/') return 'Visitors opening the homepage will see a “page not found” message, and anyone sent to the homepage lands there too. You can publish it again at any time.'
    return `${where} will stop working on the website and its menu links will be removed. You can publish it again at any time.`
  }
  return `${where} will stop working on the website and the page moves to the archive. You can restore it as a draft later.`
}

/**
 * Pick a page's status — draft / published (and archived where allowed).
 * Choosing a different one asks for confirmation first, and only then calls
 * the API; the badge changes once the backend has accepted it, and a refusal
 * (e.g. a required block missing) is shown in the popup.
 *
 * `blockedReason` disables the control with an explanation (e.g. unsaved
 * changes, or a page that hasn't been created yet).
 */
export default function PageStatusControl({ page, canEdit, allowArchive = false, blockedReason = '' }) {
  const { changePageStatus } = useAdmin()
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isSystem = page.kind === 'SYSTEM'
  const options = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    ...(allowArchive || page.status === 'ARCHIVED'
      ? [{ value: 'ARCHIVED', label: 'Archived', disabled: isSystem, why: "The website's own pages can't be archived." }]
      : []),
  ]
  const disabled = !canEdit || Boolean(blockedReason) || !page.id
  const title = !canEdit ? 'Only a super admin can change this.' : blockedReason

  async function confirm() {
    setBusy(true)
    setError('')
    const r = await changePageStatus(page.id, pending)
    setBusy(false)
    if (r.ok) setPending(null)
    else setError(r.error)
  }

  return (
    <span className="ad-pg-status" title={title || undefined}>
      <StatusBadge status={page.status} />
      <select className="ad-input ad-pg-status-select" value={page.status} disabled={disabled}
        aria-label={`Status of ${page.title || page.name || page.slug}`}
        onChange={e => { setError(''); setPending(e.target.value) }}>
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled && o.value !== page.status} title={o.disabled ? o.why : undefined}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && (
        <ConfirmDialog
          title={pending === 'PUBLISHED' ? 'Publish this page?' : pending === 'DRAFT' ? 'Move to draft?' : 'Archive this page?'}
          confirmLabel={pending === 'PUBLISHED' ? 'Publish' : pending === 'DRAFT' ? 'Move to draft' : 'Archive'}
          tone={pending === 'PUBLISHED' ? 'primary' : 'danger'}
          consequenceNote=""
          busy={busy}
          error={error}
          onCancel={() => { if (!busy) { setPending(null); setError('') } }}
          onConfirm={confirm}
        >
          <strong>{page.title || page.name || page.slug}</strong>: {PAGE_STATUS_LABELS[page.status]} → {PAGE_STATUS_LABELS[pending]}.{' '}
          {consequence(page, pending)}
        </ConfirmDialog>
      )}
    </span>
  )
}
