'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import CustomerProfile from './CustomerProfile'
import { ProviderBadges, relativeDate } from './CustomerBits'
import { fetchCustomersPage, fetchCustomerCounts, exportCustomersCsv } from '@/lib/admin/store'
import {
  PROVIDER_OPTIONS, PROVIDER_LABELS, STATUS_LABELS,
  completeness, countryFromPhone, formatPhone, displayName, initials,
} from '@/lib/admin/customers'
import { COUNTRIES } from '@/lib/countries'
import { downloadCsv, stampedName } from '@/lib/admin/csv'

const PAGE_SIZE = 20

export default function CustomersView() {
  const { allowed, dataVersion } = useAdmin()
  const canView = allowed('viewCustomers')

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('')
  const [country, setCountry] = useState('')
  const [comp, setComp] = useState('')
  const [consent, setConsent] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => { setPage(1) }, [search, provider, country, comp, consent, status])

  const filters = useMemo(() => ({
    search, provider, country, completeness: comp, consent, status,
  }), [search, provider, country, comp, consent, status])

  useEffect(() => {
    if (!canView) return
    let alive = true
    setLoading(true)
    Promise.all([fetchCustomersPage({ ...filters, page, pageSize: PAGE_SIZE }), fetchCustomerCounts()])
      .then(([res, c]) => {
        if (!alive) return
        setItems(res.items); setTotal(res.total); setCounts(c); setError('')
      })
      .catch(e => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [canView, filters, page, dataVersion, reload])

  if (!canView) {
    return (
      <div className="ad-view">
        <div className="ad-view-head"><div><h1 className="ad-view-title">Customers</h1></div></div>
        <div className="ad-panel ad-an-blocked">Customer accounts hold health information, so they&apos;re available to Administrators only.</div>
      </div>
    )
  }

  if (openId) {
    return <CustomerProfile id={openId} onClose={() => { setOpenId(null); setReload(r => r + 1) }} />
  }

  const isFiltered = Boolean(search || provider || country || comp || consent || status)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function exportCsv() {
    setExporting(true)
    try {
      downloadCsv(stampedName('kaya-customers'), await exportCustomersCsv(filters))
    } catch (e) {
      setError(e.message)
    } finally {
      setExporting(false)
    }
  }

  function clear() {
    setQuery(''); setProvider(''); setCountry(''); setComp(''); setConsent(''); setStatus('')
  }

  const chips = counts && [
    { label: 'Customers', value: counts.total, active: !isFiltered, onClick: clear },
    { label: 'Joined this week', value: counts.newThisWeek },
    { label: 'Health consent given', value: counts.withConsent, active: consent === 'given', onClick: () => setConsent(consent === 'given' ? '' : 'given') },
    { label: 'Disabled', value: counts.disabled, active: status === 'DISABLED', onClick: () => setStatus(status === 'DISABLED' ? '' : 'DISABLED') },
  ]

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Customers</h1>
          <p className="ad-view-sub">Accounts people create on the website to manage their profile. Medical details stay hidden until you choose to view them, and every view is recorded.</p>
        </div>
        <button type="button" className="ad-btn ad-btn--primary" onClick={exportCsv} disabled={exporting || !total || Boolean(error)}
          title="Exports contact and profile details — never medical information">
          {exporting ? 'Exporting…' : `↓ Export ${isFiltered ? `${total} matching` : 'all'}`}
        </button>
      </div>

      {chips && (
        <div className="ad-req-summary">
          {chips.map(c => (
            c.onClick ? (
              <button key={c.label} type="button" className={`ad-req-stat ad-cu-stat${c.active ? ' active' : ''}`} onClick={c.onClick}>
                <span className="ad-req-stat-num">{c.value}</span>
                <span className="ad-req-stat-lbl">{c.label}</span>
              </button>
            ) : (
              <div key={c.label} className="ad-req-stat ad-cu-stat ad-cu-stat--static">
                <span className="ad-req-stat-num">{c.value}</span>
                <span className="ad-req-stat-lbl">{c.label}</span>
              </div>
            )
          ))}
        </div>
      )}

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search by name, email or mobile…" value={query} onChange={e => setQuery(e.target.value)} />
        <select className="ad-input ad-filter" value={provider} onChange={e => setProvider(e.target.value)} aria-label="Sign-in method">
          <option value="">All sign-in methods</option>
          {PROVIDER_OPTIONS.map(p => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
        </select>
        <select className="ad-input ad-filter" value={country} onChange={e => setCountry(e.target.value)} aria-label="Country">
          <option value="">All countries</option>
          {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="ad-input ad-filter" value={comp} onChange={e => setComp(e.target.value)} aria-label="Profile">
          <option value="">Any profile</option>
          <option value="complete">Profile complete</option>
          <option value="incomplete">Profile incomplete</option>
        </select>
        <select className="ad-input ad-filter" value={consent} onChange={e => setConsent(e.target.value)} aria-label="Health consent">
          <option value="">Any health consent</option>
          <option value="given">Consent given</option>
          <option value="none">No consent</option>
        </select>
        <select className="ad-input ad-filter" value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {isFiltered && <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={clear}>Clear</button>}
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Mobile</th>
              <th>Signs in with</th>
              <th>Profile</th>
              <th>Health consent</th>
              <th>Joined</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody className={loading ? 'ad-cu-loading' : ''}>
            {items.map(c => {
              const pct = completeness(c)
              return (
                <tr key={c.id} className={c.status === 'DISABLED' ? 'ad-cu-row--disabled' : ''}>
                  <td>
                    <div className="ad-doc-cell">
                      <span className="ad-cu-avatar" aria-hidden="true">{initials(c)}</span>
                      <span>
                        <span className="ad-cell-name">
                          {displayName(c)}
                          {c.status === 'DISABLED' && <span className="ad-cu-disabled-tag">Disabled</span>}
                        </span>
                        <span className="ad-cell-slug">{c.email || 'No email'}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div>{formatPhone(c.phone) || <span className="ad-muted">—</span>}</div>
                    {countryFromPhone(c.phone) && <div className="ad-cell-slug">{countryFromPhone(c.phone)}</div>}
                  </td>
                  <td><ProviderBadges providers={c.authProviders} /></td>
                  <td>
                    <span className="ad-cu-meter" title={`${pct}% complete`}>
                      <span className="ad-cu-meter-track"><span className="ad-cu-meter-fill" style={{ width: `${pct}%` }} /></span>
                      <span className="ad-cu-meter-n">{pct}%</span>
                    </span>
                  </td>
                  <td>{c.hasHealthConsent ? <span className="ad-badge">Given</span> : <span className="ad-muted">Not given</span>}</td>
                  <td>{relativeDate(c.createdAt)}</td>
                  <td className="ad-td-actions">
                    <button type="button" className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => setOpenId(c.id)}>View</button>
                  </td>
                </tr>
              )
            })}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="ad-empty">
                {error
                  ? `Could not load customers — ${error}`
                  : isFiltered ? 'No customers match your filters.' : 'No customers yet. Accounts appear here when people sign up on the website.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="ad-req-pager">
          <span className="ad-muted">Page {page} of {totalPages} · {total} customers</span>
          <span>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </span>
        </div>
      )}
    </div>
  )
}
