'use client'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ReorderCell from '@/shared/components/ReorderCell'
import LocaleToggle from '@/shared/components/LocaleToggle'
import { emptyCategory } from '@/shared/lib/seed'
import SlugField from '@/shared/components/SlugField'
import { resolveSlug } from '@/shared/lib/slug'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery, useQueryText } from '@/shared/hooks/useUrlState'

export default function CategoriesView() {
  const { categories, services, upsertCategory, deleteCategory, allowed, dataVersion } = useAdmin()
  // Search and the open record live in the URL (?q, ?edit=<slug>, ?new=1)
  // so a refresh or a new tab reopens the same screen.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const editSlug = get('edit')
  const isNew = get('new') === '1'
  const newCategory = useMemo(() => (isNew ? emptyCategory() : null), [isNew])
  const [confirm, setConfirm] = useState(null) // slug pending delete
  // The record the open editor was started from. Saving a slug rename swaps
  // it out of `categories` before ?edit is cleared, so keep the form on
  // screen instead of flashing "not found" on the way out.
  const held = useRef(null)

  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  // How many treatments currently point at each category — computed
  // client-side from `services`, same approach VerticalsView uses for its
  // vertical counts (the backend's list response has this too, but only
  // there; this way it stays live as services change without a refetch).
  const treatmentCount = useMemo(() => {
    const map = {}
    services.forEach(s => { if (s.category) map[s.category] = (map[s.category] || 0) + 1 })
    return map
  }, [services])

  const q = query.trim().toLowerCase()
  const filtered = categories.filter(c => !q || `${c.name} ${c.slug}`.toLowerCase().includes(q))
  const isFiltered = Boolean(q)

  const closeEditor = () => set({ edit: '', new: '' })
  const saveAndClose = (rec, orig) => { upsertCategory(rec, orig); closeEditor() }

  if (isNew) {
    return (
      <CategoryForm key="new" initial={newCategory} isNew existing={categories}
        onSave={saveAndClose} onClose={closeEditor} />
    )
  }
  if (editSlug) {
    const found = categories.find(c => c.slug === editSlug)
    if (found) held.current = found
    else if (held.current?.slug !== editSlug) held.current = null
    const record = found || held.current
    if (!record) {
      return <MissingRecord loading={dataVersion === 0} label="category" backHref={href({ edit: '' })} />
    }
    return (
      <CategoryForm key={editSlug} initial={record} isNew={false} existing={categories}
        onSave={saveAndClose} onClose={closeEditor} />
    )
  }

  const target = confirm ? categories.find(c => c.slug === confirm) : null

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Categories</h1>
          <p className="ad-view-sub">
            {categories.length} categories · showing {filtered.length}
          </p>
        </div>
        {canCreate && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>
            + New category
          </Link>
        )}
      </div>

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search by name or slug…"
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th className="ad-th-order">Order</th>
              <th>Category</th>
              <th>Treatments</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.slug}>
                <td className="ad-td-order">
                  <ReorderCell
                    collection="categories"
                    itemKey={c.slug}
                    index={categories.indexOf(c)}
                    total={categories.length}
                    disabled={isFiltered}
                  />
                </td>
                <td>
                  <div className="ad-cell-name">{c.name}</div>
                  <div className="ad-cell-slug">{c.slug}</div>
                </td>
                <td>{treatmentCount[c.id] || 0}</td>
                <td className="ad-td-actions">
                  <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: c.slug })}>Edit</Link>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(c.slug)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="ad-empty">
                {categories.length === 0 ? 'No categories yet. Add your first one.' : 'No categories match your search.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <ConfirmDialog
          title="Delete category?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteCategory(target.slug); setConfirm(null) }}
        >
          {treatmentCount[target.id]
            ? <>
                <strong>{target.name}</strong> is used by {treatmentCount[target.id]} treatment
                {treatmentCount[target.id] === 1 ? '' : 's'} — they&apos;ll lose this category, not get deleted.
              </>
            : <><strong>{target.name}</strong> will be removed.</>}
        </ConfirmDialog>
      )}
    </div>
  )
}

function CategoryForm({ initial, isNew, existing, onSave, onClose }) {
  const [form, setForm] = useState({
    slug: '', name: '', description: '', nameAr: '', descriptionAr: '', ...initial,
  })
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('EN')
  const originalSlug = isNew ? null : initial.slug

  const isAr = locale === 'AR'
  const nameKey = isAr ? 'nameAr' : 'name'
  const descriptionKey = isAr ? 'descriptionAr' : 'description'

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Name is required.')

    const { slug, error: slugError } = resolveSlug(
      form.slug, name, existing.map(c => c.slug).filter(s => s !== originalSlug),
    )
    if (slugError) return setError(slugError)

    onSave({
      ...form, id: form.id, slug, name,
      description: form.description.trim(),
      nameAr: form.nameAr.trim(),
      descriptionAr: form.descriptionAr.trim(),
    }, originalSlug)
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New category' : 'Edit category'}</h1>
          <p className="ad-view-sub">{isNew ? 'Add a treatment category.' : form.slug}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create category' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Basics</legend>
          <SlugField value={form.slug} source={form.name} onChange={v => set('slug', v)} />
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Name &amp; description</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic Name to add a translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'الاسم (Name)' : 'Name *'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[nameKey]}
              onChange={e => set(nameKey, e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'الوصف (Description)' : 'Description'}</span>
            <textarea className="ad-input ad-textarea" dir={isAr ? 'rtl' : undefined} rows={3}
              value={form[descriptionKey]} onChange={e => set(descriptionKey, e.target.value)} />
          </label>
        </fieldset>
      </div>
    </form>
  )
}
