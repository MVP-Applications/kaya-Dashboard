'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from './AdminContext'
import { fetchVoucherRequestsPage } from '@/lib/admin/store'
import { VOUCHER_STATUS } from '@/lib/admin/voucher-status'
import { viewHref } from '@/lib/admin/routes'

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
function useOverviewCounts(loadRequestsPage, dataVersion) {
  const [counts, setCounts] = useState({ bookedWeek: null, awaitingPayment: null, toFulfil: null })

  useEffect(() => {
    let alive = true
    const total = p => p.then(r => r.total).catch(() => null)
    const vouchers = status => total(fetchVoucherRequestsPage({ status, page: 1, pageSize: 1 }))

    Promise.all([
      total(loadRequestsPage({ status: 'booked', from: new Date(Date.now() - WEEK).toISOString(), page: 1, pageSize: 1 })),
      vouchers(VOUCHER_STATUS.REQUESTED),
      vouchers(VOUCHER_STATUS.PAYMENT_LINK_SENT),
      vouchers(VOUCHER_STATUS.PAID),
    ]).then(([bookedWeek, requested, linkSent, paid]) => {
      if (!alive) return
      setCounts({
        bookedWeek,
        awaitingPayment: requested == null && linkSent == null ? null : (requested || 0) + (linkSent || 0),
        toFulfil: paid,
      })
    })
    return () => { alive = false }
  }, [loadRequestsPage, dataVersion])

  return counts
}

const show = n => (n == null ? '—' : n)

export default function Overview() {
  const { user, services, doctors, requestStatusCounts, loadRequestsPage, dataVersion } = useAdmin()
  const counts = useOverviewCounts(loadRequestsPage, dataVersion)
  const firstName = (user?.name || '').split(' ')[0]

  const openRequests = requestStatusCounts.new + requestStatusCounts.contacted
  const unfiledTreatments = services.filter(s => !(s.verticals || []).length).length
  const doctorsNoCountry = doctors.filter(d => !(d.countries || []).length).length

  // Only what needs someone to act — an empty list means all caught up.
  const attention = [
    { n: requestStatusCounts.new, label: 'new enquiries waiting for a first reply', href: viewHref('requests', { status: 'new' }), tone: 'urgent' },
    { n: counts.awaitingPayment, label: 'voucher requests waiting for payment', href: viewHref('voucher-requests'), tone: 'warn' },
    { n: counts.toFulfil, label: 'paid vouchers to issue', href: viewHref('voucher-requests', { status: VOUCHER_STATUS.PAID }), tone: 'warn' },
    { n: unfiledTreatments, label: 'treatments not in any vertical', href: viewHref('services'), tone: 'info' },
    { n: doctorsNoCountry, label: 'doctors without a country', href: viewHref('doctors'), tone: 'info' },
  ].filter(a => a.n > 0)

  const stats = [
    { label: 'Open enquiries', value: openRequests, hint: 'New or contacted', href: viewHref('requests') },
    { label: 'Booked this week', value: show(counts.bookedWeek), hint: 'From enquiries in the last 7 days', href: viewHref('requests', { status: 'booked', range: '7' }) },
    { label: 'Awaiting payment', value: show(counts.awaitingPayment), hint: 'Voucher requests', href: viewHref('voucher-requests') },
    { label: 'Vouchers to issue', value: show(counts.toFulfil), hint: 'Paid, not yet issued', href: viewHref('voucher-requests', { status: VOUCHER_STATUS.PAID }) },
  ]

  const links = [
    { label: 'Requests', icon: '✉', view: 'requests' },
    { label: 'Treatments', icon: '✦', view: 'services' },
    { label: 'Doctors', icon: '⚕', view: 'doctors' },
    { label: 'Indulgence', icon: '🎁', view: 'indulgence' },
    { label: 'Pages', icon: '▤', view: 'pages' },
    { label: 'Clinics', icon: '⌖', view: 'locations' },
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
              <Link key={a.label} href={a.href} className={`ad-ov-todo-item ad-ov-todo-item--${a.tone}`}>
                <span className="ad-ov-todo-n">{a.n}</span>
                <span className="ad-ov-todo-lbl">{a.label}</span>
                <span className="ad-ov-todo-go" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="ad-ov-clear">✓ All caught up — nothing is waiting on you.</p>
        )}
      </div>

      <div className="ad-ov-stats">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="ad-ov-stat">
            <span className="ad-ov-stat-val">{s.value}</span>
            <span className="ad-ov-stat-lbl">{s.label}</span>
            <span className="ad-ov-stat-hint">{s.hint}</span>
          </Link>
        ))}
      </div>

      <div className="ad-panel">
        <div className="ad-panel-head"><h2 className="ad-panel-title">Quick links</h2></div>
        <div className="ad-ov-links">
          {links.map(l => (
            <Link key={l.view} href={viewHref(l.view)} className="ad-ov-link">
              <span aria-hidden="true">{l.icon}</span> {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
