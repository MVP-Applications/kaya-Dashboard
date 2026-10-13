'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ContentEditor from '@/shared/components/ContentEditor'
import CountryNotice from '@/shared/components/CountryNotice'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import PageBuilder from '@/features/pages/components/PageBuilder'
import PageStatusControl from '@/features/pages/components/PageStatus'
import SystemPageSettings from '@/features/pages/components/PageSettings'
import NavigationPanel from '@/features/pages/components/NavigationPanel'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryParam, useQueryText } from '@/shared/hooks/useUrlState'
import { PAGES, seedPages } from '@/shared/lib/content'
import {
  PAGE_TEMPLATES, TEMPLATE_LABELS, HEADER_POSITION_LABELS, FOOTER_COLUMN_LABELS, PAGE_STATUSES,
  newCustomPage, newId, slugify,
} from '@/features/pages/lib/page-builder'
import { siteUrl } from '@/shared/lib/site'

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
            <p className="ad-view-sub">Each type starts with blocks suited to the job, filled with example text to replace, and decides which blocks the page can use.</p>
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

/** A draft copy of `p` with a free "-copy" address and fresh block ids. */
function duplicateOf(p, customPages) {
  const taken = new Set(customPages.map(x => x.slug))
  let slug = slugify(`${p.slug}-copy`)
  for (let n = 2; taken.has(slug); n++) slug = slugify(`${p.slug}-copy-${n}`)
  return {
    ...cloneSafe(p), id: '', slug, title: `${p.title} (copy)`, status: 'DRAFT', updatedAt: '',
    headerPosition: 'NONE', footerColumn: 'NONE',
    blocks: p.blocks.map(b => ({ ...cloneSafe(b), id: newId('blk') })),
  }
}

/** Where a page's links show, as short chips. */
function MenuChips({ page }) {
  const chips = [HEADER_POSITION_LABELS[page.headerPosition], FOOTER_COLUMN_LABELS[page.footerColumn]].filter(Boolean)
  return (
    <>
      {chips.map(c => <span key={c} className="ad-page-count">{c}</span>)}
      {page.allCountries === false && <span className="ad-page-count">{(page.countries || []).join(', ') || 'No country'} only</span>}
      {page.missingLocales?.includes('AR') && <span className="ad-page-count ad-page-count--warn" title="Some copy has no Arabic version yet — Arabic visitors see English there.">Arabic incomplete</span>}
    </>
  )
}

const matches = (q, ...values) => !q || values.some(v => String(v || '').toLowerCase().includes(q))

