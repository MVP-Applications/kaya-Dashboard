'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ContentEditor from './ContentEditor'
import CountryNotice from './CountryNotice'
import ConfirmDialog from './ConfirmDialog'
import PageBuilder from './PageBuilder'
import { PAGES, seedPages } from '@/lib/admin/content'
import { PAGE_TEMPLATES, TEMPLATE_LABELS, newCustomPage, newId, slugify } from '@/lib/admin/page-builder'
import { siteUrl } from '@/lib/site'

// The home page can never be hidden — there'd be no website left to land on.
const ALWAYS_VISIBLE = new Set(['home'])

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

function cloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

/** "What kind of page?" — the first step of creating one. */
function TemplatePicker({ onPick, onCancel }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="ad-drawer-scrim" onClick={onCancel}>
      <div className="ad-pb-picker" role="dialog" aria-modal="true" aria-labelledby="ad-pb-picker-title" onClick={e => e.stopPropagation()}>
        <div className="ad-pb-picker-head">
          <div>
            <h2 id="ad-pb-picker-title" className="ad-confirm-title">What kind of page?</h2>
            <p className="ad-view-sub">Each type starts with blocks suited to the job, filled with example text to replace. You can add, remove and reorder blocks afterwards.</p>
          </div>
          <button type="button" className="ad-toast-close ad-pb-picker-close" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <div className="ad-pb-templates">
          {PAGE_TEMPLATES.map(t => (
            <button key={t.id} type="button" className="ad-pb-template" onClick={() => onPick(t.id)}>
              <span className="ad-pb-template-ico" aria-hidden="true">{t.icon}</span>
              <strong>{t.label}</strong>
              <span>{t.hint}</span>
              <span className="ad-pb-template-n">{t.blocks().length ? `${t.blocks().length} blocks to start` : 'No blocks'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function VisibilitySwitch({ visible, onChange, disabled, label }) {
  return (
    <label className={`ad-pg-switch${visible ? ' on' : ''}${disabled ? ' locked' : ''}`} title={disabled ? 'The home page is always visible' : undefined}>
      <input type="checkbox" checked={visible} disabled={disabled} onChange={e => onChange(e.target.checked)} aria-label={label} />
      <span className="ad-pg-switch-track" aria-hidden="true"><span className="ad-pg-switch-dot" /></span>
      {visible ? 'Visible' : 'Hidden'}
    </label>
  )
}

export default function PagesView() {
  const {
    pages, saveSection, allowed, activeCountry,
    customPages, customPagesError, upsertCustomPage, deleteCustomPage,
    pageVisibility, setPageVisible,
  } = useAdmin()
  const [openId, setOpenId] = useState(null)
  const [building, setBuilding] = useState(null) // { initial, isNew }
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const canCreate = allowed('create')
  const canEdit = allowed('edit')
  const canDelete = allowed('delete')

  // Kept for the per-section "Revert" action, which restores the original copy.
  const seeded = useMemo(() => seedPages(), [])

  const page = PAGES.find(p => p.id === openId)

  if (building) {
    return <PageBuilder initial={building.initial} isNew={building.isNew} onClose={() => setBuilding(null)} />
  }

  if (page) {
    const visible = pageVisibility[page.id] !== false
    return (
      <div className="ad-view">
        <div className="ad-editor-head">
          <button type="button" className="ad-back" onClick={() => setOpenId(null)}>← All pages</button>
          <div className="ad-editor-titles">
            <h1 className="ad-view-title">{page.label}</h1>
            <p className="ad-view-sub">{page.hint}</p>
          </div>
          <div className="ad-editor-actions">
            <VisibilitySwitch visible={visible} disabled={!canEdit || ALWAYS_VISIBLE.has(page.id)}
              onChange={v => setPageVisible(page.id, v)} label={`${page.label} visible on the website`} />
            <a href={siteUrl(page.path)} className="ad-btn ad-btn--ghost" target="_blank" rel="noreferrer">
              View page ↗
            </a>
          </div>
        </div>

        {!visible && (
          <div className="ad-tu-dirty">This page is hidden — visitors can’t open it. You can still edit its content.</div>
        )}

        <CountryNotice />

        <ContentEditor
          scopeKey={activeCountry}
          group={page}
          values={pages[page.id]}
          seed={seeded[page.id]}
          canEdit={allowed('edit')}
          onSave={(sectionId, sectionValues) => saveSection('page', page.id, sectionId, sectionValues)}
        >
          <span className="ad-cf-path">{page.path}</span>
          <span className="ad-cf-count">
            {page.sections.length} {page.sections.length === 1 ? 'section' : 'sections'}
          </span>
        </ContentEditor>
      </div>
    )
  }

  function duplicate(p) {
    const taken = new Set(customPages.map(x => x.slug))
    let slug = slugify(`${p.slug}-copy`)
    for (let n = 2; taken.has(slug); n++) slug = slugify(`${p.slug}-copy-${n}`)
    const copy = {
      ...cloneSafe(p), id: '', slug, title: `${p.title} (copy)`, visible: false, updatedAt: '',
      blocks: p.blocks.map(b => ({ ...cloneSafe(b), id: newId('blk') })),
    }
    setBuilding({ initial: copy, isNew: true })
  }

  const sortedCustom = [...customPages].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Pages</h1>
          <p className="ad-view-sub">
            Build new pages from blocks, and edit the copy and imagery of the website&apos;s own pages.
            Treatments, doctors, vouchers and reviews are managed in their own sections.
          </p>
        </div>
        {canCreate && !customPagesError && (
          <button type="button" className="ad-btn ad-btn--primary" onClick={() => setPicking(true)}>+ New page</button>
        )}
      </div>

      <section className="ad-pg-section">
        <div className="ad-pg-section-head">
          <h2 className="ad-an-section-title">Your pages</h2>
          <p className="ad-an-section-sub">Pages built here from blocks. New pages start hidden until you make them visible.</p>
        </div>
        {customPagesError ? (
          <div className="ad-panel ad-blog-unavailable"><strong>Custom pages can&apos;t be loaded.</strong> {customPagesError}</div>
        ) : sortedCustom.length === 0 ? (
          <div className="ad-panel ad-pg-empty">
            <strong>No pages yet.</strong>
            <span>Create a landing page, a campaign, an FAQ or a legal page — no code needed.</span>
            {canCreate && <button type="button" className="ad-btn ad-btn--soft" onClick={() => setPicking(true)}>+ New page</button>}
          </div>
        ) : (
          <div className="ad-page-grid">
            {sortedCustom.map(p => (
              <div key={p.id} className={`ad-page-card ad-pg-card${p.visible ? '' : ' ad-pg-card--hidden'}`}>
                <button type="button" className="ad-pg-card-main" onClick={() => setBuilding({ initial: p, isNew: false })}>
                  <span className="ad-page-icon" aria-hidden="true">{PAGE_TEMPLATES.find(t => t.id === p.template)?.icon || '□'}</span>
                  <span className="ad-page-body">
                    <span className="ad-page-label">{p.title || 'Untitled page'}</span>
                    <span className="ad-page-hint">{TEMPLATE_LABELS[p.template] || 'Custom page'} · {p.blocks.length} blocks{p.updatedAt ? ` · updated ${formatDate(p.updatedAt)}` : ''}</span>
                    <span className="ad-page-meta"><span className="ad-page-path">/{p.slug}</span></span>
                  </span>
                </button>
                <div className="ad-pg-card-foot">
                  <VisibilitySwitch visible={p.visible} disabled={!canEdit}
                    onChange={v => upsertCustomPage({ ...p, visible: v, updatedAt: new Date().toISOString() }, p.id)}
                    label={`${p.title} visible on the website`} />
                  <span className="ad-pg-card-actions">
                    <button type="button" className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => setBuilding({ initial: p, isNew: false })}>Edit</button>
                    {canCreate && <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => duplicate(p)}>Duplicate</button>}
                    {canDelete && (
                      <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setConfirm(p)}>Delete</button>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ad-pg-section">
        <div className="ad-pg-section-head">
          <h2 className="ad-an-section-title">Website pages</h2>
          <p className="ad-an-section-sub">The website&apos;s built-in pages. Their layout is fixed; edit their copy, or hide the ones you don&apos;t need.</p>
        </div>
        <div className="ad-page-grid">
          {PAGES.map(p => {
            const visible = pageVisibility[p.id] !== false
            return (
              <div key={p.id} className={`ad-page-card ad-pg-card${visible ? '' : ' ad-pg-card--hidden'}`}>
                <button type="button" className="ad-pg-card-main" onClick={() => setOpenId(p.id)}>
                  <span className="ad-page-icon" aria-hidden="true">{p.icon}</span>
                  <span className="ad-page-body">
                    <span className="ad-page-label">{p.label}</span>
                    <span className="ad-page-hint">{p.hint}</span>
                    <span className="ad-page-meta">
                      <span className="ad-page-path">{p.path}</span>
                      <span className="ad-page-count">{p.sections.length} sections</span>
                    </span>
                  </span>
                  <span className="ad-page-arrow" aria-hidden="true">→</span>
                </button>
                <div className="ad-pg-card-foot">
                  <VisibilitySwitch visible={visible} disabled={!canEdit || ALWAYS_VISIBLE.has(p.id)}
                    onChange={v => setPageVisible(p.id, v)} label={`${p.label} visible on the website`} />
                  {ALWAYS_VISIBLE.has(p.id) && <span className="ad-field-hint">Always visible</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {picking && (
        <TemplatePicker
          onCancel={() => setPicking(false)}
          onPick={id => { setPicking(false); setBuilding({ initial: newCustomPage(id), isNew: true }) }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete page?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteCustomPage(confirm.id); setConfirm(null) }}
        >
          <strong>{confirm.title}</strong> will be removed, and /{confirm.slug} will stop working on the website.
        </ConfirmDialog>
      )}
    </div>
  )
}
