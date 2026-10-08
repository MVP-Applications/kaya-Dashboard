'use client'
import { BLOCK_TYPES, readingStats } from '@/features/blog/lib/blog'

/**
 * The article body as an ordered list of blocks — paragraphs, headings and
 * pull quotes, the three things the website's article page renders. Plain
 * text only: no HTML is stored, so nothing needs sanitising downstream.
 */
export default function BlogBlocksEditor({ blocks, onChange, dir }) {
  const list = blocks || []
  const stats = readingStats(list)

  const update = (i, patch) => onChange(list.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const remove = i => onChange(list.filter((_, j) => j !== i))
  const add = type => onChange([...list, { type, text: '' }])
  const move = (i, d) => {
    const next = [...list]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }

  return (
    <div className="ad-blog-blocks">
      {list.map((b, i) => (
        <div key={i} className={`ad-blog-block ad-blog-block--${b.type}`}>
          <div className="ad-blog-block-bar">
            <select className="ad-input ad-blog-block-type" value={b.type}
              onChange={e => update(i, { type: e.target.value })} aria-label="Block type">
              {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <span className="ad-reorder">
              <button type="button" className="ad-reorder-btn" onClick={() => move(i, -1)}
                disabled={i === 0} aria-label="Move up" title="Move up">↑</button>
              <button type="button" className="ad-reorder-btn" onClick={() => move(i, 1)}
                disabled={i === list.length - 1} aria-label="Move down" title="Move down">↓</button>
            </span>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => remove(i)}>
              Remove
            </button>
          </div>
          {b.type === 'h2'
            ? <input className="ad-input" dir={dir} value={b.text}
                onChange={e => update(i, { text: e.target.value })} placeholder="Section heading" />
            : <textarea className="ad-input ad-textarea" dir={dir} rows={b.type === 'quote' ? 2 : 5}
                value={b.text} onChange={e => update(i, { text: e.target.value })}
                placeholder={b.type === 'quote' ? 'A line worth pulling out' : 'Paragraph text'} />}
        </div>
      ))}
      <div className="ad-blog-blocks-add">
        {BLOCK_TYPES.map(t => (
          <button key={t.value} type="button" className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => add(t.value)}>
            + {t.label}
          </button>
        ))}
        <span className="ad-field-hint">
          {stats.words.toLocaleString('en-US')} words · about {stats.minutes} min read
        </span>
      </div>
    </div>
  )
}
