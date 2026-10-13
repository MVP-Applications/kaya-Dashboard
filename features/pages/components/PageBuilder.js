'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import LocaleToggle from '@/shared/components/LocaleToggle'
import BlockFields from '@/features/pages/components/BlockFields'
import PagePreview from '@/features/pages/components/PagePreview'
import PageStatusControl from '@/features/pages/components/PageStatus'
import { PageSettingsFields } from '@/features/pages/components/PageSettings'
import {
  BLOCK_TYPES, BLOCK_ORDER, TEMPLATE_LABELS, HEADER_POSITION_LABELS, FOOTER_COLUMN_LABELS,
  newBlock, newId, slugify, validateCustomPage, publishProblems, plainText, templateOf,
} from '@/features/pages/lib/page-builder'
import { PAGES } from '@/shared/lib/content'
import { siteUrl } from '@/shared/lib/site'
import { slugInput } from '@/shared/lib/slug'
import { useQuery } from '@/shared/hooks/useUrlState'

function cloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

/** A short label for a block in the outline: its heading, else its type. */
function blockSummary(block) {
  const d = block.data
  const firstItem = d.items?.[0]?.question || d.items?.[0]?.title
  return plainText(d.heading || d.caption || firstItem || '') || BLOCK_TYPES[block.type]?.hint || ''
}

