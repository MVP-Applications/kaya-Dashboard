'use client'
import { useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ReorderCell from '@/shared/components/ReorderCell'
import SlugField from '@/shared/components/SlugField'
import { emptyBlogCategory } from '@/shared/lib/seed'
import { resolveSlug } from '@/shared/lib/slug'

/**
 * Blog topics — the filter chips on the website's blog. Shared by every
 * country, so only admins can change them; staff just pick one per post.
 * Order here is the order the chips appear in.
 */
export default function BlogCategoriesPanel() {
  const { blogs, blogCategories, upsertBlogCategory, deleteBlogCategory, allowed } = useAdmin()
  // Counted from the posts as they are now, so it stays right as posts change topic.
  const postCount = id => blogs.filter(b => b.categoryId === id).length
  const canManage = allowed('delete')
  // The row being edited ('new' for the add row) and its unsaved draft — local, like any form draft.
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyBlogCategory())
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)

  function start(c) {
    setEditing(c ? c.id : 'new')
    setDraft(c ? { ...c } : emptyBlogCategory())
    setError('')
  }

  function save(e) {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) return setError('English name is required.')
    const originalId = editing === 'new' ? null : editing
    const { slug, error: slugError } = resolveSlug(
      draft.slug, name, blogCategories.filter(c => c.id !== originalId).map(c => c.slug),
    )
    if (slugError) return setError(slugError)
    upsertBlogCategory({ ...draft, id: draft.id || slug, slug, name, nameAr: draft.nameAr.trim() }, originalId)
    setEditing(null)
  }

  const editor = (
    <form className="ad-blog-topic-form" onSubmit={save}>
      {error && <div className="ad-form-error">{error}</div>}
      <div className="ad-grid2">
        <label className="ad-field">
          <span className="ad-field-label">Name *</span>
          <input className="ad-input" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="e.g. Skin" autoFocus />
        </label>
        <label className="ad-field">
          <span className="ad-field-label">الاسم (Arabic name)</span>
          <input className="ad-input" dir="rtl" value={draft.nameAr}
            onChange={e => setDraft(d => ({ ...d, nameAr: e.target.value }))} />
        </label>
        <SlugField value={draft.slug} source={draft.name} onChange={v => setDraft(d => ({ ...d, slug: v }))} />
      </div>
      <div className="ad-editor-actions">
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
        <button type="submit" className="ad-btn ad-btn--primary ad-btn--sm">{editing === 'new' ? 'Add topic' : 'Save topic'}</button>
      </div>
    </form>
  )

  return (
    <>
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Arabic</th>
              <th>Posts</th>
              {canManage && <th>Order</th>}
              {canManage && <th className="ad-th-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {blogCategories.map((c, i) => (
              editing === c.id ? (
                <tr key={c.id}><td colSpan={5}>{editor}</td></tr>
              ) : (
                <tr key={c.id}>
                  <td>
                    <span className="ad-cell-name">{c.name}</span>
                    <span className="ad-cell-slug">?category={c.slug}</span>
                  </td>
                  <td dir="rtl">{c.nameAr || <span className="ad-muted">—</span>}</td>
                  <td>{postCount(c.id)}</td>
                  {canManage && (
                    <td>
                      <ReorderCell collection="blogCategories" itemKey={c.id} index={i}
                        total={blogCategories.length} disabled={editing !== null} />
                    </td>
                  )}
                  {canManage && (
                    <td className="ad-td-actions">
                      <button type="button" className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => start(c)}>Edit</button>
                      <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setConfirm(c)}>Delete</button>
                    </td>
                  )}
                </tr>
              )
            ))}
            {blogCategories.length === 0 && editing !== 'new' && (
              <tr><td colSpan={5} className="ad-empty">No topics yet.</td></tr>
            )}
            {editing === 'new' && <tr><td colSpan={5}>{editor}</td></tr>}
          </tbody>
        </table>
      </div>
      {canManage
        ? editing === null && (
          <button type="button" className="ad-btn ad-btn--soft ad-blog-topic-add" onClick={() => start(null)}>
            + New topic
          </button>
        )
        : <p className="ad-field-hint">Topics are shared by every country — ask an admin to add or change one.</p>}

      {confirm && (
        <ConfirmDialog
          title="Delete topic?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteBlogCategory(confirm.id); setConfirm(null) }}
        >
          <strong>{confirm.name}</strong> will be removed from the website&apos;s filters.
          {postCount(confirm.id) > 0 && ` Its ${postCount(confirm.id)} post${postCount(confirm.id) === 1 ? '' : 's'} stay published, without a topic.`}
        </ConfirmDialog>
      )}
    </>
  )
}
