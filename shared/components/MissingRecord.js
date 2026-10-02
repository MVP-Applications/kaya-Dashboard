'use client'
import Link from 'next/link'

/**
 * Shown when the URL points at a record (?edit=…, ?open=…) that isn't there:
 * still loading on a fresh page load, or deleted/renamed since the link was made.
 */
export default function MissingRecord({ loading, label = 'record', backHref, backLabel = '← Back to list' }) {
  return (
    <div className="ad-view">
      {loading
        ? <div className="ad-panel ad-muted">Loading…</div>
        : (
          <div className="ad-panel">
            <p>This {label} couldn&apos;t be found — it may have been deleted or renamed.</p>
            <Link href={backHref} className="ad-btn ad-btn--soft ad-btn--sm">{backLabel}</Link>
          </div>
        )}
    </div>
  )
}