export default function PagesView() {
  const {
    pages, saveSection, allowed, activeCountry, overrides, resetSectionToShared,
    customPages, customPagesError, deletePage, dataVersion,
    systemPageRecord, isSectionHidden, setPageSectionVisible,
  } = useAdmin()
  // Everything worth getting back lives in the URL:
  //   ?open=<id>[&panel=settings]           one of the website's own pages
  //   ?build=<customPageId>                 edit a built page
  //   ?build=new&template=<templateId>      new page from a template
  //   ?build=new&from=<customPageId>        new page duplicated from another
  //   ?panel=navigation                     menu order
  //   ?status=…&q=…                         list filters
  // The template picker and confirm dialog stay local.
  const { get, set, href } = useQuery()
  const openId = get('open')
  const build = get('build')
  const template = get('template')
  const from = get('from')
  const panel = get('panel')
  const [statusFilter, setStatusFilter] = useQueryParam('status')
  const [search, setSearch, searchParam] = useQueryText('q')
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // Pages are global settings — only a super admin changes them.
  const canManage = allowed('manageSettings')
  const canCreate = canManage
  const canEdit = canManage
  const canDelete = canManage

  // Kept for the per-section "Revert" action, which restores the original copy.
  const seeded = useMemo(() => seedPages(), [])

  const page = PAGES.find(p => p.id === openId)
  const record = page ? systemPageRecord(page.id) : null

  const source = build === 'new' ? (from ? customPages.find(p => p.id === from) : null) : customPages.find(p => p.id === build)
  // The builder copies `initial` on mount, so it only has to be stable per URL.
  const building = useMemo(() => {
    if (!build) return null
    if (build !== 'new') return source ? { initial: source, isNew: false } : null
    if (from) return source ? { initial: duplicateOf(source, customPages), isNew: true } : null
    return { initial: newCustomPage(template || undefined), isNew: true }
  }, [build, template, from, Boolean(source)]) // eslint-disable-line react-hooks/exhaustive-deps

  if (build) {
    if (!building || (building.isNew && !canCreate)) {
      return <MissingRecord loading={dataVersion === 0} label="page" backHref={href({ build: '', template: '', from: '' })} backLabel="← All pages" />
    }
    return (
      <PageBuilder
        key={`${build}|${template}|${from}`}
        initial={building.initial}
        isNew={building.isNew}
        onClose={() => set({ build: '', template: '', from: '', panel: '', block: '' })}
        // A new page, once created, is addressed by its id so a refresh reopens it.
        onSaved={saved => { if (build !== saved.id) set({ build: saved.id, template: '', from: '' }) }}
      />
    )
  }

  if (panel === 'navigation' && !openId) {
    return <NavigationPanel backHref={href({ panel: '' })} />
  }

  if (openId) {
    if (!page) {
      return <MissingRecord label="page" backHref={href({ open: '', panel: '' })} backLabel="← All pages" />
    }
    if (panel === 'settings') {
      return record
        ? <SystemPageSettings page={page} record={record} backHref={href({ panel: '' })} />
        : <MissingRecord loading={dataVersion === 0} label="page" backHref={href({ panel: '' })} backLabel={`← ${page.label}`} />
    }
    return (
      <div className="ad-view">
        <div className="ad-editor-head">
          <Link className="ad-back" href={href({ open: '' })}>← All pages</Link>
          <div className="ad-editor-titles">
            <h1 className="ad-view-title">{page.label}</h1>
            <div className="ad-view-sub ad-pg-sub">
              {page.hint}
              {record && <> · <PageStatusControl page={record} canEdit={canEdit} /></>}
            </div>
          </div>
          <div className="ad-editor-actions">
            {record && <Link href={href({ panel: 'settings' })} className="ad-btn ad-btn--soft">Settings</Link>}
            <a href={siteUrl(page.path)} className="ad-btn ad-btn--ghost" target="_blank" rel="noreferrer">
              View page ↗
            </a>
          </div>
        </div>

        <CountryNotice />
        {!canManage && <div className="ad-note">Only a super admin can change these settings.</div>}

        <ContentEditor
          scopeKey={activeCountry}
          group={page}
          values={pages[page.id]}
          seed={seeded[page.id]}
          canEdit={canEdit}
          onSave={(sectionId, sectionValues) => saveSection('page', page.id, sectionId, sectionValues)}
          isSectionOff={sectionId => isSectionHidden(page.id, sectionId)}
          renderSectionExtra={section => (
            <>
              {activeCountry && overrides?.[page.id]?.[section.id] && canEdit && (
                <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                  title="Drop this country's own copy of the section, back to the shared copy"
                  onClick={() => resetSectionToShared(page.id, section.id)}>
                  Use shared copy
                </button>
              )}
              {section.hideable && record && (
                <label className={`ad-pg-switch${isSectionHidden(page.id, section.id) ? '' : ' on'}${canEdit ? '' : ' locked'}`}>
                  <input type="checkbox" checked={!isSectionHidden(page.id, section.id)} disabled={!canEdit}
                    onChange={e => setPageSectionVisible(page.id, section.id, e.target.checked)}
                    aria-label={`${section.label} shown on the website`} />
                  <span className="ad-pg-switch-track" aria-hidden="true"><span className="ad-pg-switch-dot" /></span>
                  {isSectionHidden(page.id, section.id) ? 'Hidden on the website' : 'Shown on the website'}
                </label>
              )}
            </>
          )}
        >
          <span className="ad-cf-path">{page.path}</span>
          <span className="ad-cf-count">
            {page.sections.length} {page.sections.length === 1 ? 'section' : 'sections'}
          </span>
        </ContentEditor>
      </div>
    )
  }

  const q = (searchParam || '').trim().toLowerCase()
  const keep = p => (!statusFilter || p.status === statusFilter)
  const sortedCustom = [...customPages]
    .filter(p => keep(p) && matches(q, p.title, p.slug))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  const systemPages = PAGES
    .map(p => ({ page: p, record: systemPageRecord(p.id) }))
    .filter(({ page: p, record: r }) => (!r || keep(r)) && matches(q, p.label, p.path))

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Pages</h1>
          <p className="ad-view-sub">
            Build new pages from blocks, edit the copy and imagery of the website&apos;s own pages, and choose which are
            live, where their links show and in which countries. Treatments, doctors, vouchers and reviews are managed in their own sections.
          </p>
        </div>
        <div className="ad-view-head-actions">
          <Link className="ad-btn ad-btn--ghost" href={href({ panel: 'navigation' })}>Menu order</Link>
          {canCreate && !customPagesError && (
            <button type="button" className="ad-btn ad-btn--primary" onClick={() => setPicking(true)}>+ New page</button>
          )}
        </div>
      </div>

      {!canManage && <div className="ad-note">Only a super admin can change these settings.</div>}

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search pages…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="ad-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {PAGE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <section className="ad-pg-section">
        <div className="ad-pg-section-head">
          <h2 className="ad-an-section-title">Your pages</h2>
          <p className="ad-an-section-sub">
            Pages built here from blocks. New pages start as drafts; once published, their links show in the menus you chose.
          </p>
        </div>
        {customPagesError ? (
          <div className="ad-panel ad-blog-unavailable"><strong>Pages can&apos;t be loaded.</strong> {customPagesError}</div>
        ) : sortedCustom.length === 0 ? (
          <div className="ad-panel ad-pg-empty">
            <strong>{customPages.length ? 'No pages match.' : 'No pages yet.'}</strong>
            <span>Create a landing page, a campaign, an FAQ or a legal page — no code needed.</span>
            {canCreate && <button type="button" className="ad-btn ad-btn--soft" onClick={() => setPicking(true)}>+ New page</button>}
          </div>
        ) : (
          <div className="ad-page-grid">
            {sortedCustom.map(p => (
              <div key={p.id} className={`ad-page-card ad-pg-card${p.status === 'PUBLISHED' ? '' : ' ad-pg-card--hidden'}`}>
                <Link className="ad-pg-card-main" href={href({ build: p.id })}>
                  <span className="ad-page-icon" aria-hidden="true">{PAGE_TEMPLATES.find(t => t.id === p.template)?.icon || '□'}</span>
                  <span className="ad-page-body">
                    <span className="ad-page-label">{p.title || 'Untitled page'}</span>
                    <span className="ad-page-hint">{TEMPLATE_LABELS[p.template] || 'Custom page'} · {p.blocks.length} blocks{p.updatedAt ? ` · updated ${formatDate(p.updatedAt)}` : ''}</span>
                    <span className="ad-page-meta">
                      <span className="ad-page-path">/{p.slug}</span>
                      <MenuChips page={p} />
                    </span>
                  </span>
                </Link>
                <div className="ad-pg-card-foot">
                  <PageStatusControl page={p} canEdit={canEdit} allowArchive />
                  <span className="ad-pg-card-actions">
                    <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ build: p.id })}>{canEdit ? 'Edit' : 'View'}</Link>
                    {canCreate && <Link className="ad-btn ad-btn--ghost ad-btn--sm" href={href({ build: 'new', from: p.id })}>Duplicate</Link>}
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
          <p className="ad-an-section-sub">The website&apos;s built-in pages. Their layout and address are fixed; edit their copy and imagery, switch optional sections off, and choose whether they&apos;re live.</p>
        </div>
        <div className="ad-page-grid">
          {systemPages.map(({ page: p, record: r }) => (
            <div key={p.id} className={`ad-page-card ad-pg-card${!r || r.status === 'PUBLISHED' ? '' : ' ad-pg-card--hidden'}`}>
              <Link className="ad-pg-card-main" href={href({ open: p.id })}>
                <span className="ad-page-icon" aria-hidden="true">{p.icon}</span>
                <span className="ad-page-body">
                  <span className="ad-page-label">{p.label}</span>
                  <span className="ad-page-hint">{p.hint}</span>
                  <span className="ad-page-meta">
                    <span className="ad-page-path">{p.path}</span>
                    <span className="ad-page-count">{p.sections.length} sections</span>
                    {r && <MenuChips page={r} />}
                  </span>
                </span>
              </Link>
              {r && (
                <div className="ad-pg-card-foot">
                  <PageStatusControl page={r} canEdit={canEdit} />
                  <span className="ad-pg-card-actions">
                    <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ open: p.id })}>Edit copy</Link>
                    <Link className="ad-btn ad-btn--ghost ad-btn--sm" href={href({ open: p.id, panel: 'settings' })}>Settings</Link>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {picking && (
        <TemplatePicker
          onCancel={() => setPicking(false)}
          onPick={id => { setPicking(false); set({ build: 'new', template: id }, { push: true }) }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete page?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deletePage(confirm.id); setConfirm(null) }}
        >
          <strong>{confirm.title}</strong> will be removed, and /{confirm.slug} will stop working on the website.
          To keep it but take it off the website, set it to Draft or Archived instead.
        </ConfirmDialog>
      )}
    </div>
  )
}
