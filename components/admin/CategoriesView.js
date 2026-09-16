'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import ReorderCell from './ReorderCell'
import LocaleToggle from './LocaleToggle'
import { emptyCategory } from '@/lib/admin/seed'

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function CategoriesView() {
  const { categories, services, upsertCategory, deleteCategory, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // { initial, isNew }
  const [confirm, setConfirm] = useState(null) // slug pending delete

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

  if (editing) {
    return (
      <CategoryForm
        initial={editing.initial}
        isNew={editing.isNew}
        existing={categories}
        onSave={(rec, orig) => { upsertCategory(rec, orig); setEditing(null) }}
        onClose={() => setEditing(null)}
      />
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
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyCategory(), isNew: true })}>
            + New category
          </button>
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
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: c, isNew: false })}>Edit</button>
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

    const slug = form.slug.trim() || slugify(name)
    const clash = existing.some(c => c.slug === slug && c.slug !== originalSlug)
    if (clash) return setError(`The slug "${slug}" is already in use.`)

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
          <label className="ad-field">
            <span className="ad-field-label">Slug</span>
            <input className="ad-input" value={form.slug}
              placeholder={slugify(form.name) || 'auto'}
              onChange={e => set('slug', e.target.value)} />
          </label>
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
