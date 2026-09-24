'use client'
import { useState } from 'react'
import LocaleToggle from './LocaleToggle'
import { emptyOption } from '@/lib/admin/tell-us'

/**
 * Edit one question: wording (EN/AR), one-or-many answers, the answers
 * themselves and — for a main treatment's own questions — which treatments
 * each answer suggests. Shared questions never link treatments.
 *
 * Fully controlled: `question` in, `onChange(next)` out.
 */
export default function TellUsQuestionEditor({
  question, onChange, shared = false, areaLabel = '', areaTreatments = [], allTreatments = [],
}) {
  const [locale, setLocale] = useState('EN')
  const isAr = locale === 'AR'
  const k = key => (isAr ? `${key}Ar` : key)

  const set = (field, value) => onChange({ ...question, [field]: value })
  const setOption = (i, patch) => onChange({
    ...question, options: question.options.map((o, j) => (j === i ? { ...o, ...patch } : o)),
  })
  const moveOption = (i, dir) => {
    const to = i + dir
    if (to < 0 || to >= question.options.length) return
    const next = [...question.options]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange({ ...question, options: next })
  }
  const removeOption = i => onChange({ ...question, options: question.options.filter((_, j) => j !== i) })

  const nameOf = Object.fromEntries(allTreatments.map(t => [t.slug, t.name]))
  const inArea = new Set(areaTreatments.map(t => t.slug))

  return (
    <div className="ad-tu-editor">
      <LocaleToggle locale={locale} onChange={setLocale} />

      <div className="ad-grid2">
        <label className="ad-field">
          <span className="ad-field-label">{isAr ? 'Eyebrow (AR)' : 'Eyebrow'}</span>
          <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={question[k('eyebrow')]}
            onChange={e => set(k('eyebrow'), e.target.value)} placeholder={isAr ? '' : 'e.g. A little more about you'} />
        </label>
        <label className="ad-field">
          <span className="ad-field-label">{isAr ? 'Heading (AR)' : 'Heading *'}</span>
          <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={question[k('heading')]}
            onChange={e => set(k('heading'), e.target.value)} placeholder={isAr ? '' : 'e.g. What is your *gender*?'} />
          <span className="ad-field-hint">Wrap the highlighted words in *asterisks*.</span>
        </label>
      </div>
      <label className="ad-field">
        <span className="ad-field-label">{isAr ? 'Subtitle (AR)' : 'Subtitle'}</span>
        <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={question[k('sub')]}
          onChange={e => set(k('sub'), e.target.value)} />
      </label>

      <div className="ad-field">
        <span className="ad-field-label">People can choose</span>
        <div className="ad-tu-seg" role="radiogroup" aria-label="Answers allowed">
          <button type="button" role="radio" aria-checked={!question.multiple}
            className={`ad-tu-seg-btn${!question.multiple ? ' active' : ''}`} onClick={() => set('multiple', false)}>
            One answer
          </button>
          <button type="button" role="radio" aria-checked={question.multiple}
            className={`ad-tu-seg-btn${question.multiple ? ' active' : ''}`} onClick={() => set('multiple', true)}>
            Several answers
          </button>
        </div>
      </div>

      <div className="ad-field">
        <span className="ad-field-label">Answers *</span>
        {!shared && (
          <span className="ad-field-hint ad-tu-hint">
            Link each answer to the treatments it should suggest. Only treatments in {areaLabel || 'this main treatment'} can be suggested.
          </span>
        )}
        <div className="ad-tu-options">
          {question.options.map((o, i) => {
            const linked = o.treatments || []
            const available = areaTreatments.filter(t => !linked.includes(t.slug))
            return (
              <div key={o.id} className="ad-tu-option">
                <div className="ad-tu-option-row">
                  <span className="ad-reorder">
                    <button type="button" className="ad-reorder-btn" onClick={() => moveOption(i, -1)} disabled={i === 0} aria-label="Move answer up">▲</button>
                    <button type="button" className="ad-reorder-btn" onClick={() => moveOption(i, 1)} disabled={i === question.options.length - 1} aria-label="Move answer down">▼</button>
                  </span>
                  <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={o[k('label')]}
                    onChange={e => setOption(i, { [k('label')]: e.target.value })}
                    placeholder={isAr ? (o.label || '') : 'Answer'} aria-label={`Answer ${i + 1}`} />
                  <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => removeOption(i)}
                    aria-label={`Remove answer ${o.label || i + 1}`}>Remove</button>
                </div>
                {!shared && (
                  <div className="ad-tu-links">
                    {linked.map(slug => (
                      <span key={slug} className={`ad-tu-link${inArea.has(slug) ? '' : ' ad-tu-link--warn'}`}
                        title={inArea.has(slug) ? '' : `Not in ${areaLabel} — it won't be suggested here`}>
                        {nameOf[slug] || slug}
                        {!inArea.has(slug) && <span className="ad-tu-link-note"> · not in {areaLabel}</span>}
                        <button type="button" onClick={() => setOption(i, { treatments: linked.filter(t => t !== slug) })}
                          aria-label={`Unlink ${nameOf[slug] || slug}`}>×</button>
                      </span>
                    ))}
                    {available.length > 0 && (
                      <select className="ad-input ad-input--sm ad-tu-link-add" value=""
                        onChange={e => e.target.value && setOption(i, { treatments: [...linked, e.target.value] })}
                        aria-label="Link a treatment">
                        <option value="">+ Link treatment</option>
                        {available.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                      </select>
                    )}
                    {!linked.length && <span className="ad-tu-link-empty">Suggests nothing specific</span>}
                  </div>
                )}
              </div>
            )
          })}
          <button type="button" className="ad-btn ad-btn--soft ad-btn--sm ad-tu-add"
            onClick={() => set('options', [...question.options, emptyOption()])}>
            + Add answer
          </button>
        </div>
      </div>

      {!shared && (
        <div className="ad-field">
          <label className="ad-check">
            <input type="checkbox" checked={question.notSure} onChange={e => set('notSure', e.target.checked)} />
            Offer a &ldquo;not sure&rdquo; answer that shows every treatment in {areaLabel || 'this main treatment'}
          </label>
          {question.notSure && (
            <input className="ad-input ad-tu-notsure" dir={isAr ? 'rtl' : undefined} value={question[k('notSureLabel')]}
              onChange={e => set(k('notSureLabel'), e.target.value)} aria-label="Not sure answer label" />
          )}
        </div>
      )}
    </div>
  )
}
