'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import MissingRecord from '@/shared/components/MissingRecord'
import { emptyBlog, BLOG_STATUS_OPTIONS, BLOG_STATUS_LABELS } from '@/shared/lib/seed'
import { useQuery, useQueryParam, useQueryText } from '@/shared/hooks/useUrlState'
import { useCountryFilter } from '@/shared/hooks/useCountryFilter'
import BlogForm from '@/features/blog/components/BlogForm'
import BlogCategoriesPanel from '@/features/blog/components/BlogCategoriesPanel'
import { formatBlogDate } from '@/features/blog/lib/blog'

export default function BlogsView() {
  const { blogs, blogCategories, blogsError, doctors, deleteBlog, allowed, dataVersion } = useAdmin()
  // Tab, filters and the open post live in the URL (?tab, ?q, ?status,
  // ?category, ?edit=<id>, ?new=1) so a refresh or a new tab reopens them.
  const { get, set, href } = useQuery()
  const [query, setQuery] = useQueryText('q')
  const [status, setStatus] = useQueryParam('status')
  const [category, setCategory] = useQueryParam('category')
  // ?country is shared with the top-bar switcher; empty falls back to it.
  const [country, setCountry, countryOptions] = useCountryFilter()
  const tab = get('tab') === 'topics' ? 'topics' : 'posts'
  const editId = get('edit')
  const isNew = get('new') === '1'
  const newBlog = useMemo(() => (isNew ? emptyBlog() : null), [isNew])
  const [confirm, setConfirm] = useState(null)

  const doctorNames = useMemo(() => new Map(doctors.map(d => [d.id, d.name])), [doctors])
  const writerOf = b => doctorNames.get(b.authorDoctorId) || b.authorName || ''
  const topicOf = b => blogCategories.find(c => c.id === b.categoryId)?.name || ''

  // Drafts (no date yet) first — they're what someone is still working on —
  // then newest first.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return blogs
      .filter(b => !status || b.status === status)
      .filter(b => !category || b.categoryId === category)
      .filter(b => !country || (b.countries || []).includes(country))
      .filter(b => !q || `${b.title} ${b.slug} ${doctorNames.get(b.authorDoctorId) || b.authorName}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (b.publishedAt || '9999').localeCompare(a.publishedAt || '9999'))
  }, [blogs, doctorNames, query, status, category, country])

  const canDelete = allowed('delete')
  const canCreate = allowed('create')
  const published = blogs.filter(b => b.status === 'published').length

  const closeEditor = () => set({ edit: '', new: '' })

  if (isNew) {
    return <BlogForm key="new" initial={newBlog} isNew onClose={closeEditor} />
  }
  if (editId) {
    const record = blogs.find(b => String(b.id) === editId)
    if (!record) {
      return <MissingRecord loading={dataVersion === 0} label="post" backHref={href({ edit: '' })} />
    }
    return <BlogForm key={editId} initial={record} isNew={false} onClose={closeEditor} />
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Blog</h1>
          <p className="ad-view-sub">
            {blogsError
              ? 'Articles shown on the website’s blog.'
              : tab === 'topics'
                ? `${blogCategories.length} topics`
                : `${blogs.length} posts · ${published} published · showing ${filtered.length}`}
          </p>
        </div>
        {canCreate && !blogsError && tab === 'posts' && (
          <Link className="ad-btn ad-btn--primary" href={href({ new: 1 })}>+ New post</Link>
        )}
      </div>

      {blogsError ? (
        <div className="ad-panel ad-blog-unavailable">
          <strong>Blog posts can&apos;t be loaded.</strong> {blogsError}
        </div>
      ) : (
        <>
          <div className="ad-tu-seg ad-blog-tabs" role="tablist">
            <Link role="tab" aria-selected={tab === 'posts'} className={`ad-tu-seg-btn${tab === 'posts' ? ' active' : ''}`}
              href={href({ tab: '' })}>Posts</Link>
            <Link role="tab" aria-selected={tab === 'topics'} className={`ad-tu-seg-btn${tab === 'topics' ? ' active' : ''}`}
              href={href({ tab: 'topics', q: '', status: '', category: '' })}>Topics</Link>
          </div>

          {tab === 'topics' ? <BlogCategoriesPanel /> : (
            <>
              <div className="ad-toolbar">
                <input className="ad-input ad-search" placeholder="Search by title or writer…"
                  value={query} onChange={e => setQuery(e.target.value)} />
                <select className="ad-input ad-filter" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  {BLOG_STATUS_OPTIONS.map(s => <option key={s} value={s}>{BLOG_STATUS_LABELS[s]}</option>)}
                </select>
                <select className="ad-input ad-filter" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">All topics</option>
                  {blogCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="ad-input ad-filter" value={country} onChange={e => setCountry(e.target.value)}>
                  <option value="">All countries</option>
                  {countryOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Writer</th>
                      <th>Topic</th>
                      <th>Status</th>
                      <th>Published</th>
                      <th className="ad-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(b => (
                      <tr key={b.id}>
                        <td>
                          <div className="ad-doc-cell">
                            <span className="ad-blog-thumb">
                              {b.image ? <img src={b.image} alt="" /> : <span aria-hidden="true">✎</span>}
                            </span>
                            <span>
                              <span className="ad-cell-name">
                                {b.title}
                                {b.featured && <span className="ad-badge ad-blog-featured">Featured</span>}
                              </span>
                              <span className="ad-cell-slug">/blogs/{b.slug}</span>
                            </span>
                          </div>
                        </td>
                        <td>{writerOf(b) || <span className="ad-muted">—</span>}</td>
                        <td>{topicOf(b) || <span className="ad-muted">—</span>}</td>
                        <td>
                          <span className={`ad-status ad-status--${b.status === 'published' ? 'booked' : 'closed'}`}>
                            <span className="ad-status-dot" />
                            {BLOG_STATUS_LABELS[b.status] || b.status}
                          </span>
                        </td>
                        <td>{formatBlogDate(b.publishedAt) || <span className="ad-muted">—</span>}</td>
                        <td className="ad-td-actions">
                          <Link className="ad-btn ad-btn--soft ad-btn--sm" href={href({ edit: b.id })}>Edit</Link>
                          {canDelete && (
                            <button className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setConfirm(b)}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="ad-empty">
                        {blogs.length === 0 ? 'No posts yet. Write one to start the blog.' : 'No posts match your filters.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete post?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteBlog(confirm.id); setConfirm(null) }}
        >
          This will permanently remove <strong>{confirm.title}</strong> from the website&apos;s blog.
        </ConfirmDialog>
      )}
    </div>
  )
}
