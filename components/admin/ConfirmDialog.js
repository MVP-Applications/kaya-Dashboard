'use client'
import { useEffect } from 'react'
import { useAdmin } from './AdminContext'

/**
 * Shared action confirmation — destructive by default, but also used for
 * confirmations that aren't (see RequestsView's status-change prompt), via
 * `tone` and `consequenceNote`.
 *
 * The destructive wording is worked out in one place so it stays accurate:
 * with a database connected a delete is permanent, whereas in preview mode
 * it only affects this browser and "Reset sample data" brings it back.
 *
 * `busy` covers an in-flight confirm: the button shows a spinner in place of
 * its label and both buttons stop responding, so the caller can wait for the
 * API call to actually succeed before dismissing this dialog rather than
 * closing it optimistically. `error` surfaces a failed attempt inline so the
 * user can retry without the dialog (and their confirmation) disappearing.
 */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Delete',
  tone = 'danger',
  busy = false,
  error = '',
  consequenceNote,
  onCancel,
  onConfirm,
}) {
  const { demoMode } = useAdmin()

  // Escape closes — a confirmation should never be a trap. Not while busy
  // though: an in-flight request has nothing left to cancel.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, busy])

  const note = consequenceNote !== undefined
    ? consequenceNote
    : (demoMode
      ? 'This is preview data — “Reset sample data” restores it.'
      : 'This cannot be undone.')

  return (
    <div className="ad-drawer-scrim" onClick={busy ? undefined : onCancel}>
      <div
        className="ad-confirm"
        role="alertdialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="ad-confirm-title">{title}</h3>
        <p className="ad-confirm-text">
          {children}{note ? <>{' '}{note}</> : null}
        </p>
        {error && <p className="ad-confirm-error">{error}</p>}
        <div className="ad-confirm-actions">
          <button className="ad-btn ad-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className={`ad-btn ${tone === 'danger' ? 'ad-btn--danger' : 'ad-btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy && <span className="ad-btn-spinner" aria-hidden="true" />}
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