export default function PageBuilder({ initial, isNew, onClose, onSaved }) {
  const { customPages, saveBuiltPage, services, doctors, allowed, saving } = useAdmin()
  // Pages are global settings — only a super admin changes them.
  const canEdit = allowed('manageSettings')

  const [page, setPage] = useState(() => cloneSafe(initial))
  const [saved, setSaved] = useState(() => (isNew ? null : JSON.stringify(initial)))
  const [originalId, setOriginalId] = useState(isNew ? null : initial.id)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  // The side panel (?panel=blocks|settings) and the selected block
  // (?block=<id>) live in the URL; device, locale and the "add block"
  // palette stay local. New pages open on Page settings, so the title,
  // address and menu position are asked first.
  const query = useQuery()
  const defaultPanel = isNew ? 'settings' : 'blocks'
  const panel = query.get('panel') === 'settings' || query.get('panel') === 'blocks' ? query.get('panel') : defaultPanel
  const setPanel = next => query.set({ panel: next === defaultPanel ? '' : next })
  const selectedId = query.get('block') || null
  const setSelectedId = id => query.set({ block: id || '' })
  const [adding, setAdding] = useState(false)
  const [locale, setLocale] = useState('EN')
  const [device, setDevice] = useState('desktop')
  const [problems, setProblems] = useState([])
  const [confirm, setConfirm] = useState(null)

  const dirty = saved === null || JSON.stringify(page) !== saved
  const selected = page.blocks.find(b => b.id === selectedId) || null
  const builtInPaths = useMemo(() => PAGES.map(p => p.path), [])
  const template = templateOf(page.template)
  const notReady = originalId ? publishProblems(page) : []

  // The status is changed from the list or the header control (after a
  // confirmation) and saved straight away — keep this copy in step with it.
  const liveStatus = customPages.find(p => p.id === originalId)?.status
  useEffect(() => {
    if (!liveStatus || liveStatus === page.status) return
    setPage(p => ({ ...p, status: liveStatus }))
    setSaved(prev => (prev ? JSON.stringify({ ...JSON.parse(prev), status: liveStatus }) : prev))
  }, [liveStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // ── Page edits ──
  const set = patch => setPage(p => ({ ...p, ...patch }))
  const setTitle = value => setPage(p => ({ ...p, title: value, ...(!slugTouched ? { slug: slugify(value) } : {}) }))
  const setBlocks = fn => setPage(p => ({ ...p, blocks: fn(p.blocks) }))
  const updateBlock = (id, patch) => setBlocks(bs => bs.map(b => (b.id === id ? { ...b, ...patch } : b)))

  function move(id, dir) {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id)
      const to = i + dir
      if (i < 0 || to < 0 || to >= bs.length) return bs
      const next = [...bs]
      ;[next[i], next[to]] = [next[to], next[i]]
      return next
    })
  }

  /** New blocks go after the selected one, else at the end. */
  function addBlock(type) {
    const block = newBlock(type)
    setBlocks(bs => {
      const at = selectedId ? bs.findIndex(b => b.id === selectedId) + 1 : bs.length
      return [...bs.slice(0, at), block, ...bs.slice(at)]
    })
    setSelectedId(block.id)
    setAdding(false)
  }

  function duplicateBlock(block) {
    const copy = { ...cloneSafe(block), id: newId('blk') }
    setBlocks(bs => {
      const at = bs.findIndex(b => b.id === block.id) + 1
      return [...bs.slice(0, at), copy, ...bs.slice(at)]
    })
    setSelectedId(copy.id)
  }

  function removeBlock(block) {
    setBlocks(bs => bs.filter(b => b.id !== block.id))
    setSelectedId(null)
  }

  // ── Save ──
  async function save() {
    const found = validateCustomPage(page, {
      otherPages: customPages.filter(p => p.id !== originalId),
      builtInPaths,
    })
    setProblems(found)
    if (found.length) {
      if (found.some(f => /title|address|country|countries/i.test(f))) setPanel('settings')
      return
    }
    const record = await saveBuiltPage(page, { isNew: !originalId })
    if (record) {
      setPage(record)
      setSaved(JSON.stringify(record))
      setOriginalId(record.id)
      // A created page reopens as an existing one, whose default panel is
      // Blocks — pin the current panel so it doesn't jump.
      if (isNew) query.set({ panel })
      onSaved?.(record)
    }
  }

  function leave() {
    if (dirty) {
      setConfirm({
        title: 'Leave without saving?',
        body: 'Your changes to this page haven’t been saved.',
        label: 'Discard changes',
        run: onClose,
      })
    } else onClose()
  }

  const addPalette = (
    <div className="ad-pb-palette">
      {BLOCK_ORDER.filter(type => template.allowedTypes.includes(type)).map(type => (
        <button key={type} type="button" className="ad-pb-palette-item" onClick={() => addBlock(type)}>
          <span className="ad-pb-palette-ico" aria-hidden="true">{BLOCK_TYPES[type].icon}</span>
          <span className="ad-pb-palette-txt">
            <strong>{BLOCK_TYPES[type].label}</strong>
            <span>{BLOCK_TYPES[type].hint}</span>
          </span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="ad-view ad-pb">
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={leave}>← All pages</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{page.title || (isNew && !originalId ? 'New page' : 'Untitled page')}</h1>
          <div className="ad-view-sub ad-pg-sub">
            {TEMPLATE_LABELS[page.template] || 'Custom page'} · /{page.slug || '…'} ·{' '}
            {[HEADER_POSITION_LABELS[page.headerPosition], FOOTER_COLUMN_LABELS[page.footerColumn]].filter(Boolean).map(m => `${m} · `)}
            <PageStatusControl
              page={{ ...page, id: originalId || '' }}
              canEdit={canEdit}
              allowArchive
              blockedReason={!originalId ? 'Create the page first.' : dirty ? 'Save your changes first — publishing uses the saved version.' : ''}
            />
          </div>
          {originalId && page.status !== 'PUBLISHED' && notReady.length > 0 && (
            <p className="ad-field-hint">Before it can be published: {notReady.join(' ')}</p>
          )}
        </div>
        <div className="ad-editor-actions">
          {originalId && page.status === 'PUBLISHED' && !dirty && (
            <a href={siteUrl(`/${page.slug}`)} className="ad-btn ad-btn--ghost" target="_blank" rel="noreferrer">View page ↗</a>
          )}
          <button type="button" className="ad-btn ad-btn--primary" disabled={!canEdit || !dirty || saving} onClick={save}>
            {saving ? 'Saving…' : originalId ? (dirty ? 'Save changes' : 'Saved') : 'Create page'}
          </button>
        </div>
      </div>

      {!canEdit && <div className="ad-note">Only a super admin can change these settings.</div>}

      {problems.length > 0 && (
        <div className="ad-form-error ad-tu-problems" role="alert">
          <strong>Fix these before saving:</strong>
          <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className={`ad-pb-layout${panel === 'settings' ? ' is-settings' : ''}`}>
        {/* ── Left: Blocks / Page settings tabs, then the outline or a block's settings ── */}
        <aside className="ad-pb-side">
          <div className="ad-tu-seg ad-pb-panels" role="tablist">
            <button type="button" role="tab" aria-selected={panel === 'blocks'}
              className={`ad-tu-seg-btn${panel === 'blocks' ? ' active' : ''}`} onClick={() => setPanel('blocks')}>
              Blocks
            </button>
            <button type="button" role="tab" aria-selected={panel === 'settings'}
              className={`ad-tu-seg-btn${panel === 'settings' ? ' active' : ''}`} onClick={() => { setPanel('settings'); setSelectedId(null) }}>
              Page settings
            </button>
          </div>

          {panel === 'blocks' && selected && (
            <div className="ad-pb-card">
              <div className="ad-pb-card-head">
                <button type="button" className="ad-back ad-pb-back" onClick={() => setSelectedId(null)}>← All blocks</button>
                <strong>{BLOCK_TYPES[selected.type].label}</strong>
              </div>
              <LocaleToggle locale={locale} onChange={setLocale} />
              <BlockFields block={selected} locale={locale} services={services} doctors={doctors}
                onChange={data => updateBlock(selected.id, { data })} />
              <label className="ad-check ad-pb-hide">
                <input type="checkbox" checked={selected.hidden} onChange={e => updateBlock(selected.id, { hidden: e.target.checked })} />
                Hide this block on the website
              </label>
            </div>
          )}

          {panel === 'blocks' && !selected && (
            <div className="ad-pb-card">
              <div className="ad-pb-card-head">
                <strong>Blocks</strong>
                <span className="ad-field-hint">{page.blocks.length} on this page — click one to edit it</span>
              </div>
              <div className="ad-pb-outline">
                {page.blocks.map((b, i) => (
                  <div key={b.id} className={`ad-pb-row${b.hidden ? ' off' : ''}`}>
                    <button type="button" className="ad-pb-row-main" onClick={() => setSelectedId(b.id)}>
                      <span className="ad-pb-row-ico" aria-hidden="true">{BLOCK_TYPES[b.type]?.icon}</span>
                      <span className="ad-pb-row-txt">
                        <strong>{BLOCK_TYPES[b.type]?.label || b.type}{b.hidden ? ' · hidden' : ''}</strong>
                        <span>{blockSummary(b)}</span>
                      </span>
                    </button>
                    <span className="ad-pb-row-actions">
                      <button type="button" className="ad-reorder-btn" disabled={i === 0} onClick={() => move(b.id, -1)} aria-label="Move up">▲</button>
                      <button type="button" className="ad-reorder-btn" disabled={i === page.blocks.length - 1} onClick={() => move(b.id, 1)} aria-label="Move down">▼</button>
                      <button type="button" className="ad-reorder-btn" onClick={() => updateBlock(b.id, { hidden: !b.hidden })}
                        aria-label={b.hidden ? 'Show block' : 'Hide block'} title={b.hidden ? 'Show block' : 'Hide block'}>
                        {b.hidden ? '◌' : '●'}
                      </button>
                      <button type="button" className="ad-reorder-btn" onClick={() => duplicateBlock(b)} aria-label="Duplicate block" title="Duplicate">⧉</button>
                      <button type="button" className="ad-reorder-btn ad-pb-del" onClick={() => setConfirm({
                        title: 'Remove block?',
                        body: `The ${BLOCK_TYPES[b.type]?.label || b.type} block will be removed from this page.`,
                        label: 'Remove',
                        run: () => removeBlock(b),
                      })} aria-label="Remove block" title="Remove">×</button>
                    </span>
                  </div>
                ))}
              </div>
              {adding ? (
                <>
                  <div className="ad-pb-card-head ad-pb-add-head">
                    <strong>Add a block</strong>
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setAdding(false)}>Cancel</button>
                  </div>
                  {addPalette}
                </>
              ) : (
                <button type="button" className="ad-btn ad-btn--soft ad-pb-add" onClick={() => setAdding(true)}>+ Add block</button>
              )}
            </div>
          )}
        </aside>

        {/* ── Page settings: full width, sectioned like the other editor forms ── */}
        {panel === 'settings' && (
          <div className="ad-editor-body ad-form-sections ad-pb-settings">
            <div className="ad-pb-settings-locale">
              <LocaleToggle locale={locale} onChange={setLocale} />
              <span className="ad-field-hint">Switches the title and search engine fields between English and Arabic.</span>
              {dirty && <span className="ad-pb-unsaved">Unsaved changes</span>}
            </div>

            <PageSettingsFields
              value={page}
              onChange={set}
              locale={locale}
              disabled={!canEdit}
              withTitle
              titleSlot={(
                <>
                  <label className="ad-field ad-w-lg">
                    <span className="ad-field-label">{locale === 'AR' ? 'Title (Arabic)' : 'Title *'}</span>
                    <input className="ad-input" dir={locale === 'AR' ? 'rtl' : undefined}
                      value={locale === 'AR' ? page.titleAr : page.title}
                      placeholder={locale === 'AR' ? page.title : 'e.g. Ramadan offers'}
                      onChange={e => (locale === 'AR' ? set({ titleAr: e.target.value }) : setTitle(e.target.value))} />
                    <span className="ad-field-hint">Shown in the browser tab and when the page is shared.</span>
                  </label>
                  <label className="ad-field ad-w-lg">
                    <span className="ad-field-label">Address *</span>
                    <span className="ad-pb-slug">
                      <span>kaya.ae/</span>
                      <input className="ad-input" value={page.slug}
                        onChange={e => { setSlugTouched(true); set({ slug: slugInput(e.target.value) }) }}
                        onBlur={e => set({ slug: slugify(e.target.value) })} placeholder="ramadan-offers" />
                    </span>
                    <span className="ad-field-hint">Addresses the website already uses, like /treatments, can’t be taken.</span>
                  </label>
                  <p className="ad-field-hint">Page type: <strong>{template.label}</strong> — {template.allowedTypes.length === BLOCK_ORDER.length ? 'any block' : `blocks: ${template.allowedTypes.map(t => BLOCK_TYPES[t].label).join(', ')}`}{template.required.length ? ` (needs ${template.required.map(t => BLOCK_TYPES[t].label).join(', ')})` : ''}.</p>
                </>
              )}
            />
          </div>
        )}

        {/* ── Right: live preview (Blocks tab only) ── */}
        {panel === 'blocks' && (
          <div className="ad-pb-stage">
            <div className="ad-pb-stage-bar">
              <div className="ad-tu-seg" role="radiogroup" aria-label="Preview size">
                {['desktop', 'mobile'].map(d => (
                  <button key={d} type="button" role="radio" aria-checked={device === d}
                    className={`ad-tu-seg-btn${device === d ? ' active' : ''}`} onClick={() => setDevice(d)}>
                    {d === 'desktop' ? '▭ Desktop' : '▯ Mobile'}
                  </button>
                ))}
              </div>
              <div className="ad-tu-seg" role="radiogroup" aria-label="Preview language">
                {['EN', 'AR'].map(l => (
                  <button key={l} type="button" role="radio" aria-checked={locale === l}
                    className={`ad-tu-seg-btn${locale === l ? ' active' : ''}`} onClick={() => setLocale(l)}>
                    {l === 'EN' ? 'English' : 'العربية'}
                  </button>
                ))}
              </div>
              {dirty && <span className="ad-pb-unsaved">Unsaved changes</span>}
            </div>
            <PagePreview page={page} locale={locale} device={device} selectedId={selectedId}
              onSelect={id => { setPanel('blocks'); setSelectedId(id) }} services={services} doctors={doctors} />
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          confirmLabel={confirm.label}
          consequenceNote=""
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const run = confirm.run; setConfirm(null); run() }}
        >
          {confirm.body}
        </ConfirmDialog>
      )}
    </div>
  )
}
