'use client'
import { useAdmin } from './AdminContext'
import { COUNTRY_OPTIONS } from '@/lib/admin/seed'
import { PAGES, CLINIC_COUNTRIES } from '@/lib/admin/content'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Build a conic-gradient string from weighted segments.
function conic(segments, total) {
  if (!total) return 'var(--mist)'
  let acc = 0
  const stops = segments.map(s => {
    const start = (acc / total) * 100
    acc += s.value
    const end = (acc / total) * 100
    return `${s.color} ${start}% ${end}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export default function Overview({ onNavigate }) {
  const { user, services, verticals, doctors, reviews, vouchers, requestStatusCounts, locations } = useAdmin()

  const withBadge = services.filter(s => s.badge).length
  const withMedia = reviews.filter(r => r.before || r.after).length
  const newRequests = requestStatusCounts.new
  const firstName = (user?.name || '').split(' ')[0]

  // Services counted under every vertical they belong to (many-to-many).
  const byVertical = verticals.map(v => ({
    label: v.label,
    color: v.color,
    n: services.filter(s => (s.verticals || []).includes(v.id)).length,
  }))
  const vMax = Math.max(1, ...byVertical.map(r => r.n))

  // Doctors per country.
  const byCountry = COUNTRY_OPTIONS.map(c => ({
    label: c,
    n: doctors.filter(d => (d.countries || []).includes(c)).length,
  }))
  const cMax = Math.max(1, ...byCountry.map(r => r.n))

  // Clinics per country (from the Locations section).
  const clinicsByCountry = CLINIC_COUNTRIES.map(c => ({
    label: c,
    n: locations.filter(l => l.country === c).length,
  }))
  const lMax = Math.max(1, ...clinicsByCountry.map(r => r.n))

  const stats = [
    { label: 'Requests', value: requestStatusCounts.total, icon: '✉', color: '#2F7DBE', view: 'requests', badge: newRequests || null },
    { label: 'Services', value: services.length, icon: '✦', color: '#6E5A96', view: 'services' },
    { label: 'Doctors', value: doctors.length, icon: '⚕', color: '#8570A8', view: 'doctors' },
    { label: 'Verticals', value: verticals.length, icon: '◈', color: '#B98A2E', view: 'verticals' },
    { label: 'Vouchers', value: vouchers.length, icon: '🎁', color: '#37795A', view: 'indulgence' },
    { label: 'Reviews', value: reviews.length, icon: '★', color: '#B23B7A', view: 'reviews' },
    { label: 'Pages', value: PAGES.length, icon: '▤', color: '#4A6E8A', view: 'pages' },
    { label: 'Clinics', value: locations.length, icon: '⌖', color: '#8A5A3B', view: 'locations' },
  ]

  // Content mix donut.
  const mix = [
    { label: 'Services', value: services.length, color: '#6E5A96' },
    { label: 'Doctors', value: doctors.length, color: '#8570A8' },
    { label: 'Vouchers', value: vouchers.length, color: '#C3B6DE' },
    { label: 'Reviews', value: reviews.length, color: '#B98A2E' },
  ]
  const mixTotal = mix.reduce((a, s) => a + s.value, 0)

  const featuredPct = services.length ? Math.round((withBadge / services.length) * 100) : 0
  const mediaPct = reviews.length ? Math.round((withMedia / reviews.length) * 100) : 0

  return (
    <div className="ad-ov">
      <div className="ad-ov-head">
        <h1 className="ad-ov-hello">{greeting()}{firstName ? `, ${firstName}` : ''} 👋</h1>
        <p className="ad-ov-sub">Here&apos;s a snapshot of your Kaya content.</p>
      </div>

      {/* Stat tiles */}
      <div className="ad-ov-stats">
        {stats.map(s => (
          <button key={s.label} className="ad-ov-stat" onClick={() => onNavigate(s.view)}>
            <span className="ad-ov-stat-ico" style={{ background: `${s.color}1a`, color: s.color }}>
              {s.icon}
            </span>
            <span className="ad-ov-stat-val">{s.value}</span>
            <span className="ad-ov-stat-lbl">{s.label}</span>
            {s.badge ? <span className="ad-ov-stat-badge">{s.badge} new</span> : null}
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="ad-ov-cols">
        <div className="ad-panel">
          <div className="ad-panel-head"><h2 className="ad-panel-title">Services by vertical</h2></div>
          <div className="ad-bars">
            {byVertical.map(r => (
              <div key={r.label} className="ad-bar-row">
                <span className="ad-bar-label">{r.label}</span>
                <span className="ad-bar-track">
                  <span className="ad-bar-fill" style={{ width: `${(r.n / vMax) * 100}%`, background: r.color }} />
                </span>
                <span className="ad-bar-value">{r.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-head"><h2 className="ad-panel-title">Content mix</h2></div>
          <div className="ad-donut-wrap">
            <div className="ad-donut" style={{ background: conic(mix, mixTotal) }}>
              <div className="ad-donut-hole">
                <span className="ad-donut-total">{mixTotal}</span>
                <span className="ad-donut-cap">items</span>
              </div>
            </div>
            <div className="ad-legend">
              {mix.map(m => (
                <div key={m.label} className="ad-legend-item">
                  <span className="ad-legend-dot" style={{ background: m.color }} />
                  <span className="ad-legend-lbl">{m.label}</span>
                  <span className="ad-legend-val">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insight row */}
      <div className="ad-ov-cols">
        <div className="ad-panel">
          <div className="ad-panel-head"><h2 className="ad-panel-title">Doctors by country</h2></div>
          <div className="ad-bars">
            {byCountry.map(r => (
              <div key={r.label} className="ad-bar-row">
                <span className="ad-bar-label">{r.label}</span>
                <span className="ad-bar-track">
                  <span className="ad-bar-fill" style={{ width: `${(r.n / cMax) * 100}%` }} />
                </span>
                <span className="ad-bar-value">{r.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-head"><h2 className="ad-panel-title">At a glance</h2></div>
          <div className="ad-rings">
            <div className="ad-ring-card">
              <div className="ad-ring" style={{ background: `conic-gradient(var(--primary) ${featuredPct}%, var(--mist) 0)` }}>
                <span className="ad-ring-pct">{featuredPct}%</span>
              </div>
              <div className="ad-ring-cap">
                <strong>{withBadge}</strong> featured services
              </div>
            </div>
            <div className="ad-ring-card">
              <div className="ad-ring" style={{ background: `conic-gradient(#B98A2E ${mediaPct}%, var(--mist) 0)` }}>
                <span className="ad-ring-pct">{mediaPct}%</span>
              </div>
              <div className="ad-ring-cap">
                <strong>{withMedia}</strong> reviews with before/after
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Website content row */}
      <div className="ad-ov-cols">
        <div className="ad-panel">
          <div className="ad-panel-head"><h2 className="ad-panel-title">Clinics by country</h2></div>
          <div className="ad-bars">
            {clinicsByCountry.map(r => (
              <div key={r.label} className="ad-bar-row">
                <span className="ad-bar-label">{r.label}</span>
                <span className="ad-bar-track">
                  <span className="ad-bar-fill" style={{ width: `${(r.n / lMax) * 100}%`, background: '#8A5A3B' }} />
                </span>
                <span className="ad-bar-value">{r.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-head"><h2 className="ad-panel-title">Website pages</h2></div>
          <div className="ad-ov-pages">
            {PAGES.map(p => (
              <button key={p.id} className="ad-ov-page" onClick={() => onNavigate('pages')}>
                <span className="ad-ov-page-ico" aria-hidden="true">{p.icon}</span>
                <span className="ad-ov-page-label">{p.label}</span>
                <span className="ad-ov-page-n">{p.sections.length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
