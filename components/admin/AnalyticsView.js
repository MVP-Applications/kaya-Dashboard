'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import { fetchAnalyticsData } from '@/lib/admin/store'
import {
  buildAnalytics, filterOptions, ignoredFilters, activeFilterKeys,
  DEFAULT_FILTERS, RANGE_PRESETS, FILTER_LABELS,
  fmtNum, fmtCompact, fmtMoney, fmtPct, fmtHours,
} from '@/lib/admin/analytics'
import { REQUEST_SOURCE_LABELS } from '@/lib/admin/seed'
import { COUNTRY_LABELS, COUNTRY_CURRENCY } from '@/lib/countries'
import { PAGES, CLINIC_COUNTRIES } from '@/lib/admin/content'
import { StatTile, TrendChart, BarList, Donut, Funnel, SERIES } from './charts'

// Per-viewer convenience only — the screen works the same without it.
const FILTERS_KEY = 'kaya_admin_analytics_filters_v1'

function loadFilters() {
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY)
    const stored = raw ? JSON.parse(raw) : null
    if (!stored || typeof stored !== 'object') return DEFAULT_FILTERS
    const out = { ...DEFAULT_FILTERS }
    for (const k of Object.keys(DEFAULT_FILTERS)) {
      if (typeof stored[k] === typeof DEFAULT_FILTERS[k]) out[k] = stored[k]
    }
    return out
  } catch {
    return DEFAULT_FILTERS
  }
}

function saveFilters(filters) {
  try { window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)) } catch { /* ignore */ }
}

const sourceLabel = s => REQUEST_SOURCE_LABELS[s] || s

/** "AED 10,500 · SAR 3,570" — currencies side by side, never summed. */
function moneyList(amounts) {
  if (!amounts.length) return '—'
  return amounts.map(a => fmtMoney(a.currency, a.value)).join(' · ')
}

