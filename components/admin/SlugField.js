'use client'
import { SLUG_HINT, SLUG_PATTERN, slugInput, slugify } from '@/lib/admin/slug'

/**
 * The slug input every form shares. Left empty, the record's slug is
 * generated from `source` (its name) on save — shown as the placeholder.
 * Typing is cleaned as it goes (lowercase, spaces → hyphens), so an admin
 * overriding it for SEO can't enter an address the backend would reject.
 */
export default function SlugField({ value, onChange, source, className = 'ad-field', placeholder = 'auto-generated' }) {
  const invalid = Boolean(value) && !SLUG_PATTERN.test(value)
  return (
    <label className={className}>
      <span className="ad-field-label">Slug</span>
      <input className="ad-input" value={value}
        placeholder={slugify(source) || placeholder}
        onChange={e => onChange(slugInput(e.target.value))}
        onBlur={e => onChange(slugify(e.target.value))} />
      {invalid
        ? <span className="ad-field-error">This slug isn&apos;t valid. {SLUG_HINT}</span>
        : <span className="ad-field-hint">{SLUG_HINT} Leave empty to use the name.</span>}
    </label>
  )
}
