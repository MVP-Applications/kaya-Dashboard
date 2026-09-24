'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import LocaleToggle from './LocaleToggle'
import BlockFields from './BlockFields'
import PagePreview from './PagePreview'
import {
  BLOCK_TYPES, BLOCK_ORDER, TEMPLATE_LABELS, newBlock, newId, slugify, validateCustomPage, plainText,
} from '@/lib/admin/page-builder'
import { PAGES } from '@/lib/admin/content'
import { siteUrl } from '@/lib/site'

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

export default function PageBuilder({ initial, isNew, onClose }) {
  const { customPages, upsertCustomPage, services, doctors, allowed, saving } = useAdmin()
  const canEdit = allowed('edit')

  const [page, setPage] = useState(() => cloneSafe(initial))
  const [saved, setSaved] = useState(() => (isNew ? null : JSON.stringify(initial)))
  const [originalId, setOriginalId] = useState(isNew ? null : initial.id)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [panel, setPanel] = useState('blocks') // 'blocks' | 'settings'
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [locale, setLocale] = useState('EN')
  const [device, setDevice] = useState('desktop')
  const [problems, setProblems] = useState([])
  const [confirm, setConfirm] = useState(null)

  const dirty = saved === null || JSON.stringify(page) !== saved
  const selected = page.blocks.find(b => b.id === selectedId) || null
  const builtInPaths = useMemo(() => PAGES.map(p => p.path), [])

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
      if (found.some(f => /title|address/i.test(f))) setPanel('settings')
      return
    }
    const record = { ...page, id: page.id || page.slug, updatedAt: new Date().toISOString() }
    const ok = await upsertCustomPage(record, originalId)
    if (ok) {
      setPage(record)
      setSaved(JSON.stringify(record))
      setOriginalId(record.id)
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
      {BLOCK_ORDER.map(type => (
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
          <p className="ad-view-sub">
            {TEMPLATE_LABELS[page.template] || 'Custom page'} · /{page.slug || '…'} ·{' '}
            <span className={`ad-status ad-status--${page.visible ? 'booked' : 'closed'}`}>
              <span className="ad-status-dot" />{page.visible ? 'Visible' : 'Hidden'}
            </span>
          </p>
        </div>
        <div className="ad-editor-actions">
          {originalId && page.visible && !dirty && (
            <a href={siteUrl(`/${page.slug}`)} className="ad-btn ad-btn--ghost" target="_blank" rel="noreferrer">View page ↗</a>
          )}
          <button type="button" className="ad-btn ad-btn--primary" disabled={!canEdit || !dirty || saving} onClick={save}>
            {saving ? 'Saving…' : originalId ? (dirty ? 'Save changes' : 'Saved') : 'Create page'}
          </button>
        </div>
      </div>

      {problems.length > 0 && (
        <div className="ad-form-error ad-tu-problems" role="alert">
          <strong>Fix these before saving:</strong>
          <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className="ad-pb-layout">
        {/* ── Left: outline / block settings / page settings ── */}
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

          {panel === 'settings' && (
            <div className="ad-pb-card">
              <LocaleToggle locale={locale} onChange={setLocale} />
              <label className="ad-field">
                <span className="ad-field-label">{locale === 'AR' ? 'Title (Arabic)' : 'Title *'}</span>
                <input className="ad-input" dir={locale === 'AR' ? 'rtl' : undefined}
                  value={locale === 'AR' ? page.titleAr : page.title}
                  placeholder={locale === 'AR' ? page.title : 'e.g. Ramadan offers'}
                  onChange={e => (locale === 'AR' ? set({ titleAr: e.target.value }) : setTitle(e.target.value))} />
                <span className="ad-field-hint">Shown in the browser tab and when the page is shared.</span>
              </label>
              <label className="ad-field">
                <span className="ad-field-label">Address *</span>
                <span className="ad-pb-slug">
                  <span>kaya.ae/</span>
                  <input className="ad-input" value={page.slug}
                    onChange={e => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase() }) }}
                    onBlur={e => set({ slug: slugify(e.target.value) })} placeholder="ramadan-offers" />
                </span>
                <span className="ad-field-hint">Addresses the website already uses, like /treatments, can’t be taken.</span>
              </label>
              <label className="ad-check ad-pb-visible">
                <input type="checkbox" checked={page.visible} onChange={e => set({ visible: e.target.checked })} />
                <span>
                  <strong>Visible on the website</strong>
                  <span className="ad-field-hint">Hidden pages can’t be opened by visitors. The page isn’t added to the menu either way — link to it from Footer &amp; Global or another page.</span>
                </span>
              </label>
              <div className="ad-pb-seo">
                <span className="ad-field-label">Search engines</span>
                <label className="ad-field">
                  <span className="ad-field-label ad-pb-sublabel">{locale === 'AR' ? 'SEO title (Arabic)' : 'SEO title'}</span>
                  <input className="ad-input" dir={locale === 'AR' ? 'rtl' : undefined}
                    value={locale === 'AR' ? page.seoTitleAr : page.seoTitle}
                    placeholder={page.title ? `${page.title} | Kaya` : ''}
                    onChange={e => set(locale === 'AR' ? { seoTitleAr: e.target.value } : { seoTitle: e.target.value })} />
                </label>
                <label className="ad-field">
                  <span className="ad-field-label ad-pb-sublabel">{locale === 'AR' ? 'Description (Arabic)' : 'Description'}</span>
                  <textarea className="ad-input ad-textarea" rows={3} dir={locale === 'AR' ? 'rtl' : undefined}
                    value={locale === 'AR' ? page.seoDescriptionAr : page.seoDescription}
                    onChange={e => set(locale === 'AR' ? { seoDescriptionAr: e.target.value } : { seoDescription: e.target.value })} />
                  <span className="ad-field-hint">{(locale === 'AR' ? page.seoDescriptionAr : page.seoDescription).length} / 160 characters recommended</span>
                </label>
              </div>
            </div>
          )}

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

        {/* ── Right: live preview ── */}
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
