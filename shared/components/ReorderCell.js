'use client'
import { useAdmin } from '@/shared/context/AdminContext'

/**
 * Move-up / move-down controls for an ordered list.
 *
 * Display order on the public site is the order of these rows, so reordering
 * is a real content decision — which treatments lead a category page, which
 * doctors appear first. Buttons rather than drag-and-drop: they work on touch
 * and with a keyboard without extra machinery.
 *
 * `collection` names the collection in AdminContext ('services', 'doctors', …)
 * and `index`/`total` come from the *unfiltered* list, so the arrows correctly
 * disable at the true ends rather than the ends of a filtered view.
 */
export default function ReorderCell({ collection, itemKey, index, total, disabled }) {
  const { moveUp, moveDown } = useAdmin()

  // Reordering a filtered list would move a row past rows you can't see, so
  // it's offered only when the full list is in view.
  if (disabled) {
    return <span className="ad-muted ad-reorder-off" title="Clear filters to reorder">—</span>
  }

  return (
    <span className="ad-reorder">
      <button
        className="ad-reorder-btn"
        onClick={() => moveUp(collection, itemKey)}
        disabled={index === 0}
        aria-label="Move up"
        title="Move up"
      >
        ↑
      </button>
      <button
        className="ad-reorder-btn"
        onClick={() => moveDown(collection, itemKey)}
        disabled={index === total - 1}
        aria-label="Move down"
        title="Move down"
      >
        ↓
      </button>
    </span>
  )
}
