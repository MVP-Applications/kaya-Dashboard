'use client'
import { useEffect, useRef, useState } from 'react'
import { delta, fmtPct } from '@/lib/admin/analytics'

/**
 * Small chart kit for the dashboard — plain SVG/CSS, no chart library.
 *
 * Series colours are a validated categorical order (checked for colour-blind
 * separation), not the brand purple: --primary reads too grey to separate
 * from neighbouring hues. Assign them in this order, never by rank.
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100']
/** Ordinal steps of one hue, light → dark — for funnels and ordered stages. */
export const ORDINAL = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab']

// ── Stat tile ────────────────────────────────────────────────

/**
 * label · value · change vs previous period. `upIsGood` decides whether a
 * rise reads as good or bad; the arrow and sign carry direction, not colour alone.
 */
export function StatTile({ label, value, sub, current, previous, compare = true, upIsGood = true, onClick }) {
  const d = compare ? delta(current, previous) : null
  const tone = d == null || d === 0 ? 'flat' : (d > 0) === upIsGood ? 'good' : 'bad'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`ad-an-tile${onClick ? ' ad-an-tile--link' : ''}`} onClick={onClick}>
      <span className="ad-an-tile-lbl">{label}</span>
      <span className="ad-an-tile-val">{value}</span>
      {sub && <span className="ad-an-tile-sub">{sub}</span>}
      {compare && (
        <span className={`ad-an-delta ad-an-delta--${tone}`}>
          {d == null ? 'No prior data' : `${d > 0 ? '▲' : d < 0 ? '▼' : '■'} ${fmtPct(Math.abs(d))} vs previous`}
        </span>
      )}
    </Tag>
  )
}

// ── Trend (line) chart ───────────────────────────────────────

function niceMax(v) {
  if (v <= 0) return 4
  const exp = 10 ** Math.floor(Math.log10(v))
  const f = v / exp
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return step * exp
}

/** Track a container's width so the SVG draws at real pixels (crisp text). */
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/**
 * Line chart over time buckets, with a crosshair tooltip listing every
 * series at the hovered point. One y-axis only — callers split measures of
 * different scale (visits vs enquiries, AED vs OMR) into separate charts.
 *
 * series: [{ key, label, values: number[] }] — coloured by array position.
 */
