'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { SectionFields, FieldsCard, ListCard, countFieldErrors } from '@/shared/components/ContentFields'
import LocaleToggle from '@/shared/components/LocaleToggle'

/**
 * Draft-based editor for one content group (a page, or a site-wide group like
 * the footer). Edits accumulate locally so nothing is written until Save, and
 * Cancel walks away cleanly — the same contract as the service/doctor forms.
 *
 * `group`   — schema entry: { label, sections: [{ id, label, hint, fields }] }
 * `values`  — stored { sectionId: { fieldKey: value } }
 * `seed`    — the same shape, freshly seeded, used by the per-section revert
 * `onSave`  — called once per changed section: (sectionId, sectionValues)
 *
 * Optional split layout (used by the Footer tab): pass `panels` —
 * [{ id, label, section, keys?, hint? }] — plus `activePanel` and
 * `panelHref(id)`. A side menu then lists the panels and only the active one
 * shows, with its list fields as rows (Edit / Delete, Add on top). Display
 * only: drafts, validation and per-section saving are the same either way.
 */
export default function ContentEditor({
  group, values, seed, onSave, canEdit = true, children,
  panels = null, activePanel = '', panelHref,
  /**
   * Which market's copy is on screen. The draft has to be rebuilt when this
   * changes, or switching country leaves the previous market's unsaved text in
   * the inputs — and saving would then write it into the wrong country.
   */
  scopeKey = '',
  /**
   * Extra controls in a section's header (e.g. show/hide on the website), and
   * whether a section is currently switched off — it's then shown dimmed.
   */
  renderSectionExtra = null,
  isSectionOff = null,
  /** Two sections per row on wide screens (the website pages), one below that. */
  paired = false,
  /**
   * Sections start collapsed and open on a click of their header. Display
   * only: a collapsed section's fields stay mounted and keep their draft.
   */
  collapsible = false,
}) {
  const [draft, setDraft] = useState(values || {})
  const [saved, setSaved] = useState(false)
  const [locale, setLocale] = useState('EN')
  const [openSections, setOpenSections] = useState(() => new Set())

  // Re-seed the draft when the editor is pointed at a different group, or at
  // the same group in a different market.
  useEffect(() => { setDraft(values || {}); setSaved(false) }, [group.id, scopeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Another page starts with every section collapsed again.
  useEffect(() => { setOpenSections(new Set()) }, [group.id])

  function toggleSection(id) {
    setOpenSections(open => {
      const next = new Set(open)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** Failing fields in one section, across locales — flagged on its collapsed header. */
  function sectionErrorCount(section) {
    let count = 0
    for (const loc of ['EN', 'AR']) {
      const v = draft[section.id]?.[loc]
      if (v) count += countFieldErrors(section.fields, v)
    }
    return count
  }

  // The editor can open before the content has loaded (straight after sign-in,
  // a refresh, a link opened in a new tab). When the stored content arrives or
  // changes, take it — unless the admin has already started editing, so their
  // unsaved work is never overwritten.
  const shownValues = useRef(values || {})
  useEffect(() => {
    const before = shownValues.current
    shownValues.current = values || {}
    setDraft(d => (same(d, before) ? (values || {}) : d))
  }, [values])

  const changed = useMemo(
    () => group.sections.filter(s => !same(draft[s.id], values?.[s.id])).map(s => s.id),
    [draft, values, group.sections],
  )
  const dirty = changed.length > 0

  // Fields with a `validate` rule that currently fail, per locale — both
  // count, since a save sends every locale and the backend checks them all.
  const errors = useMemo(() => {
    const out = { EN: 0, AR: 0 }
    for (const s of group.sections) {
      for (const loc of Object.keys(out)) {
        const v = draft[s.id]?.[loc]
        if (v) out[loc] += countFieldErrors(s.fields, v)
      }
    }
    return out
  }, [draft, group.sections])
  const errorCount = errors.EN + errors.AR
  const otherLocale = locale === 'EN' ? 'AR' : 'EN'

  useEffect(() => {
    if (!saved) return
    const id = setTimeout(() => setSaved(false), 2400)
    return () => clearTimeout(id)
  }, [saved])

  // Section values are locale-nested — { EN: {fieldKey: value}, AR: {...} }
  // — so a field edit only ever touches the locale currently on screen.
  function setField(sectionId, key, value) {
    setDraft(d => ({
      ...d,
      [sectionId]: {
        ...d[sectionId],
        [locale]: { ...d[sectionId]?.[locale], [key]: value },
      },
    }))
  }

  function revert(sectionId) {
    const original = seed?.[sectionId]
    if (!original) return
    setDraft(d => ({ ...d, [sectionId]: original }))
  }

  // Revert only the fields a panel shows, in every locale, so reverting the
  // Company column leaves the Support column alone.
  function revertKeys(sectionId, keys) {
    restoreKeys(sectionId, keys, seed?.[sectionId])
  }

  // Put some fields of a section back to `original` (locale-nested) — used by
  // Reset to default (the seed) and by Cancel (the draft from before Edit).
  function restoreKeys(sectionId, keys, original) {
    if (!original) return
    setDraft(d => {
      const current = d[sectionId] || {}
      const next = { ...current }
      for (const loc of new Set([...Object.keys(current), ...Object.keys(original)])) {
        next[loc] = { ...current[loc] }
        for (const k of keys) next[loc][k] = original[loc]?.[k]
      }
      return { ...d, [sectionId]: next }
    })
  }

  function save() {
    changed.forEach(id => onSave(id, draft[id]))
    setSaved(true)
  }

  function renderPanels() {
    const panel = panels.find(p => p.id === activePanel) || panels[0]
    const section = group.sections.find(sec => sec.id === panel.section)
    if (!section) return null
    const fields = panelFields(section, panel)
    const scalars = fields.filter(f => f.type !== 'list')
    const lists = fields.filter(f => f.type === 'list')
    const scalarKeys = scalars.map(f => f.key)
    const hint = panel.hint ?? section.hint
    const canRevert = canEdit && seed?.[section.id]
      && !same(pick(draft[section.id], scalarKeys), pick(seed[section.id], scalarKeys))

    return (
      <div className="ad-cf-split">
        <nav className="ad-cf-panelnav" aria-label={`${group.label} areas`}>
          {panels.map(p => {
            const sec = group.sections.find(x => x.id === p.section)
            const status = sec ? panelStatus(sec, p) : {}
            return (
              <Link key={p.id} href={panelHref(p.id)} scroll={false}
                className={`ad-cf-panelnav-item${p.id === panel.id ? ' active' : ''}`}
                aria-current={p.id === panel.id ? 'page' : undefined}>
                <span>{p.label}</span>
                {status.errors > 0 ? (
                  <span className="ad-cf-navflag ad-cf-navflag--err"
                    title={`${status.errors} ${status.errors === 1 ? 'field needs' : 'fields need'} fixing`}>
                    {status.errors}
                  </span>
                ) : status.dirty ? (
                  <span className="ad-cf-navflag" title="Unsaved changes" />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="ad-cf-panel" dir={locale === 'AR' ? 'rtl' : undefined}>
          <FieldsCard key={panel.id}
            title={panel.label}
            hint={hint}
            fields={scalars}
            values={draft[section.id]?.[locale]}
            onChange={(key, value) => setField(section.id, key, value)}
            disabled={!canEdit}
            dirty={!same(pick(draft[section.id], scalarKeys), pick(values?.[section.id], scalarKeys))}
            snapshot={() => draft[section.id] || {}}
            restore={snap => restoreKeys(section.id, scalarKeys, snap)}
            editActions={canRevert && (
              <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                title="Replace this area's text with the original built-in copy"
                onClick={() => revertKeys(section.id, scalarKeys)}>
                ↺ Reset to default
              </button>
            )}
          />

          {lists.map(f => (
            <ListCard key={`${panel.id}:${f.key}`}
              field={f}
              value={draft[section.id]?.[locale]?.[f.key]}
              onChange={value => setField(section.id, f.key, value)}
              disabled={!canEdit}
              dirty={!same(pick(draft[section.id], [f.key]), pick(values?.[section.id], [f.key]))}
            />
          ))}
        </div>
      </div>
    )
  }

  /** Unsaved changes and failing fields within one panel, across locales. */
  function panelStatus(section, panel) {
    const fields = panelFields(section, panel)
    const keys = fields.map(f => f.key)
    let errorTotal = 0
    for (const loc of ['EN', 'AR']) {
      const v = draft[section.id]?.[loc]
      if (v) errorTotal += countFieldErrors(fields, v)
    }
    return {
      dirty: !same(pick(draft[section.id], keys), pick(values?.[section.id], keys)),
      errors: errorTotal,
    }
  }

  return (
    <div className="ad-cf">
      <div className="ad-cf-bar">
        <div className="ad-cf-bar-info">
          {children}
        </div>
        <LocaleToggle locale={locale} onChange={setLocale} />
        <div className="ad-cf-bar-actions">
          {saved && !dirty && <span className="ad-cf-saved">✓ Saved</span>}
          {dirty && (
            <span className="ad-cf-dirty">
              {changed.length} unsaved {changed.length === 1 ? 'section' : 'sections'}
            </span>
          )}
          <button type="button" className="ad-btn ad-btn--ghost"
            disabled={!dirty} onClick={() => setDraft(values || {})}>
            Discard
          </button>
          {errorCount > 0 && (
            <span className="ad-cf-invalid">
              {errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} fixing
              {errors[otherLocale] > 0 && ` (${errors[otherLocale]} in ${otherLocale})`}
            </span>
          )}
          <button type="button" className="ad-btn ad-btn--primary"
            disabled={!dirty || !canEdit || errorCount > 0} onClick={save}>
            Save changes
          </button>
        </div>
      </div>

      {!canEdit && (
        <p className="ad-cf-readonly">
          Your role can’t edit website content, so fields are read-only.
        </p>
      )}

      {panels ? renderPanels() : (
        <div className={paired ? 'ad-cf-pair-wrap' : undefined}>
        {collapsible && (
          <div className="ad-cf-expand-all">
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
              onClick={() => setOpenSections(new Set(group.sections.map(s => s.id)))}>
              Expand all
            </button>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
              onClick={() => setOpenSections(new Set())}>
              Collapse all
            </button>
          </div>
        )}
        <div className={`ad-cf-sections${paired ? ' ad-cf-sections--pair' : ''}`}>
          {group.sections.map(section => {
            const isOpen = !collapsible || openSections.has(section.id)
            const sectionErrors = collapsible ? sectionErrorCount(section) : 0
            const bodyId = `ad-cf-body-${section.id}`
            const heading = (
              <>
                <h2 className="ad-cf-sec-title">{section.label}</h2>
                {section.hint && <p className="ad-cf-sec-hint">{section.hint}</p>}
              </>
            )
            return (
            <section key={section.id}
              className={`ad-fieldset ad-cf-sec${paired && isWideSection(section) ? ' ad-cf-sec--wide' : ''}${isOpen ? '' : ' ad-cf-sec--collapsed'}${changed.includes(section.id) ? ' ad-cf-sec--dirty' : ''}${isSectionOff?.(section.id) ? ' ad-cf-sec--off' : ''}`}>
              <div className="ad-cf-sec-head">
                {collapsible ? (
                  <button type="button" className="ad-cf-sec-toggle" aria-expanded={isOpen} aria-controls={bodyId}
                    onClick={() => toggleSection(section.id)}>
                    <span className="ad-cf-sec-chevron" aria-hidden="true">▸</span>
                    <span className="ad-cf-sec-toggle-text">
                      {heading}
                      {!isOpen && (changed.includes(section.id) || sectionErrors > 0) && (
                        <span className="ad-cf-sec-flags">
                          {changed.includes(section.id) && <span className="ad-cf-dirty">Unsaved changes</span>}
                          {sectionErrors > 0 && (
                            <span className="ad-cf-invalid">
                              {sectionErrors} {sectionErrors === 1 ? 'field needs' : 'fields need'} fixing
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                ) : (
                  <div>{heading}</div>
                )}
                <div className="ad-cf-sec-actions">
                  {renderSectionExtra?.(section)}
                  {canEdit && seed?.[section.id] && !same(draft[section.id], seed[section.id]) && (
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                      onClick={() => revert(section.id)}>
                      ↺ Revert
                    </button>
                  )}
                </div>
              </div>
              {/* Arabic copy is typed right-to-left. A collapsed section's
                  fields stay mounted, only hidden, so nothing in them is lost. */}
              <div id={bodyId} className="ad-cf-sec-body" dir={locale === 'AR' ? 'rtl' : undefined} hidden={!isOpen}>
                <SectionFields
                  fields={section.fields}
                  values={draft[section.id]?.[locale]}
                  onChange={(key, value) => setField(section.id, key, value)}
                  disabled={!canEdit}
                />
              </div>
            </section>
            )
          })}
        </div>
        </div>
      )}
    </div>
  )
}

/** Sections with paragraphs or lists take a full row when sections are paired. */
function isWideSection(section) {
  return section.fields.some(f => f.type === 'strings' || f.type === 'list')
}

/** The fields a panel shows: its `keys`, or the whole section. */
function panelFields(section, panel) {
  return panel.keys ? section.fields.filter(f => panel.keys.includes(f.key)) : section.fields
}

/** Locale-nested section values narrowed to some field keys. */
function pick(sectionValues, keys) {
  const out = {}
  for (const [loc, v] of Object.entries(sectionValues || {})) {
    out[loc] = {}
    for (const k of keys) if (v?.[k] !== undefined) out[loc][k] = v[k]
  }
  return out
}

/** Value equality by serialisation — section values are plain JSON. */
function same(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}
