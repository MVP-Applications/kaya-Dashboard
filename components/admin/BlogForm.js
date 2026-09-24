'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import ImagePicker from './ImagePicker'
import LocaleToggle from './LocaleToggle'
import { BLOG_STATUS_OPTIONS, BLOG_STATUS_LABELS } from '@/lib/admin/seed'

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Word count and a ~200 wpm reading time, as a writing aid. */
function readingStats(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length
  return { words, minutes: Math.max(1, Math.round(words / 200)) }
}

export default function BlogForm({ initial, isNew, onClose }) {
  const { blogs, doctors, upsertBlog } = useAdmin()
  const [form, setForm] = useState(() => cloneSafe(initial))
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('EN')
  // A new post's slug follows its title until someone edits the slug directly.
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'
  const titleKey = isAr ? 'titleAr' : 'title'
  const contentKey = isAr ? 'contentAr' : 'content'
  const stats = readingStats(form[contentKey])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function setTitle(value) {
    setForm(f => ({
      ...f,
      [titleKey]: value,
      ...(!isAr && !slugTouched ? { slug: slugify(value) } : {}),
    }))
  }

  function submit(e) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return setError('Title is required.')
    if (!form.content.trim()) return setError('Content is required.')
    const writer = form.writer.trim()
    if (!writer) return setError('Writer is required.')

    const slug = slugify(form.slug || title)
    if (!slug) return setError('The URL slug needs at least one letter or number.')
    if (blogs.some(b => b.slug === slug && b.id !== originalId)) {
      return setError(`Another post already uses the URL "/${slug}".`)
    }
    if ((form.titleAr.trim() && !form.contentAr.trim()) || (!form.titleAr.trim() && form.contentAr.trim())) {
      return setError('For the Arabic version, fill in both the title and the content — or leave both empty.')
    }

    // The id stays fixed once set, so changing a post's slug later is an
    // in-place edit rather than a new post.
    const id = form.id || slug
    // Publishing with no date means "now".
    const publishedAt = form.status === 'published' && !form.publishedAt ? today() : form.publishedAt

    upsertBlog({ ...form, id, slug, title, writer, publishedAt }, originalId)
    onClose()
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New post' : 'Edit post'}</h1>
          <p className="ad-view-sub">{isNew ? 'Write an article for the website’s blog.' : `/${form.slug}`}</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create post' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Article</legend>
          <p className="ad-fieldset-hint">
            English is required. Fill in the Arabic title and content to add an Arabic translation.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'العنوان (Title)' : 'Title *'}</span>
            <input className="ad-input" dir={isAr ? 'rtl' : undefined} value={form[titleKey]}
              onChange={e => setTitle(e.target.value)} placeholder={isAr ? '' : 'e.g. What to expect from your first laser session'} />
          </label>
          <div className="ad-field">
            <span className="ad-field-label">Cover image</span>
            <ImagePicker value={form.image} onChange={v => set('image', v)} />
          </div>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'المحتوى (Content)' : 'Content *'}</span>
            <textarea className="ad-input ad-textarea ad-blog-content" dir={isAr ? 'rtl' : undefined} rows={16}
              value={form[contentKey]} onChange={e => set(contentKey, e.target.value)}
              placeholder={isAr ? '' : 'Write the article. Leave a blank line between paragraphs.'} />
            <span className="ad-field-hint">
              {stats.words.toLocaleString('en-US')} words · about {stats.minutes} min read. Leave a blank line between paragraphs.
            </span>
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Details</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Writer *</span>
              <input className="ad-input" list="ad-blog-writers" value={form.writer}
                onChange={e => set('writer', e.target.value)} placeholder="e.g. Dr. Sara Qasim" />
              <datalist id="ad-blog-writers">
                {doctors.map(d => <option key={d.slug} value={d.name} />)}
              </datalist>
              <span className="ad-field-hint">Pick a doctor or type any name.</span>
            </label>
            <label className="ad-field">
              <span className="ad-field-label">URL slug</span>
              <input className="ad-input" value={form.slug}
                onChange={e => { setSlugTouched(true); set('slug', e.target.value) }}
                onBlur={e => set('slug', slugify(e.target.value))}
                placeholder="made from the title" />
              <span className="ad-field-hint">The post&apos;s address on the website: /blog/{form.slug || '…'}</span>
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Status</span>
              <select className="ad-input" value={form.status} onChange={e => set('status', e.target.value)}>
                {BLOG_STATUS_OPTIONS.map(s => <option key={s} value={s}>{BLOG_STATUS_LABELS[s]}</option>)}
              </select>
              <span className="ad-field-hint">Only published posts appear on the website.</span>
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Publish date</span>
              <input type="date" className="ad-input ad-date-input" value={form.publishedAt}
                onChange={e => set('publishedAt', e.target.value)} />
              <span className="ad-field-hint">Left empty, publishing sets it to today.</span>
            </label>
          </div>
        </fieldset>
      </div>
    </form>
  )
}
