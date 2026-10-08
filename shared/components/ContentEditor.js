'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { SectionFields, ListCard, countFieldErrors } from '@/shared/components/ContentFields'
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
}) {
  const [draft, setDraft] = useState(values || {})
  const [saved, setSaved] = useState(false)
  const [locale, setLocale] = useState('EN')

  // Re-seed the draft when the editor is pointed at a different group, or at
  // the same group in a different market.
  useEffect(() => { setDraft(values || {}); setSaved(false) }, [group.id, scopeKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const original = seed?.[sectionId]
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
    const keys = fields.map(f => f.key)
    const hint = panel.hint ?? section.hint
    const canRevert = canEdit && seed?.[section.id]
      && !same(pick(draft[section.id], keys), pick(seed[section.id], keys))

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

        <div className="ad-cf-panel">
          <section className={`ad-fieldset ad-cf-sec${panelStatus(section, panel).dirty ? ' ad-cf-sec--dirty' : ''}`}>
            <div className={`ad-cf-sec-head${scalars.length ? '' : ' ad-cf-sec-head--solo'}`}>
              <div>
                <h2 className="ad-cf-panel-title">{panel.label}</h2>
                {hint && <p className="ad-cf-sec-hint">{hint}</p>}
              </div>
              {canRevert && (
                <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                  onClick={() => (panel.keys ? revertKeys(section.id, keys) : revert(section.id))}>
                  ↺ Revert
                </button>
              )}
            </div>
            {scalars.length > 0 && (
              <SectionFields
                fields={scalars}
                values={draft[section.id]?.[locale]}
                onChange={(key, value) => setField(section.id, key, value)}
                disabled={!canEdit}
              />
            )}
          </section>

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
          Your role can’t edit website content — fields are read-only.
        </p>
      )}

      {panels ? renderPanels() : (
        <div className="ad-cf-sections">
          {group.sections.map(section => (
            <section key={section.id}
              className={`ad-fieldset ad-cf-sec${changed.includes(section.id) ? ' ad-cf-sec--dirty' : ''}`}>
              <div className="ad-cf-sec-head">
                <div>
                  <h2 className="ad-cf-sec-title">{section.label}</h2>
                  {section.hint && <p className="ad-cf-sec-hint">{section.hint}</p>}
                </div>
                {canEdit && seed?.[section.id] && !same(draft[section.id], seed[section.id]) && (
                  <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                    onClick={() => revert(section.id)}>
                    ↺ Revert
                  </button>
                )}
              </div>
              <SectionFields
                fields={section.fields}
                values={draft[section.id]?.[locale]}
                onChange={(key, value) => setField(section.id, key, value)}
                disabled={!canEdit}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
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
