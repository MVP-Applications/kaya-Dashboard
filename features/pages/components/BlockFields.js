'use client'
import { SectionFields } from '@/shared/components/ContentFields'
import { formFields } from '@/features/pages/lib/schema'

/**
 * The form for one section of a built page, drawn from its section type in
 * the backend schema. It edits one language at a time; an empty Arabic field
 * shows the English one on the website.
 */
export default function BlockFields({ schema, block, locale, onChange, disabled }) {
  const fields = formFields(schema, block.type)
  const values = block.content?.[locale] || {}
  const set = (key, value) => onChange({ ...block.content, [locale]: { ...values, [key]: value } })
  return (
    <div className="ad-pb-fields" dir={locale === 'AR' ? 'rtl' : undefined}>
      {locale === 'AR' && (
        <p className="ad-field-hint">Empty fields show the English version on the website.</p>
      )}
      <SectionFields fields={fields} values={values} onChange={set} disabled={disabled} />
    </div>
  )
}