export function TrendChart({ buckets, series, format = String, height = 190, colors = SERIES, empty = 'No activity in this period.' }) {
  const [wrapRef, width] = useWidth()
  const [hover, setHover] = useState(null)

  const pad = { top: 12, right: 12, bottom: 26, left: 44 }
  const w = Math.max(0, width)
  const innerW = Math.max(1, w - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const n = buckets.length
  const max = niceMax(Math.max(0, ...series.flatMap(s => s.values)))
  const allZero = series.every(s => s.values.every(v => !v))

  const x = i => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = v => pad.top + innerH - (v / max) * innerH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * max)
  // Roughly one x label per 80px, always including the last bucket.
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 80))))

  function pointAt(clientX) {
    const rect = wrapRef.current.getBoundingClientRect()
    const px = clientX - rect.left - pad.left
    return Math.max(0, Math.min(n - 1, Math.round((px / innerW) * (n - 1))))
  }

  function onKey(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover(h => Math.min(n - 1, (h ?? -1) + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHover(h => Math.max(0, (h ?? n) - 1)) }
    if (e.key === 'Escape') setHover(null)
  }

  return (
    <div className="ad-an-trend">
      {series.length > 1 && (
        <div className="ad-an-legend">
          {series.map((s, i) => (
            <span key={s.key} className="ad-an-legend-item">
              <span className="ad-an-key" style={{ background: colors[i] }} />{s.label}
            </span>
          ))}
        </div>
      )}
      <div
        ref={wrapRef}
        className="ad-an-plot"
        style={{ height }}
        tabIndex={0}
        role="img"
        aria-label={`${series.map(s => s.label).join(' and ')} over time. Use arrow keys to read values.`}
        onPointerMove={e => w && n && setHover(pointAt(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(h => h ?? n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
      >
        {w > 0 && (
          <svg width={w} height={height} aria-hidden="true">
            {ticks.map(t => (
              <g key={t}>
                <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} className="ad-an-gridline" />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="ad-an-axis">{format(t)}</text>
              </g>
            ))}
            {buckets.map((b, i) => ((i % every === 0 && n - 1 - i >= every / 2) || i === n - 1) && (
              <text key={b.start} x={x(i)} y={height - 8} textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'} className="ad-an-axis">
                {b.label}
              </text>
            ))}
            {series.length === 1 && n > 1 && (
              <path
                d={`M${x(0)},${y(0)} ${series[0].values.map((v, i) => `L${x(i)},${y(v)}`).join(' ')} L${x(n - 1)},${y(0)} Z`}
                fill={colors[0]} opacity="0.1"
              />
            )}
            {series.map((s, si) => (
              <polyline
                key={s.key}
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none" stroke={colors[si]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              />
            ))}
            {hover != null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} className="ad-an-cross" />
                {series.map((s, si) => (
                  <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={colors[si]} stroke="#fff" strokeWidth="2" />
                ))}
              </g>
            )}
          </svg>
        )}
        {allZero && <div className="ad-an-plot-empty">{empty}</div>}
        {hover != null && w > 0 && (
          <div
            className="ad-an-tip"
            // Beside the crosshair, flipping to its left past the midpoint, so it never covers the hovered point.
            style={x(hover) > w / 2 ? { right: w - x(hover) + 10 } : { left: x(hover) + 10 }}
          >
            <div className="ad-an-tip-hd">{buckets[hover].title}</div>
            {series.map((s, si) => (
              <div key={s.key} className="ad-an-tip-row">
                <span className="ad-an-tip-key" style={{ background: colors[si] }} />
                <strong>{format(s.values[hover])}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="ad-an-table">
        <summary>View as table</summary>
        <div className="ad-an-table-scroll">
          <table>
            <thead>
              <tr><th>Period</th>{series.map(s => <th key={s.key}>{s.label}</th>)}</tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={b.start}><td>{b.title}</td>{series.map(s => <td key={s.key}>{format(s.values[i])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

// ── Bar list ─────────────────────────────────────────────────

/**
 * Horizontal bars with the value at the tip. When `onSelect` is given each
 * row is a button that applies that value as a filter (drill-down); the
 * `active` row is marked so a second click can clear it.
 *
 * rows: [{ key, label, value, display?, note? }]
 */
export function BarList({ rows, format = String, color = SERIES[0], onSelect, active, limit = 8, empty = 'Nothing to show for this selection.' }) {
  const [expanded, setExpanded] = useState(false)
  if (!rows.length) return <p className="ad-an-empty">{empty}</p>
  const shown = expanded ? rows : rows.slice(0, limit)
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="ad-bars">
      {shown.map(r => {
        const inner = (
          <>
            <span className="ad-bar-label" title={r.label}>{r.label}</span>
            <span className="ad-bar-track">
              <span className="ad-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
            </span>
            <span className="ad-bar-value">{r.display ?? format(r.value)}</span>
            {r.note && <span className="ad-an-bar-note">{r.note}</span>}
          </>
        )
        return onSelect ? (
          <button
            key={r.key}
            type="button"
            className={`ad-bar-row ad-an-bar-btn${active === r.key ? ' active' : ''}`}
            onClick={() => onSelect(active === r.key ? '' : r.key)}
            title={active === r.key ? 'Click to clear this filter' : `Filter by ${r.label}`}
          >
            {inner}
          </button>
        ) : (
          <div key={r.key} className="ad-bar-row">{inner}</div>
        )
      })}
      {rows.length > limit && (
        <button type="button" className="ad-an-more" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  )
}

// ── Donut ────────────────────────────────────────────────────

/** Build a conic-gradient string from weighted segments, with a thin surface gap between them. */
function conic(segments, total) {
  if (!total) return 'var(--mist)'
  let acc = 0
  const gap = segments.filter(s => s.value).length > 1 ? 0.4 : 0
  const stops = segments.flatMap(s => {
    const start = (acc / total) * 100
    acc += s.value
    const end = (acc / total) * 100
    if (!s.value) return []
    return [`${s.color} ${start}% ${Math.max(start, end - gap)}%`, `#fff ${Math.max(start, end - gap)}% ${end}%`]
  })
  return `conic-gradient(${stops.join(', ')})`
}

export function Donut({ segments, caption = 'items', format = String }) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  return (
    <div className="ad-donut-wrap">
      <div className="ad-donut" style={{ background: conic(segments, total) }} role="img"
        aria-label={segments.map(s => `${s.label}: ${format(s.value)}`).join(', ')}>
        <div className="ad-donut-hole">
          <span className="ad-donut-total">{format(total)}</span>
          <span className="ad-donut-cap">{caption}</span>
        </div>
      </div>
      <div className="ad-legend">
        {segments.map(s => (
          <div key={s.label} className="ad-legend-item">
            <span className="ad-legend-dot" style={{ background: s.color }} />
            <span className="ad-legend-lbl">{s.label}</span>
            <span className="ad-legend-val">{format(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Funnel ───────────────────────────────────────────────────

/** Ordered stages; each shows its count and the step-on rate from the stage before. */
export function Funnel({ steps, format = String }) {
  const max = Math.max(1, steps[0]?.value || 0)
  return (
    <div className="ad-an-funnel">
      {steps.map((s, i) => {
        const prev = steps[i - 1]
        return (
          <div key={s.key} className="ad-an-funnel-row">
            <span className="ad-an-funnel-lbl">{s.label}</span>
            <span className="ad-an-funnel-track">
              <span className="ad-an-funnel-fill" style={{ width: `${Math.max(1.5, (s.value / max) * 100)}%`, background: ORDINAL[Math.min(i, ORDINAL.length - 1)] }} />
            </span>
            <span className="ad-an-funnel-val">{format(s.value)}</span>
            <span className="ad-an-funnel-rate">{prev ? `${fmtPct(prev.value ? s.value / prev.value : null)} of ${prev.label.toLowerCase()}` : ''}</span>
          </div>
        )
      })}
    </div>
  )
}
