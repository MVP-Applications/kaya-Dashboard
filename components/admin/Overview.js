'use client'
import { useEffect, useState } from 'react'
import { useAdmin } from './AdminContext'
import { fetchVoucherRequestsPage } from '@/lib/admin/store'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const WEEK = 7 * 86_400_000

/**
 * Totals the Overview needs beyond what AdminContext already holds — read
 * with the same list endpoints the Requests and Voucher Requests screens
 * use (one row per call; only `total` is read). Any that fail show "—"
 * rather than blocking the page.
 */
function useOverviewCounts(loadRequestsPage) {
  const [counts, setCounts] = useState({ bookedWeek: null, awaitingPayment: null, toFulfil: null })

  useEffect(() => {
    let alive = true
    const total = p => p.then(r => r.total).catch(() => null)
    const vouchers = status => total(fetchVoucherRequestsPage({ status, page: 1, pageSize: 1 }))

    Promise.all([
      total(loadRequestsPage({ status: 'booked', from: new Date(Date.now() - WEEK).toISOString(), page: 1, pageSize: 1 })),
      vouchers('REQUESTED'),
      vouchers('PAYMENT_LINK_SENT'),
      vouchers('PAID'),
    ]).then(([bookedWeek, requested, linkSent, paid]) => {
      if (!alive) return
      setCounts({
        bookedWeek,
        awaitingPayment: requested == null && linkSent == null ? null : (requested || 0) + (linkSent || 0),
        toFulfil: paid,
      })
    })
    return () => { alive = false }
  }, [loadRequestsPage])

  return counts
}

const show = n => (n == null ? '—' : n)

export default function Overview({ onNavigate }) {
  const { user, services, doctors, requestStatusCounts, allowed, loadRequestsPage } = useAdmin()
  const counts = useOverviewCounts(loadRequestsPage)
  const firstName = (user?.name || '').split(' ')[0]
  const canViewAnalytics = allowed('viewAnalytics')

  const openRequests = requestStatusCounts.new + requestStatusCounts.contacted
  const unfiledTreatments = services.filter(s => !(s.verticals || []).length).length
  const doctorsNoCountry = doctors.filter(d => !(d.countries || []).length).length

  // Only what needs someone to act — an empty list means all caught up.
  const attention = [
    { n: requestStatusCounts.new, label: 'new enquiries waiting for a first reply', view: 'requests', tone: 'urgent' },
    { n: counts.awaitingPayment, label: 'voucher requests waiting for payment', view: 'voucher-requests', tone: 'warn' },
    { n: counts.toFulfil, label: 'paid vouchers to send out', view: 'voucher-requests', tone: 'warn' },
    { n: unfiledTreatments, label: 'treatments not in any vertical', view: 'services', tone: 'info' },
    { n: doctorsNoCountry, label: 'doctors without a country', view: 'doctors', tone: 'info' },
  ].filter(a => a.n > 0)

  const stats = [
    { label: 'Open enquiries', value: openRequests, hint: 'New or contacted', view: 'requests' },
    { label: 'Booked this week', value: show(counts.bookedWeek), hint: 'From enquiries in the last 7 days', view: 'requests' },
    { label: 'Awaiting payment', value: show(counts.awaitingPayment), hint: 'Voucher requests', view: 'voucher-requests' },
    { label: 'Vouchers to fulfil', value: show(counts.toFulfil), hint: 'Paid, not yet sent', view: 'voucher-requests' },
  ]

  const links = [
    { label: 'Requests', icon: '✉', view: 'requests' },
    { label: 'Treatments', icon: '✦', view: 'services' },
    { label: 'Doctors', icon: '⚕', view: 'doctors' },
    { label: 'Indulgence', icon: '🎁', view: 'indulgence' },
    { label: 'Pages', icon: '▤', view: 'pages' },
    { label: 'Locations', icon: '⌖', view: 'locations' },
  ]

  return (
    <div className="ad-ov">
      <div className="ad-ov-head">
        <h1 className="ad-ov-hello">{greeting()}{firstName ? `, ${firstName}` : ''} 👋</h1>
        <p className="ad-ov-sub">Here&apos;s what needs your attention today.</p>
      </div>

      <div className="ad-panel">
        <div className="ad-panel-head"><h2 className="ad-panel-title">Needs attention</h2></div>
        {attention.length ? (
          <div className="ad-ov-todo">
            {attention.map(a => (
              <button key={a.label} className={`ad-ov-todo-item ad-ov-todo-item--${a.tone}`} onClick={() => onNavigate(a.view)}>
                <span className="ad-ov-todo-n">{a.n}</span>
                <span className="ad-ov-todo-lbl">{a.label}</span>
                <span className="ad-ov-todo-go" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="ad-ov-clear">✓ All caught up — nothing is waiting on you.</p>
        )}
      </div>

      <div className="ad-ov-stats">
        {stats.map(s => (
          <button key={s.label} className="ad-ov-stat" onClick={() => onNavigate(s.view)}>
            <span className="ad-ov-stat-val">{s.value}</span>
            <span className="ad-ov-stat-lbl">{s.label}</span>
            <span className="ad-ov-stat-hint">{s.hint}</span>
          </button>
        ))}
      </div>

      {canViewAnalytics && (
        <button className="ad-ov-analytics" onClick={() => onNavigate('analytics')}>
          <span className="ad-ov-analytics-ico" aria-hidden="true">◔</span>
          <span className="ad-ov-analytics-txt">
            <strong>Revenue, bookings and trends</strong>
            <span>Filter by country, clinic, treatment, doctor and date in Analytics.</span>
          </span>
          <span className="ad-ov-todo-go" aria-hidden="true">→</span>
        </button>
      )}

      <div className="ad-panel">
        <div className="ad-panel-head"><h2 className="ad-panel-title">Quick links</h2></div>
        <div className="ad-ov-links">
          {links.map(l => (
            <button key={l.view} className="ad-ov-link" onClick={() => onNavigate(l.view)}>
              <span aria-hidden="true">{l.icon}</span> {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
