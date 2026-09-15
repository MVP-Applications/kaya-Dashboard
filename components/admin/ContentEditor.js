'use client'
import { useEffect, useMemo, useState } from 'react'
import { SectionFields } from './ContentFields'
import LocaleToggle from './LocaleToggle'

/**
 * Draft-based editor for one content group (a page, or a site-wide group like
 * the footer). Edits accumulate locally so nothing is written until Save, and
 * Cancel walks away cleanly — the same contract as the service/doctor forms.
 *
 * `group`   — schema entry: { label, sections: [{ id, label, hint, fields }] }
 * `values`  — stored { sectionId: { fieldKey: value } }
 * `seed`    — the same shape, freshly seeded, used by the per-section revert
 * `onSave`  — called once per changed section: (sectionId, sectionValues)
 */
export default function ContentEditor({
  group, values, seed, onSave, canEdit = true, children,
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

  function save() {
    changed.forEach(id => onSave(id, draft[id]))
    setSaved(true)
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
          <button type="button" className="ad-btn ad-btn--primary"
            disabled={!dirty || !canEdit} onClick={save}>
            Save changes
          </button>
        </div>
      </div>

      {!canEdit && (
        <p className="ad-cf-readonly">
          Your role can’t edit website content — fields are read-only.
        </p>
      )}

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
    </div>
  )
}

/** Value equality by serialisation — section values are plain JSON. */
function same(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}
