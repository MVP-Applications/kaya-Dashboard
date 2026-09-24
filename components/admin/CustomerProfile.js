'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import { ProviderBadges, relativeDate } from './CustomerBits'
import {
  fetchCustomer, revealCustomerMedical, fetchCustomerAccessLog, setCustomerStatus, removeCustomer,
  fetchVoucherRequestsPage,
} from '@/lib/admin/store'
import {
  STATUS_LABELS, ageFrom, bmi, completeness, countryFromPhone, formatPhone, displayName, initials,
} from '@/lib/admin/customers'
import { COUNTRY_LABELS } from '@/lib/countries'
import { REQUEST_STATUS_LABELS } from '@/lib/admin/seed'

function fullDate(iso, withTime = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

function Row({ label, children }) {
  return (
    <div className="ad-req-row">
      <span className="ad-req-key">{label}</span>
      <span className="ad-req-val">{children ?? <span className="ad-muted">Not provided</span>}</span>
    </div>
  )
}

const yesNo = v => (v == null ? null : v ? 'Yes' : 'No')
const orNone = v => (v == null || v === '' ? null : v)

/**
 * The customer's enquiries and voucher requests, found by email and phone
 * through the same search the Requests and Voucher Requests screens use.
 */
function useHistory(customer, loadRequestsPage) {
  const [history, setHistory] = useState({ loading: true, requests: [], vouchers: [], error: '' })
  useEffect(() => {
    if (!customer) return
    let alive = true
    const terms = [customer.email, customer.phone].filter(Boolean)
    if (!terms.length) { setHistory({ loading: false, requests: [], vouchers: [], error: '' }); return }
    const dedupe = lists => [...new Map(lists.flat().map(x => [x.id, x])).values()]
    Promise.all([
      Promise.all(terms.map(t => loadRequestsPage({ search: t, page: 1, pageSize: 50 }).then(r => r.items))),
      Promise.all(terms.map(t => fetchVoucherRequestsPage({ search: t, page: 1, pageSize: 50 }).then(r => r.items))),
    ])
      .then(([reqs, vrs]) => {
        if (!alive) return
        setHistory({
          loading: false,
          requests: dedupe(reqs).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
          vouchers: dedupe(vrs).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
          error: '',
        })
      })
      .catch(e => { if (alive) setHistory({ loading: false, requests: [], vouchers: [], error: e.message }) })
    return () => { alive = false }
  }, [customer, loadRequestsPage])
  return history
}

export default function CustomerProfile({ id, onClose }) {
  const { user, allowed, loadRequestsPage } = useAdmin()
  const canDelete = allowed('delete')

  const [customer, setCustomer] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [medical, setMedical] = useState(null) // null = not revealed
  const [revealing, setRevealing] = useState(false)
  const [medicalError, setMedicalError] = useState('')
  const [accessLog, setAccessLog] = useState([])
  const [confirm, setConfirm] = useState(null) // 'disable' | 'enable' | 'delete'
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadLog = useCallback(() => fetchCustomerAccessLog(id).then(setAccessLog).catch(() => setAccessLog([])), [id])

  useEffect(() => {
    let alive = true
    fetchCustomer(id)
      .then(c => { if (alive) setCustomer(c) })
      .catch(e => { if (alive) setLoadError(e.message) })
    loadLog()
    return () => { alive = false }
  }, [id, loadLog])

  const history = useHistory(customer, loadRequestsPage)

  async function reveal() {
    setRevealing(true)
    setMedicalError('')
    try {
      const record = await revealCustomerMedical(id, user)
      setMedical(record || {})
      loadLog()
    } catch (e) {
      setMedicalError(e.message)
    } finally {
      setRevealing(false)
    }
  }

  async function runAction() {
    setBusy(true)
    setActionError('')
    try {
      if (confirm === 'delete') {
        await removeCustomer(id)
        onClose()
        return
      }
      const next = await setCustomerStatus(id, confirm === 'disable' ? 'DISABLED' : 'ACTIVE')
      setCustomer(next)
      setConfirm(null)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <div className="ad-view">
        <button type="button" className="ad-back" onClick={onClose}>← All customers</button>
        <div className="ad-panel ad-blog-unavailable ad-cu-gap"><strong>This profile can&apos;t be loaded.</strong> {loadError}</div>
      </div>
    )
  }
  if (!customer) return <div className="ad-view"><div className="ad-panel ad-an-loading">Loading…</div></div>

  const c = customer
  const age = ageFrom(c.dateOfBirth)
  const country = countryFromPhone(c.phone)
  const pct = completeness(c)
  const index = bmi(c)
  const disabled = c.status === 'DISABLED'

  return (
    <div className="ad-view ad-cu">
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← All customers</button>
        <div className="ad-cu-head">
          <span className="ad-cu-avatar ad-cu-avatar--lg" aria-hidden="true">{initials(c)}</span>
          <div className="ad-editor-titles">
            <h1 className="ad-view-title">{displayName(c)}</h1>
            <p className="ad-view-sub ad-cu-head-meta">
              <span className={`ad-status ad-status--${disabled ? 'closed' : 'booked'}`}><span className="ad-status-dot" />{STATUS_LABELS[c.status] || c.status}</span>
              <span>Joined {fullDate(c.createdAt)}</span>
              <span>· Last signed in {relativeDate(c.lastSignInAt).toLowerCase()}</span>
            </p>
          </div>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setConfirm(disabled ? 'enable' : 'disable')}>
            {disabled ? 'Re-enable account' : 'Disable account'}
          </button>
          {canDelete && (
            <button type="button" className="ad-btn ad-btn--danger" onClick={() => setConfirm('delete')}>Delete account</button>
          )}
        </div>
      </div>

      {disabled && <div className="ad-tu-dirty">This account is disabled — the customer can&apos;t sign in on the website. Their information is kept.</div>}

      <div className="ad-cu-grid">
        <div className="ad-cu-col">
          <div className="ad-panel">
            <div className="ad-panel-head ad-cu-panel-head">
              <h2 className="ad-panel-title">Profile</h2>
              <span className="ad-cu-meter" title={`${pct}% complete`}>
                <span className="ad-cu-meter-track"><span className="ad-cu-meter-fill" style={{ width: `${pct}%` }} /></span>
                <span className="ad-cu-meter-n">{pct}% complete</span>
              </span>
            </div>
            <div className="ad-req-detail">
              <Row label="Full name">{orNone(c.fullName)}</Row>
              <Row label="Email">{c.email ? <a className="ad-req-link" href={`mailto:${c.email}`}>{c.email}</a> : null}</Row>
              <Row label="Mobile">{c.phone ? <a className="ad-req-link" href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a> : null}</Row>
              <Row label="Country">{country ? COUNTRY_LABELS[country] : null}</Row>
              <Row label="Date of birth">{c.dateOfBirth ? `${fullDate(c.dateOfBirth)}${age != null ? ` · ${age} years` : ''}` : null}</Row>
              <Row label="Gender">{c.gender === 'FEMALE' ? 'Female' : c.gender === 'MALE' ? 'Male' : null}</Row>
              <Row label="Height">{c.heightCm ? `${c.heightCm} cm` : null}</Row>
              <Row label="Weight">{c.weightKg ? `${c.weightKg} kg` : null}</Row>
              {index && <Row label="BMI">{index}</Row>}
              <Row label="Signs in with"><ProviderBadges providers={c.authProviders} /></Row>
            </div>
          </div>

          {/* ── Medical: hidden by default, every reveal logged ── */}
          <div className="ad-panel ad-cu-medical">
            <div className="ad-panel-head ad-cu-panel-head">
              <h2 className="ad-panel-title">Medical information</h2>
              {c.hasHealthConsent && <span className="ad-badge">Consent given {fullDate(c.healthConsentAt)}</span>}
            </div>
            {!c.hasHealthConsent ? (
              <p className="ad-cu-note">
                {c.fullName ? c.fullName.split(' ')[0] : 'This customer'} hasn&apos;t agreed to Kaya storing health information, so none is held.
                If they gave consent and later withdrew it, their medical answers were deleted at that point.
              </p>
            ) : medical ? (
              <>
                <div className="ad-req-detail">
                  <Row label="Allergies">{orNone(medical.allergies)}</Row>
                  <Row label="Current medications">{orNone(medical.medications)}</Row>
                  <Row label="Medical conditions">{orNone(medical.medicalConditions)}</Row>
                  {c.gender === 'FEMALE' && <Row label="Pregnant">{yesNo(medical.isPregnant)}</Row>}
                  {c.gender === 'FEMALE' && <Row label="Breastfeeding">{yesNo(medical.isBreastfeeding)}</Row>}
                </div>
                <div className="ad-cu-medical-foot">
                  <span className="ad-field-hint">Your view was recorded. Only share this with the doctors treating {c.fullName ? c.fullName.split(' ')[0] : 'this customer'}.</span>
                  <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setMedical(null)}>Hide</button>
                </div>
              </>
            ) : (
              <div className="ad-cu-locked">
                <span className="ad-cu-lock" aria-hidden="true">🔒</span>
                <div>
                  <strong>Allergies, medications, conditions and pregnancy are hidden.</strong>
                  <span>Viewing them records your name and the time in this customer&apos;s access log.</span>
                </div>
                <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={reveal} disabled={revealing}>
                  {revealing ? 'Opening…' : 'Show medical information'}
                </button>
                {medicalError && <p className="ad-confirm-error">{medicalError}</p>}
              </div>
            )}
          </div>

          <div className="ad-panel">
            <div className="ad-panel-head">
              <h2 className="ad-panel-title">Medical access log</h2>
              <p className="ad-an-note">Everyone who has viewed this customer&apos;s medical information.</p>
            </div>
            {accessLog.length ? (
              <div className="ad-req-detail">
                {accessLog.slice(0, 20).map((e, i) => (
                  <div key={`${e.at}-${i}`} className="ad-req-row">
                    <span className="ad-req-key">{e.staffName}</span>
                    <span className="ad-req-val">{fullDate(e.at, true)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="ad-an-empty">No one has viewed it yet.</p>}
          </div>
        </div>

        <div className="ad-cu-col">
          <div className="ad-panel">
            <div className="ad-panel-head">
              <h2 className="ad-panel-title">Enquiries</h2>
              <p className="ad-an-note">Matched by email and mobile number.</p>
            </div>
            {history.loading ? <p className="ad-an-empty">Loading…</p>
              : history.error ? <p className="ad-an-empty">Couldn&apos;t load enquiries — {history.error}</p>
                : history.requests.length ? (
                  <div className="ad-cu-history">
                    {history.requests.map(r => (
                      <div key={r.id} className="ad-cu-history-row">
                        <span>
                          <strong>{r.treatment || r.treatmentArea || 'General enquiry'}</strong>
                          <span className="ad-cell-slug">{r.source === 'concern' ? 'Tell Us Everything' : 'Consultation'} · {fullDate(r.createdAt)}</span>
                        </span>
                        <span className={`ad-status ad-status--${r.status}`}><span className="ad-status-dot" />{REQUEST_STATUS_LABELS[r.status] || r.status}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="ad-an-empty">No enquiries found.</p>}
          </div>

          <div className="ad-panel">
            <div className="ad-panel-head">
              <h2 className="ad-panel-title">Voucher requests</h2>
              <p className="ad-an-note">Matched by email and mobile number.</p>
            </div>
            {history.loading ? <p className="ad-an-empty">Loading…</p>
              : history.vouchers.length ? (
                <div className="ad-cu-history">
                  {history.vouchers.map(v => (
                    <div key={v.id} className="ad-cu-history-row">
                      <span>
                        <strong>{v.offerTitle}</strong>
                        <span className="ad-cell-slug">{v.offerCurrency} {v.offerPrice} · {v.isGift ? 'Gift' : 'For themselves'} · {fullDate(v.submittedAt)}</span>
                      </span>
                      <span className="ad-badge">{String(v.status).replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="ad-an-empty">No voucher requests found.</p>}
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm === 'delete' ? 'Delete this account?' : confirm === 'disable' ? 'Disable this account?' : 'Re-enable this account?'}
          confirmLabel={confirm === 'delete' ? 'Delete account' : confirm === 'disable' ? 'Disable account' : 'Re-enable'}
          tone={confirm === 'enable' ? 'primary' : 'danger'}
          busy={busy}
          error={actionError}
          consequenceNote={confirm === 'delete' ? undefined : ''}
          onCancel={() => { setConfirm(null); setActionError('') }}
          onConfirm={runAction}
        >
          {confirm === 'delete' && <>This permanently deletes <strong>{displayName(c)}</strong>&apos;s website account, profile and medical information — use it when the customer asks for their data to be erased. Their enquiries and voucher requests stay in Requests.</>}
          {confirm === 'disable' && <><strong>{displayName(c)}</strong> won&apos;t be able to sign in on the website until you re-enable the account. Nothing is deleted.</>}
          {confirm === 'enable' && <><strong>{displayName(c)}</strong> will be able to sign in on the website again.</>}
        </ConfirmDialog>
      )}
    </div>
  )
}
