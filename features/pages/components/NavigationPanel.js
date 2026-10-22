'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import { StatusBadge } from '@/features/pages/components/PageStatus'

/** The menus a page link can be in, and the record fields that place it there. */
const MENUS = [
  { id: 'header-LEFT', label: 'Header: left (main menu)', field: 'headerPosition', value: 'LEFT', order: 'headerOrder' },
  { id: 'header-RIGHT', label: 'Header: right', field: 'headerPosition', value: 'RIGHT', order: 'headerOrder' },
  { id: 'footer-COMPANY', label: 'Footer: Company column', field: 'footerColumn', value: 'COMPANY', order: 'footerOrder' },
  { id: 'footer-SUPPORT', label: 'Footer: Support column', field: 'footerColumn', value: 'SUPPORT', order: 'footerOrder' },
]

const pageLabel = p => p.navLabel || p.title || p.name || p.slug

/** Menu order (?panel=navigation): reorder the page links in each menu. */
export default function NavigationPanel({ backHref }) {
  const { pageRegistry, reorderPageNavigation, allowed, saving } = useAdmin()
  const canEdit = allowed('manageSettings')

  const initial = useMemo(() => Object.fromEntries(MENUS.map(m => [
    m.id,
    pageRegistry
      .filter(p => p[m.field] === m.value && p.status !== 'ARCHIVED')
      .sort((a, b) => a[m.order] - b[m.order])
      .map(p => p.id),
  ])), [pageRegistry])
  const [lists, setLists] = useState(initial)
  useEffect(() => { setLists(initial) }, [initial])

  const byId = Object.fromEntries(pageRegistry.map(p => [p.id, p]))
  const dirty = JSON.stringify(lists) !== JSON.stringify(initial)

  function move(menuId, i, dir) {
    setLists(ls => {
      const list = [...ls[menuId]]
      const to = i + dir
      if (to < 0 || to >= list.length) return ls
      ;[list[i], list[to]] = [list[to], list[i]]
      return { ...ls, [menuId]: list }
    })
  }

  async function save() {
    // Every page in a menu gets its position; header and footer orders are separate.
    const items = {}
    for (const m of MENUS) {
      lists[m.id].forEach((id, i) => {
        const p = byId[id]
        items[id] ??= {
          id, headerPosition: p.headerPosition, headerOrder: p.headerOrder, footerColumn: p.footerColumn, footerOrder: p.footerOrder,
        }
        items[id][m.order] = i + 1
      })
    }
    await reorderPageNavigation(Object.values(items))
  }

  return (
    <div className="ad-view">
      <div className="ad-editor-head">
        <Link className="ad-back" href={backHref}>← All pages</Link>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">Menu order</h1>
          <p className="ad-view-sub">The order of page links in the website’s header and footer. Which menu a page is in is set in its settings.</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" disabled={!dirty} onClick={() => setLists(initial)}>Discard</button>
          <button type="button" className="ad-btn ad-btn--primary" disabled={!canEdit || !dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </div>
      {!canEdit && <div className="ad-note">Only a super admin can change these settings.</div>}
      <div className="ad-pg-menus">
        {MENUS.map(m => (
          <section key={m.id} className="ad-fieldset ad-pg-menu">
            <h2 className="ad-cf-sec-title">{m.label}</h2>
            {lists[m.id].length === 0 && <p className="ad-field-hint">No pages here.</p>}
            {lists[m.id].map((id, i) => {
              const p = byId[id]
              return (
                <div key={id} className={`ad-pb-row${p.status !== 'PUBLISHED' ? ' off' : ''}`}>
                  <span className="ad-pb-row-main">
                    <span className="ad-pb-row-txt">
                      <strong>{pageLabel(p)}</strong>
                      <span>{p.path}{p.allCountries === false ? ` · ${p.countries.join(', ')} only` : ''}</span>
                    </span>
                  </span>
                  <span className="ad-pb-row-actions">
                    {p.status !== 'PUBLISHED' && <StatusBadge status={p.status} />}
                    <button type="button" className="ad-reorder-btn" disabled={!canEdit || i === 0} onClick={() => move(m.id, i, -1)} aria-label="Move up">▲</button>
                    <button type="button" className="ad-reorder-btn" disabled={!canEdit || i === lists[m.id].length - 1} onClick={() => move(m.id, i, 1)} aria-label="Move down">▼</button>
                  </span>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