function Section({ title, sub, children }) {
  return (
    <section className="ad-an-section">
      <div className="ad-an-section-head">
        <h2 className="ad-an-section-title">{title}</h2>
        {sub && <p className="ad-an-section-sub">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

function Panel({ title, note, children, wide }) {
  return (
    <div className={`ad-panel ad-an-panel${wide ? ' ad-an-panel--wide' : ''}`}>
      <div className="ad-panel-head">
        <h3 className="ad-panel-title">{title}</h3>
        {note && <p className="ad-an-note">{note}</p>}
      </div>
      {children}
    </div>
  )
}

/** "Doctor filter doesn't apply here" — shown instead of silently ignoring it. */
function scopeNote(filters, scope) {
  const ignored = ignoredFilters(filters, scope)
  if (!ignored.length) return null
  return `${ignored.join(', ')} ${ignored.length > 1 ? "filters don't" : "filter doesn't"} apply here.`
}

// ── Filter bar ───────────────────────────────────────────────

function FilterBar({ filters, setFilters, options }) {
  const set = patch => setFilters(f => ({ ...f, ...patch }))

  return (
    <div className="ad-an-filters">
      <div className="ad-an-filter-row">
        <select className="ad-input ad-filter" value={filters.range} onChange={e => set({ range: e.target.value })} aria-label="Date range">
          {RANGE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {filters.range === 'custom' && (
          <>
            <input type="date" className="ad-input ad-an-date" value={filters.from} max={filters.to || undefined}
              onChange={e => set({ from: e.target.value })} aria-label="From" />
            <input type="date" className="ad-input ad-an-date" value={filters.to} min={filters.from || undefined}
              onChange={e => set({ to: e.target.value })} aria-label="To" />
          </>
        )}
        <label className="ad-an-compare">
          <input type="checkbox" checked={filters.compare} onChange={e => set({ compare: e.target.checked })} />
          Compare to previous period
        </label>
      </div>

      <div className="ad-an-filter-row">
        <select className="ad-input ad-filter" value={filters.country} aria-label="Country"
          onChange={e => set({ country: e.target.value, city: '', doctor: '' })}>
          <option value="">All countries</option>
          {options.countries.map(c => <option key={c} value={c}>{COUNTRY_LABELS[c] || c}</option>)}
        </select>
        <select className="ad-input ad-filter" value={filters.city} onChange={e => set({ city: e.target.value })} aria-label="City">
          <option value="">All cities</option>
          {options.cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="ad-input ad-filter" value={filters.area} aria-label="Treatment area"
          onChange={e => set({ area: e.target.value, treatment: '' })}>
          <option value="">All treatment areas</option>
          {options.areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="ad-input ad-filter" value={filters.treatment} onChange={e => set({ treatment: e.target.value })} aria-label="Treatment">
          <option value="">All treatments</option>
          {options.treatments.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="ad-input ad-filter" value={filters.doctor} onChange={e => set({ doctor: e.target.value })} aria-label="Doctor">
          <option value="">All doctors</option>
          {options.doctors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="ad-input ad-filter" value={filters.source} onChange={e => set({ source: e.target.value })} aria-label="Source">
          <option value="">All sources</option>
          {options.sources.map(s => <option key={s} value={s}>{sourceLabel(s)}</option>)}
        </select>
        <select className="ad-input ad-filter" value={filters.offer} onChange={e => set({ offer: e.target.value })} aria-label="Voucher offer">
          <option value="">All voucher offers</option>
          {options.offers.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </div>
    </div>
  )
}

function FilterChips({ filters, setFilters, options }) {
  const keys = activeFilterKeys(filters)
  if (!keys.length) return null
  const display = k => {
    const v = filters[k]
    if (k === 'country') return COUNTRY_LABELS[v] || v
    if (k === 'source') return sourceLabel(v)
    if (k === 'offer') return options.offers.find(o => o.id === v)?.title || v
    return v
  }
  const clear = k => setFilters(f => ({
    ...f, [k]: '',
    ...(k === 'country' ? { city: '', doctor: '' } : {}),
    ...(k === 'area' ? { treatment: '' } : {}),
  }))
  return (
    <div className="ad-an-chips">
      {keys.map(k => (
        <button key={k} type="button" className="ad-an-chip" onClick={() => clear(k)} aria-label={`Remove ${FILTER_LABELS[k]} filter`}>
          <span className="ad-an-chip-k">{FILTER_LABELS[k]}:</span> {display(k)} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
        onClick={() => setFilters(f => ({ ...DEFAULT_FILTERS, range: f.range, from: f.from, to: f.to, compare: f.compare }))}>
        Reset filters
      </button>
    </div>
  )
}

// ── Content health (moved here from Overview) ────────────────

function ContentHealth() {
  const { services, verticals, doctors, reviews, vouchers, locations } = useAdmin()

  const byVertical = verticals.map(v => ({
    key: v.id, label: v.label,
    value: services.filter(s => (s.verticals || []).includes(v.id)).length,
  }))
  const doctorsByCountry = CLINIC_COUNTRIES.map(c => ({
    key: c, label: c, value: doctors.filter(d => (d.countries || []).some(x => String(x).toLowerCase() === c.toLowerCase())).length,
  }))
  const clinicsByCountry = CLINIC_COUNTRIES.map(c => ({
    key: c, label: c, value: locations.filter(l => l.country === c).length,
  }))
  const mix = [
    { label: 'Treatments', value: services.length, color: SERIES[0] },
    { label: 'Doctors', value: doctors.length, color: SERIES[1] },
    { label: 'Vouchers', value: vouchers.length, color: SERIES[2] },
    { label: 'Reviews', value: reviews.length, color: SERIES[3] },
  ]
  const withBadge = services.filter(s => s.badge).length
  const withMedia = reviews.filter(r => r.before || r.after).length
  const featuredPct = services.length ? Math.round((withBadge / services.length) * 100) : 0
  const mediaPct = reviews.length ? Math.round((withMedia / reviews.length) * 100) : 0

  return (
    <Section title="Content health" sub="What's published right now. Not affected by the filters above.">
      <div className="ad-an-grid">
        <Panel title="Treatments by vertical"><BarList rows={byVertical} limit={12} /></Panel>
        <Panel title="Content mix"><Donut segments={mix} /></Panel>
        <Panel title="Doctors by country"><BarList rows={doctorsByCountry} /></Panel>
        <Panel title="Clinics by country"><BarList rows={clinicsByCountry} /></Panel>
        <Panel title="At a glance">
          <div className="ad-rings">
            <div className="ad-ring-card">
              <div className="ad-ring" style={{ background: `conic-gradient(${SERIES[0]} ${featuredPct}%, var(--mist) 0)` }}>
                <span className="ad-ring-pct">{featuredPct}%</span>
              </div>
              <div className="ad-ring-cap"><strong>{withBadge}</strong> featured treatments</div>
            </div>
            <div className="ad-ring-card">
              <div className="ad-ring" style={{ background: `conic-gradient(${SERIES[1]} ${mediaPct}%, var(--mist) 0)` }}>
                <span className="ad-ring-pct">{mediaPct}%</span>
              </div>
              <div className="ad-ring-cap"><strong>{withMedia}</strong> reviews with before/after</div>
            </div>
          </div>
        </Panel>
        <Panel title="Sections per website page">
          <BarList rows={PAGES.map(p => ({ key: p.id, label: p.label, value: p.sections.length }))} limit={12} />
        </Panel>
      </div>
    </Section>
  )
}

// ── Screen ───────────────────────────────────────────────────

export default function AnalyticsView() {
  const { allowed } = useAdmin()
  const canView = allowed('viewAnalytics')

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [restored, setRestored] = useState(false)

  // Restore after mount — reading storage during render would mismatch hydration.
  useEffect(() => {
    setFilters(loadFilters())
    setRestored(true)
  }, [])
  useEffect(() => { if (restored) saveFilters(filters) }, [filters, restored])

  useEffect(() => {
    if (!canView) return
    let alive = true
    fetchAnalyticsData()
      .then(d => { if (alive) { setData(d); setError('') } })
      .catch(e => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [canView])

  const options = useMemo(() => filterOptions(data, filters), [data, filters])
  const a = useMemo(() => (data ? buildAnalytics(data, filters) : null), [data, filters])
  const set = patch => setFilters(f => ({ ...f, ...patch }))

  // The permission check in AdminShell hides the nav item; this is the second
  // line, in case the view is reached another way. The backend's own guard
  // is the real boundary once an analytics endpoint exists.
  if (!canView) {
    return (
      <div className="ad-view">
        <div className="ad-view-head"><div><h1 className="ad-view-title">Analytics</h1></div></div>
        <div className="ad-panel ad-an-blocked">Analytics is available to Administrators only.</div>
      </div>
    )
  }

  const compare = filters.compare
  const k = a?.kpis

  return (
    <div className="ad-view ad-an">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Analytics</h1>
          <p className="ad-view-sub">Enquiries, bookings, voucher sales and website traffic across every market.</p>
        </div>
        {data?.sample && (
          <span className="ad-an-sample" title="Generated for preview mode — not real figures">Sample data</span>
        )}
      </div>

      {error && (
        <div className="ad-panel ad-an-blocked">
          <strong>Analytics couldn&apos;t load.</strong> {error}
        </div>
      )}

      {!error && (
        <>
          <FilterBar filters={filters} setFilters={setFilters} options={options} />
          <FilterChips filters={filters} setFilters={setFilters} options={options} />
        </>
      )}

      {!error && !a && <div className="ad-panel ad-an-loading">Loading analytics…</div>}

      {a && (
        <div className="ad-an-body">
          {/* ── Headline ── */}
          <div className="ad-an-tiles">
            {k.revenue.length ? k.revenue.map(r => (
              <StatTile key={r.currency} label={`Revenue · ${r.currency}`} value={fmtMoney(r.currency, r.value)}
                sub="Voucher sales" current={r.value} previous={r.prev} compare={compare} />
            )) : (
              <StatTile label="Revenue" value="—" sub="No paid vouchers in this period" compare={false} />
            )}
            <StatTile label="Bookings" value={fmtNum(k.bookings.value)} current={k.bookings.value} previous={k.bookings.prev} compare={compare} />
            <StatTile label="Vouchers sold" value={fmtNum(k.vouchersSold.value)} current={k.vouchersSold.value} previous={k.vouchersSold.prev} compare={compare} />
            <StatTile label="Website visits" value={fmtCompact(k.visits.value)} current={k.visits.value} previous={k.visits.prev} compare={compare} />
            <StatTile label="Enquiries" value={fmtNum(k.enquiries.value)} current={k.enquiries.value} previous={k.enquiries.prev} compare={compare} />
            <StatTile label="Enquiry → booking" value={fmtPct(k.conversion.value)} current={k.conversion.value} previous={k.conversion.prev} compare={compare} />
          </div>

          {/* ── Revenue ── */}
          <Section title="Revenue" sub="From paid and fulfilled vouchers. Each currency is shown on its own, never converted or combined.">
            <div className="ad-an-grid">
              {a.currencies.length ? a.currencies.map(c => (
                <Panel key={c} title={`Revenue over time · ${c}`} note={scopeNote(filters, 'vouchers')}>
                  <TrendChart buckets={a.buckets} series={[{ key: c, label: `Revenue (${c})`, values: a.trends.revenue[c] }]}
                    format={v => fmtCompact(v)} />
                </Panel>
              )) : (
                <Panel title="Revenue over time"><p className="ad-an-empty">No paid vouchers in this period.</p></Panel>
              )}
              <Panel title="Revenue by country" note={scopeNote(filters, 'vouchers')}>
                {a.revenueByCountry.length ? (
                  <table className="ad-an-mini">
                    <thead><tr><th>Country</th><th>Vouchers</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {a.revenueByCountry.map(r => (
                        <tr key={r.country}>
                          <td><button type="button" className="ad-an-link" onClick={() => set({ country: filters.country === r.country ? '' : r.country, city: '', doctor: '' })}>{COUNTRY_LABELS[r.country] || r.country}</button></td>
                          <td>{fmtNum(r.orders)}</td>
                          <td>{moneyList(r.amounts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="ad-an-empty">No paid vouchers in this period.</p>}
              </Panel>
            </div>
          </Section>

          {/* ── Vouchers ── */}
          <Section title="Purchased vouchers" sub="Sold = paid or fulfilled. Status counts include every request made in the period.">
            <div className="ad-an-grid">
              <Panel title="Vouchers sold over time" note={scopeNote(filters, 'vouchers')}>
                <TrendChart buckets={a.buckets} series={[{ key: 'sold', label: 'Vouchers sold', values: a.trends.vouchersSold }]} format={fmtNum} />
              </Panel>
              <Panel title="Top offers" note={scopeNote(filters, 'vouchers') || 'Click an offer to filter by it.'}>
                <BarList
                  rows={a.vouchers.topOffers.map(o => ({ key: o.id, label: o.label, value: o.sold, note: moneyList(o.amounts) }))}
                  format={fmtNum} active={filters.offer} onSelect={v => set({ offer: v })}
                  empty="No vouchers sold in this period." />
              </Panel>
              <Panel title="Request status" note={scopeNote(filters, 'vouchers')}>
                <BarList rows={a.vouchers.pipeline} format={fmtNum} color={SERIES[1]} limit={6} />
              </Panel>
              <Panel title="Gift vs personal" note={scopeNote(filters, 'vouchers')}>
                <Donut caption="sold" format={fmtNum} segments={[
                  { label: 'Bought as a gift', value: a.vouchers.gifts, color: SERIES[0] },
                  { label: 'Bought for themselves', value: a.vouchers.personal, color: SERIES[1] },
                ]} />
              </Panel>
            </div>
          </Section>

          {/* ── Visits, enquiries & bookings ── */}
          <Section title="Visits, enquiries & bookings">
            <div className="ad-an-grid">
              <Panel title="Funnel" note={scopeNote(filters, 'visits') ? `Visits only follow the country filter.` : null}>
                <Funnel steps={a.funnel} format={fmtNum} />
                <div className="ad-an-inline-stat">
                  <span>Median time to first response</span>
                  <strong>{fmtHours(a.responseTime.value)}</strong>
                  {compare && a.responseTime.prev != null && (
                    <span className="ad-an-muted">was {fmtHours(a.responseTime.prev)}</span>
                  )}
                </div>
              </Panel>
              <Panel title="Enquiries & bookings over time">
                <TrendChart buckets={a.buckets} format={fmtNum} series={[
                  { key: 'enq', label: 'Enquiries', values: a.trends.enquiries },
                  { key: 'booked', label: 'Bookings', values: a.trends.booked },
                ]} />
              </Panel>
              <Panel title="Website visits over time" note={scopeNote(filters, 'visits')}>
                <TrendChart buckets={a.buckets} format={fmtCompact} colors={[SERIES[2]]}
                  series={[{ key: 'visits', label: 'Visits', values: a.trends.visits }]} />
              </Panel>
              <Panel title="Patients" note="People who sent at least one enquiry in the period, by email or phone.">
                <div className="ad-an-tiles ad-an-tiles--inner">
                  <StatTile label="Unique enquirers" value={fmtNum(a.patients.unique.value)}
                    current={a.patients.unique.value} previous={a.patients.unique.prev} compare={compare} />
                  <StatTile label="First-time" value={fmtNum(a.patients.newcomers)} compare={false} />
                  <StatTile label="Returning" value={fmtNum(a.patients.returning)} compare={false} />
                </div>
                <h4 className="ad-an-sub-title">Enquiries by source</h4>
                <BarList rows={a.patients.sources.map(s => ({ key: s.key, label: sourceLabel(s.key), value: s.enquiries, note: `${fmtNum(s.booked)} booked · ${fmtPct(s.rate)}` }))}
                  format={fmtNum} active={filters.source} onSelect={v => set({ source: v })} />
              </Panel>
            </div>
          </Section>

          {/* ── Treatments ── */}
          <Section title="Treatments" sub="Click a row to filter the whole page by it.">
            <div className="ad-an-grid">
              <Panel title="Enquiries by treatment area">
                <BarList rows={a.areas.map(r => ({ key: r.key, label: r.label, value: r.enquiries, note: `${fmtNum(r.booked)} booked · ${fmtPct(r.rate)}` }))}
                  format={fmtNum} active={filters.area} onSelect={v => set({ area: v, treatment: '' })} />
              </Panel>
              <Panel title="Most requested treatments" note="Concern-finder enquiries without a named treatment aren't counted here.">
                <BarList rows={a.treatments.map(r => ({ key: r.key, label: r.label, value: r.enquiries, note: `${fmtNum(r.booked)} booked · ${fmtPct(r.rate)}` }))}
                  format={fmtNum} color={SERIES[1]} active={filters.treatment} onSelect={v => set({ treatment: v })} />
              </Panel>
            </div>
          </Section>

          {/* ── Clinics / Countries ── */}
          <Section title="Clinics & countries">
            <div className="ad-an-grid">
              <Panel title="By country" wide>
                <div className="ad-an-table-scroll">
                  <table className="ad-an-mini">
                    <thead>
                      <tr><th>Country</th><th>Visits</th><th>Enquiries</th><th>Bookings</th><th>Booking rate</th><th>Voucher revenue</th></tr>
                    </thead>
                    <tbody>
                      {a.countries.length ? a.countries.map(c => (
                        <tr key={c.key}>
                          <td><button type="button" className="ad-an-link" onClick={() => set({ country: filters.country === c.key ? '' : c.key, city: '', doctor: '' })}>{COUNTRY_LABELS[c.key] || c.key}</button></td>
                          <td>{fmtNum(c.visits)}</td>
                          <td>{fmtNum(c.enquiries)}</td>
                          <td>{fmtNum(c.booked)}</td>
                          <td>{fmtPct(c.rate)}</td>
                          <td>{c.revenue.length ? moneyList(c.revenue) : `${COUNTRY_CURRENCY[c.key] || ''} 0`}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="ad-an-empty">No enquiries in this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Enquiries by city">
                <BarList rows={a.cities.map(r => ({ key: r.key, label: r.label, value: r.enquiries, note: `${fmtNum(r.booked)} booked` }))}
                  format={fmtNum} active={filters.city} onSelect={v => set({ city: v })} />
              </Panel>
              <Panel title="Enquiries by clinic" note="Only enquiries that name a clinic.">
                <BarList rows={a.clinics.map(r => ({ key: r.key, label: r.label, value: r.enquiries, note: `${fmtNum(r.booked)} booked` }))}
                  format={fmtNum} color={SERIES[1]} empty="No enquiries named a clinic in this period." />
              </Panel>
            </div>
          </Section>

          {/* ── Doctors ── */}
          <Section title="Doctors">
            <div className="ad-an-grid">
              <Panel title="Enquiries per doctor" note={`${fmtNum(a.unassignedDoctor)} enquiries didn't name a doctor.`}>
                <BarList rows={a.doctors.map(r => ({ key: r.key, label: r.label, value: r.enquiries, note: `${fmtNum(r.booked)} booked` }))}
                  format={fmtNum} active={filters.doctor} onSelect={v => set({ doctor: v })} />
              </Panel>
              <Panel title="Booking rate per doctor" note="Share of each doctor's enquiries that were booked.">
                <BarList rows={a.doctors.map(r => ({ key: r.key, label: r.label, value: r.rate || 0, display: fmtPct(r.rate), note: `${fmtNum(r.booked)} of ${fmtNum(r.enquiries)}` }))
                  .sort((x, y) => y.value - x.value)}
                  color={SERIES[2]} />
              </Panel>
            </div>
          </Section>
        </div>
      )}

      <ContentHealth />
    </div>
  )
}
