'use client'
import { useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import { sortCountries } from '@/shared/lib/content'
import { isSuperAdmin } from '@/shared/lib/roles'
import { BLOG_STATUS_OPTIONS, BLOG_STATUS_LABELS } from '@/shared/lib/seed'
import { resolveSlug } from '@/shared/lib/slug'
import ImagePicker from '@/shared/components/ImagePicker'
import LocaleToggle from '@/shared/components/LocaleToggle'
import SlugField from '@/shared/components/SlugField'
import BlogBlocksEditor from '@/features/blog/components/BlogBlocksEditor'
import { filledBlocks, parseKeywords, todayISO } from '@/features/blog/lib/blog'

const OTHER_WRITER = '__other'

function cloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

export default function BlogForm({ initial, isNew, onClose }) {
  const { user, blogs, blogCategories, doctors, countryRecords, accessibleCountries, upsertBlog } = useAdmin()
  const [form, setForm] = useState(() => cloneSafe(initial))
  // Keywords are typed as comma-separated text and split on save, so typing
  // a space or a comma never fights the input.
  const [keywordText, setKeywordText] = useState(() => ({
    EN: (initial.keywords || []).join(', '),
    AR: (initial.keywordsAr || []).join(', '),
  }))
  const [otherWriter, setOtherWriter] = useState(() => !initial.authorDoctorId && !!initial.authorName)
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('EN')
  const originalId = isNew ? null : initial.id

  const isAr = locale === 'AR'
  const sfx = isAr ? 'Ar' : ''
  const dir = isAr ? 'rtl' : undefined
  const field = name => `${name}${sfx}`

  function set(name, value) { setForm(f => ({ ...f, [name]: value })) }

  // Same rule as doctors: only the user's countries can be ticked; a link to
  // another team's country is kept, shown ticked but read-only.
  const accessible = new Set(accessibleCountries.map(c => c.code))
  const lockedCountries = form.countries.filter(code => !accessible.has(code))
  const countryChoices = sortCountries([
    ...accessibleCountries,
    ...lockedCountries.map(code => countryRecords.find(c => c.code === code) || { code, name: code }),
  ])

  function toggleCountry(code) {
    if (!accessible.has(code)) return
    setForm(f => ({
      ...f,
      countries: f.countries.includes(code) ? f.countries.filter(c => c !== code) : [...f.countries, code],
    }))
  }

  function setWriter(value) {
    const other = value === OTHER_WRITER
    setOtherWriter(other)
    // Leaving "Someone else…" drops the typed name, so a hidden name can't be saved.
    setForm(f => ({ ...f, authorDoctorId: other ? '' : value, authorName: other ? f.authorName : '' }))
  }

  function submit(e) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return setError('Title is required.')
    if (!form.excerpt.trim()) return setError('Excerpt is required — it shows on the blog cards.')
    if (!filledBlocks(form.body).length) return setError('Write at least one paragraph.')
    const authorName = form.authorName.trim()
    if (!form.authorDoctorId && !authorName) return setError('Pick a doctor or enter the writer’s name.')

    const arParts = [form.titleAr.trim(), form.excerptAr.trim(), filledBlocks(form.bodyAr).length > 0]
    if (arParts.some(Boolean) && !arParts.every(Boolean)) {
      return setError('For the Arabic version, fill in the title, excerpt and article — or leave all three empty.')
    }
    if (!isSuperAdmin(user) && form.countries.length === 0) {
      return setError('Pick at least one country for this post.')
    }

    const { slug, error: slugError } = resolveSlug(
      form.slug, title, blogs.filter(b => b.id !== originalId).map(b => b.slug),
    )
    if (slugError) return setError(slugError)

    upsertBlog({
      ...form,
      // The id stays fixed once set, so a later slug change is an in-place edit.
      id: form.id || slug,
      slug,
      title,
      authorName: form.authorDoctorId ? '' : authorName,
      // Publishing with no date means today.
      publishedAt: form.status === 'published' && !form.publishedAt ? todayISO() : form.publishedAt,
      body: filledBlocks(form.body),
      bodyAr: filledBlocks(form.bodyAr),
      keywords: parseKeywords(keywordText.EN),
      keywordsAr: parseKeywords(keywordText.AR),
    }, originalId)
    onClose()
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New post' : 'Edit post'}</h1>
          <p className="ad-view-sub">{isNew ? 'Write an article for the website’s blog.' : `/blogs/${form.slug}`}</p>
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
            English is required. Fill in the Arabic title, excerpt and article to add an Arabic version.
          </p>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'العنوان (Title)' : 'Title *'}</span>
            <input className="ad-input" dir={dir} value={form[field('title')]}
              onChange={e => set(field('title'), e.target.value)}
              placeholder={isAr ? '' : 'e.g. What to expect from your first laser session'} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">{isAr ? 'المقتطف (Excerpt)' : 'Excerpt *'}</span>
            <textarea className="ad-input ad-textarea" rows={2} dir={dir} value={form[field('excerpt')]}
              onChange={e => set(field('excerpt'), e.target.value)}
              placeholder={isAr ? '' : 'One or two sentences — shown on the blog cards and under the title.'} />
          </label>
          <div className="ad-field">
            <span className="ad-field-label">{isAr ? 'المقال (Article)' : 'Article *'}</span>
            <BlogBlocksEditor key={locale} blocks={form[field('body')]} dir={dir}
              onChange={v => set(field('body'), v)} />
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Details</legend>
          <div className="ad-field">
            <span className="ad-field-label">Cover image</span>
            <ImagePicker value={form.image} onChange={v => set('image', v)} ratio={16 / 9}
              hint="Shown 4:3 on blog cards, 16:9 as the featured post and 16:7 atop the article. Use a landscape 16:9 image about 1600 × 900 px and keep the subject in the centre — the edges get trimmed." />
          </div>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Writer *</span>
              <select className="ad-input" value={otherWriter ? OTHER_WRITER : form.authorDoctorId}
                onChange={e => setWriter(e.target.value)}>
                <option value="">— pick a doctor —</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                <option value={OTHER_WRITER}>Someone else…</option>
              </select>
              <span className="ad-field-hint">A doctor’s post links to their profile and offers a consultation.</span>
            </label>
            {otherWriter && (
              <label className="ad-field">
                <span className="ad-field-label">Writer’s name *</span>
                <input className="ad-input" value={form.authorName}
                  onChange={e => set('authorName', e.target.value)} placeholder="e.g. Kaya editorial team" />
              </label>
            )}
            <label className="ad-field">
              <span className="ad-field-label">Topic</span>
              <select className="ad-input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">— none —</option>
                {blogCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="ad-field-hint">The website’s filter chips. Manage them under Topics.</span>
            </label>
            <SlugField value={form.slug} source={form.title} onChange={v => set('slug', v)} />
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
              <span className="ad-field-hint">Left empty, publishing sets it to today. A future date waits until then.</span>
            </label>
          </div>
          <label className={`ad-check${form.featured ? ' active' : ''}`}>
            <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
            Feature this post at the top of the blog
          </label>
          <div className="ad-field">
            <span className="ad-field-label">Countries</span>
            <div className="ad-check-grid">
              {countryChoices.map(c => {
                const isLocked = !accessible.has(c.code)
                return (
                  <label key={c.code} className={`ad-check${form.countries.includes(c.code) ? ' active' : ''}`}
                    title={isLocked ? 'Managed by another country team' : undefined}>
                    <input type="checkbox" checked={form.countries.includes(c.code)} disabled={isLocked}
                      onChange={() => toggleCountry(c.code)} />
                    {c.name}
                  </label>
                )
              })}
            </div>
            {lockedCountries.length > 0 && (
              <span className="ad-field-hint">
                {lockedCountries.join(', ')} {lockedCountries.length === 1 ? 'is' : 'are'} managed by another country team.
              </span>
            )}
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Search engines</legend>
          <p className="ad-fieldset-hint">
            All optional — anything left empty falls back to the title, excerpt and cover image.
            Text fields follow the English / العربية switch above.
          </p>
          <label className="ad-field ad-w-xl">
            <span className="ad-field-label">{isAr ? 'Meta title (Arabic)' : 'Meta title'}</span>
            <input className="ad-input" dir={dir} value={form[field('metaTitle')]}
              placeholder={form[field('title')] ? `${form[field('title')]} | Kaya` : ''}
              onChange={e => set(field('metaTitle'), e.target.value)} />
          </label>
          <label className="ad-field ad-w-xl">
            <span className="ad-field-label">{isAr ? 'Meta description (Arabic)' : 'Meta description'}</span>
            <textarea className="ad-input ad-textarea" rows={3} dir={dir} value={form[field('metaDescription')]}
              onChange={e => set(field('metaDescription'), e.target.value)} />
            <span className="ad-field-hint">{form[field('metaDescription')].length} / 160 characters recommended</span>
          </label>
          <label className="ad-field ad-w-xl">
            <span className="ad-field-label">{isAr ? 'Keywords (Arabic)' : 'Keywords'}</span>
            <input className="ad-input" dir={dir} value={keywordText[locale]}
              onChange={e => setKeywordText(k => ({ ...k, [locale]: e.target.value }))}
              placeholder={isAr ? '' : 'e.g. pigmentation, sunscreen, melasma'} />
            <span className="ad-field-hint">Separate with commas.</span>
          </label>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'Social share title (Arabic)' : 'Social share title'}</span>
              <input className="ad-input" dir={dir} value={form[field('ogTitle')]}
                onChange={e => set(field('ogTitle'), e.target.value)} placeholder="defaults to the meta title" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">{isAr ? 'Social share text (Arabic)' : 'Social share text'}</span>
              <input className="ad-input" dir={dir} value={form[field('ogDescription')]}
                onChange={e => set(field('ogDescription'), e.target.value)} placeholder="defaults to the meta description" />
            </label>
          </div>
          <div className="ad-field">
            <span className="ad-field-label">Social share image</span>
            <ImagePicker value={form.ogImage} onChange={v => set('ogImage', v)} ratio={1200 / 630}
              hint="Preview when the article is shared on social media and messaging apps (not shown on the site). Use 1200 × 630 px. Defaults to the cover image." />
          </div>
          <label className="ad-field ad-w-xl">
            <span className="ad-field-label">Canonical URL</span>
            <input className="ad-input" value={form.canonicalUrl} onChange={e => set('canonicalUrl', e.target.value)}
              placeholder={`/blogs/${form.slug || '…'}/`} />
            <span className="ad-field-hint">Only if this article first appeared elsewhere.</span>
          </label>
          <label className={`ad-check${form.noIndex ? ' active' : ''}`}>
            <input type="checkbox" checked={form.noIndex} onChange={e => set('noIndex', e.target.checked)} />
            Hide from search engines (noindex)
          </label>
        </fieldset>
      </div>
    </form>
  )
}
