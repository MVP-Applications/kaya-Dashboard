'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import { emptyBlog, BLOG_STATUS_OPTIONS, BLOG_STATUS_LABELS } from '@/lib/admin/seed'
import BlogForm from './BlogForm'

export function formatBlogDate(day) {
  if (!day) return ''
  const d = new Date(`${day}T00:00:00`)
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : day
}

export default function BlogsView() {
  const { blogs, blogsError, deleteBlog, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  // Newest first; drafts (no date yet) above everything, since they're what
  // someone is most likely still working on.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return blogs
      .filter(b => !status || b.status === status)
      .filter(b => !q || `${b.title} ${b.writer} ${b.slug}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (b.publishedAt || '9999').localeCompare(a.publishedAt || '9999'))
  }, [blogs, query, status])

  const canDelete = allowed('delete')
  const canCreate = allowed('create')
  const published = blogs.filter(b => b.status === 'published').length

  if (editing) {
    return <BlogForm initial={editing.initial} isNew={editing.isNew} onClose={() => setEditing(null)} />
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Blog</h1>
          <p className="ad-view-sub">
            {blogsError
              ? 'Articles shown on the website’s blog.'
              : `${blogs.length} posts · ${published} published · showing ${filtered.length}`}
          </p>
        </div>
        {canCreate && !blogsError && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyBlog(), isNew: true })}>
            + New post
          </button>
        )}
      </div>

      {blogsError ? (
        <div className="ad-panel ad-blog-unavailable">
          <strong>Blog posts can&apos;t be loaded.</strong> {blogsError}
        </div>
      ) : (
        <>
          <div className="ad-toolbar">
            <input className="ad-input ad-search" placeholder="Search by title or writer…"
              value={query} onChange={e => setQuery(e.target.value)} />
            <select className="ad-input ad-filter" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {BLOG_STATUS_OPTIONS.map(s => <option key={s} value={s}>{BLOG_STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Writer</th>
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
                          <span className="ad-cell-name">{b.title}</span>
                          <span className="ad-cell-slug">/{b.slug}</span>
                        </span>
                      </div>
                    </td>
                    <td>{b.writer || <span className="ad-muted">—</span>}</td>
                    <td>
                      <span className={`ad-status ad-status--${b.status === 'published' ? 'booked' : 'closed'}`}>
                        <span className="ad-status-dot" />
                        {BLOG_STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                    <td>{formatBlogDate(b.publishedAt) || <span className="ad-muted">—</span>}</td>
                    <td className="ad-td-actions">
                      <button className="ad-btn ad-btn--soft ad-btn--sm"
                        onClick={() => setEditing({ initial: b, isNew: false })}>Edit</button>
                      {canDelete && (
                        <button className="ad-btn ad-btn--danger ad-btn--sm"
                          onClick={() => setConfirm(b)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="ad-empty">
                    {blogs.length === 0 ? 'No posts yet. Write one to start the blog.' : 'No posts match your filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete post?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteBlog(confirm.id); setConfirm(null) }}
        >
          This will permanently remove <strong>{confirm.title}</strong> from the
          website&apos;s blog.
        </ConfirmDialog>
      )}
    </div>
  )
}
