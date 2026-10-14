'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import LocaleToggle from '@/shared/components/LocaleToggle'
import PageStatusControl from '@/features/pages/components/PageStatus'
import { HEADER_POSITIONS, FOOTER_COLUMNS } from '@/features/pages/lib/page-builder'

/**
 * Settings every page has, whatever its layout: the menu label, search
 * engine title/description (each in English and Arabic), where its link
 * shows in the header and footer, and which countries it's offered in.
 * Controlled — `value` is a page record, `onChange(patch)` merges a change.
 * Built pages also edit their title here (`withTitle`).
 */
export function PageSettingsFields({ value, onChange, locale, disabled, withTitle = false, titleSlot = null }) {
  const { accessibleCountries } = useAdmin()
  const ar = locale === 'AR'
  const field = key => (ar ? `${key}Ar` : key)
  const text = (key, extra = {}) => ({
    className: 'ad-input',
    dir: ar ? 'rtl' : undefined,
    value: value[field(key)] || '',
    placeholder: ar ? value[key] || '' : extra.placeholder,
    disabled,
    onChange: e => onChange({ [field(key)]: e.target.value }),
  })
  const countries = value.countries || []
  const toggleCountry = code => onChange({
    countries: countries.includes(code) ? countries.filter(c => c !== code) : [...countries, code],
  })

  return (
    <>
      <div className="ad-pair">
        <fieldset className="ad-fieldset">
          <legend>Page details</legend>
          {withTitle && titleSlot}
          <label className="ad-field ad-w-lg">
            <span className="ad-field-label">{ar ? 'Menu label (Arabic)' : 'Menu label'}</span>
            <input {...text('navLabel', { placeholder: value.title || 'e.g. Summer offers' })} />
            <span className="ad-field-hint">The link text in the website menu. Empty = the page title.{ar ? ' Empty Arabic shows the English label.' : ''}</span>
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Menus</legend>
          <label className="ad-field ad-w-md">
            <span className="ad-field-label">Header</span>
            <select className="ad-input" value={value.headerPosition || 'NONE'} disabled={disabled}
              onChange={e => onChange({ headerPosition: e.target.value })}>
              {HEADER_POSITIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="ad-field ad-w-md">
            <span className="ad-field-label">Footer</span>
            <select className="ad-input" value={value.footerColumn || 'NONE'} disabled={disabled}
              onChange={e => onChange({ footerColumn: e.target.value })}>
              {FOOTER_COLUMNS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="ad-field-hint">Links show only while the page is published. Change their order in Menu order.</span>
          </label>
        </fieldset>
      </div>

      <div className="ad-pair">
        <fieldset className="ad-fieldset">
          <legend>Countries</legend>
          <label className="ad-check">
            <input type="checkbox" checked={value.allCountries !== false} disabled={disabled}
              onChange={e => onChange({ allCountries: e.target.checked })} />
            <span><strong>Offered in every country</strong></span>
          </label>
          {value.allCountries === false && (
            <div className="ad-pg-countries">
              {accessibleCountries.map(c => (
                <label key={c.code} className={`ad-check${countries.includes(c.code) ? ' active' : ''}`}>
                  <input type="checkbox" checked={countries.includes(c.code)} disabled={disabled} onChange={() => toggleCountry(c.code)} />
                  <span>{c.name}</span>
                </label>
              ))}
              <span className="ad-field-hint">Visitors in other countries are sent to the homepage, and the page’s menu links are hidden for them.</span>
            </div>
          )}
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Search engines</legend>
          <label className="ad-field ad-w-xl">
            <span className="ad-field-label">{ar ? 'SEO title (Arabic)' : 'SEO title'}</span>
            <input {...text('seoTitle', { placeholder: value.title ? `${value.title} | Kaya` : 'Empty = the site’s default title' })} />
          </label>
          <label className="ad-field ad-w-xl">
            <span className="ad-field-label">{ar ? 'Description (Arabic)' : 'Description'}</span>
            <textarea rows={3} {...text('seoDescription')} className="ad-input ad-textarea" />
            <span className="ad-field-hint">{(value[field('seoDescription')] || '').length} / 160 characters recommended</span>
          </label>
        </fieldset>
      </div>
    </>
  )
}

/** Settings + status of one of the website's own pages (?open=<id>&panel=settings). */
export default function SystemPageSettings({ page, record, backHref }) {
  const { allowed, savePageSettings, saving } = useAdmin()
  const canEdit = allowed('manageSettings')
  const [draft, setDraft] = useState(record)
  const [locale, setLocale] = useState('EN')
  const [problem, setProblem] = useState('')
  useEffect(() => { setDraft(record) }, [record])

  const dirty = JSON.stringify(draft) !== JSON.stringify(record)
  async function save() {
    if (draft.allCountries === false && !(draft.countries || []).length) {
      setProblem('Choose at least one country, or offer the page in every country.')
      return
    }
    setProblem('')
    await savePageSettings(draft)
  }

  return (
    <div className="ad-view">
      <div className="ad-editor-head">
        <Link className="ad-back" href={backHref}>← {page.label}</Link>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{page.label} — settings</h1>
          <div className="ad-view-sub ad-pg-sub">{record.path} · <PageStatusControl page={record} canEdit={canEdit} blockedReason={dirty ? 'Save your changes first.' : ''} /></div>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" disabled={!dirty} onClick={() => setDraft(record)}>Discard</button>
          <button type="button" className="ad-btn ad-btn--primary" disabled={!canEdit || !dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
      {!canEdit && <div className="ad-note">Only a super admin can change these settings.</div>}
      {problem && <div className="ad-form-error" role="alert">{problem}</div>}
      <div className="ad-editor-body ad-form-sections">
        <div className="ad-pb-settings-locale">
          <LocaleToggle locale={locale} onChange={setLocale} />
          <span className="ad-field-hint">The address and layout of the website’s own pages are fixed.</span>
        </div>
        <PageSettingsFields value={draft} onChange={patch => setDraft(d => ({ ...d, ...patch }))} locale={locale} disabled={!canEdit} />
      </div>
    </div>
  )
}
