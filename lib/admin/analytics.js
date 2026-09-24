/**
 * Analytics aggregation — plain functions over raw records.
 *
 * Input is the dataset fetchAnalyticsData() returns (requests, voucher
 * orders, daily visits). Everything here is pure, so the same code works
 * whether that dataset came from the preview sample or a future backend
 * endpoint, and a screen never computes a number itself.
 *
 * Revenue is never summed across currencies: AED, SAR and OMR stay separate
 * all the way to the screen, which shows one figure per currency.
 */
import { COUNTRY_IDS, COUNTRY_CURRENCY } from '@/lib/countries'

const DAY = 86_400_000
const HOUR = 3_600_000

/** Voucher statuses that mean money was actually taken. */
export const PAID_STATUSES = ['PAID', 'FULFILLED']

export const VOUCHER_STATUS_LABELS = {
  REQUESTED: 'Requested',
  PAYMENT_LINK_SENT: 'Payment link sent',
  PAID: 'Paid',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

export const RANGE_PRESETS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'custom', label: 'Custom range' },
]

export const DEFAULT_FILTERS = {
  range: '30d', from: '', to: '', compare: true,
  country: '', city: '', area: '', treatment: '', doctor: '', source: '', offer: '',
}

/** Human labels for each filter, used by the chips and "doesn't apply" notes. */
export const FILTER_LABELS = {
  country: 'Country', city: 'City', area: 'Treatment area', treatment: 'Treatment',
  doctor: 'Doctor', source: 'Source', offer: 'Voucher offer',
}

/**
 * Which filters each kind of record can honour. Voucher orders carry no
 * treatment or doctor; visits only know their country.
 */
const SCOPE = {
  requests: ['country', 'city', 'area', 'treatment', 'doctor', 'source'],
  vouchers: ['country', 'offer'],
  visits: ['country'],
}

// ── Dates ────────────────────────────────────────────────────

function startOfDay(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function parseDay(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(y, m - 1, d).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * The selected window as [start, end) timestamps, plus the equal-length
 * window immediately before it for comparison.
 */
export function resolveRange(filters, now = Date.now()) {
  const tomorrow = startOfDay(now) + DAY
  const today = new Date(now)
  let start
  let end = tomorrow

  switch (filters.range) {
    case '7d': start = tomorrow - 7 * DAY; break
    case '90d': start = tomorrow - 90 * DAY; break
    case 'month': start = new Date(today.getFullYear(), today.getMonth(), 1).getTime(); break
    case 'last-month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime()
      end = new Date(today.getFullYear(), today.getMonth(), 1).getTime()
      break
    case 'custom': {
      const from = parseDay(filters.from)
      const to = parseDay(filters.to)
      if (from != null && to != null && to >= from) {
        start = from
        end = to + DAY
        break
      }
      start = tomorrow - 30 * DAY
      break
    }
    default: start = tomorrow - 30 * DAY
  }

  const length = end - start
  return { start, end, prevStart: start - length, prevEnd: start, days: Math.round(length / DAY) }
}

/** Day buckets up to a month, weeks up to ~4 months, months beyond. */
function bucketUnit(days) {
  if (days <= 31) return 'day'
  if (days <= 124) return 'week'
  return 'month'
}

function makeBuckets(start, end, unit) {
  const buckets = []
  let t = start
  while (t < end) {
    const d = new Date(t)
    let next
    if (unit === 'day') next = t + DAY
    else if (unit === 'week') next = t + 7 * DAY
    else next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
    next = Math.min(next, end)

    const label = unit === 'month'
      ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const endLabel = new Date(next - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    buckets.push({
      start: t, end: next, label,
      // Tooltip heading: the whole span when a bucket covers more than a day.
      title: unit === 'day' ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `${label} – ${endLabel}`,
    })
    t = next
  }
  return buckets
}

function bucketIndex(buckets, t) {
  let lo = 0
  let hi = buckets.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (t < buckets[mid].start) hi = mid - 1
    else if (t >= buckets[mid].end) lo = mid + 1
    else return mid
  }
  return -1
}

// ── Filtering ────────────────────────────────────────────────

function matches(record, filters, scope, field) {
  for (const key of SCOPE[scope]) {
    const want = filters[key]
    if (want && record[field[key] || key] !== want) return false
  }
  return true
}

const REQUEST_FIELDS = { area: 'treatmentArea' }
const VOUCHER_FIELDS = { offer: 'offerId' }

const inWindow = (t, a, b) => t >= a && t < b

/** Active filters (by label) that a given section's records can't honour. */
export function ignoredFilters(filters, scope) {
  return Object.keys(FILTER_LABELS)
    .filter(k => filters[k] && !SCOPE[scope].includes(k))
    .map(k => FILTER_LABELS[k])
}

export function activeFilterKeys(filters) {
  return Object.keys(FILTER_LABELS).filter(k => filters[k])
}

// ── Small helpers ────────────────────────────────────────────

function countBy(list, keyOf) {
  const map = new Map()
  for (const r of list) {
    const k = keyOf(r)
    if (!k) continue
    map.set(k, (map.get(k) || 0) + 1)
  }
  return map
}

function sumByCurrency(orders) {
  const out = {}
  for (const o of orders) out[o.currency] = (out[o.currency] || 0) + o.amount
  return out
}

function median(values) {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const rate = (part, whole) => (whole ? part / whole : null)

/** Currencies present in either period, in COUNTRIES order. */
function currencyOrder(...maps) {
  const seen = new Set(maps.flatMap(m => Object.keys(m)))
  const known = COUNTRY_IDS.map(c => COUNTRY_CURRENCY[c]).filter(c => seen.has(c))
  return [...known, ...[...seen].filter(c => !known.includes(c))]
}

// ── Options for the filter bar ───────────────────────────────

/**
 * Selectable values, derived from the data so a filter never offers an
 * option that can only return nothing. City and treatment narrow to the
 * country / area already chosen.
 */
export function filterOptions(data, filters) {
  const reqs = data?.requests || []
  const uniq = list => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b))

  const offers = new Map()
  for (const o of data?.voucherOrders || []) if (!offers.has(o.offerId)) offers.set(o.offerId, o.offerTitle)

  return {
    countries: COUNTRY_IDS.filter(c => reqs.some(r => r.country === c) || (data?.visits || []).some(v => v.country === c)),
    cities: uniq(reqs.filter(r => !filters.country || r.country === filters.country).map(r => r.city)),
    areas: uniq(reqs.map(r => r.treatmentArea)),
    treatments: uniq(reqs.filter(r => !filters.area || r.treatmentArea === filters.area).map(r => r.treatment)),
    doctors: uniq(reqs.filter(r => !filters.country || r.country === filters.country).map(r => r.doctor)),
    sources: uniq(reqs.map(r => r.source)),
    offers: [...offers.entries()].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title)),
  }
}

// ── The whole screen, in one pass ────────────────────────────

/**
 * Every number the Analytics screen shows, for the given filters.
 * `now` is injectable so tests (and the sample generator) agree on "today".
 */
export function buildAnalytics(data, filters, now = Date.now()) {
  const range = resolveRange(filters, now)
  const { start, end, prevStart, prevEnd } = range
  const unit = bucketUnit(range.days)
  const buckets = makeBuckets(start, end, unit)

  const reqAll = (data?.requests || []).filter(r => matches(r, filters, 'requests', REQUEST_FIELDS))
  const ordAll = (data?.voucherOrders || []).filter(o => matches(o, filters, 'vouchers', VOUCHER_FIELDS))
  const visAll = (data?.visits || []).filter(v => matches(v, filters, 'visits', {}))

  const at = r => new Date(r.createdAt).getTime()
  const oat = o => new Date(o.submittedAt).getTime()
  const vat = v => parseDay(v.date)

  const reqs = reqAll.filter(r => inWindow(at(r), start, end))
  const prevReqs = reqAll.filter(r => inWindow(at(r), prevStart, prevEnd))
  const orders = ordAll.filter(o => inWindow(oat(o), start, end))
  const prevOrders = ordAll.filter(o => inWindow(oat(o), prevStart, prevEnd))
  const visits = visAll.filter(v => inWindow(vat(v), start, end))
  const prevVisits = visAll.filter(v => inWindow(vat(v), prevStart, prevEnd))

  const paid = orders.filter(o => PAID_STATUSES.includes(o.status))
  const prevPaid = prevOrders.filter(o => PAID_STATUSES.includes(o.status))
  const booked = reqs.filter(r => r.status === 'booked')
  const prevBooked = prevReqs.filter(r => r.status === 'booked')
  const visitTotal = visits.reduce((a, v) => a + v.count, 0)
  const prevVisitTotal = prevVisits.reduce((a, v) => a + v.count, 0)

  // ── Headline ──
  const revenue = sumByCurrency(paid)
  const prevRevenue = sumByCurrency(prevPaid)
  const currencies = currencyOrder(revenue, prevRevenue)

  const kpis = {
    revenue: currencies.map(c => ({ currency: c, value: revenue[c] || 0, prev: prevRevenue[c] || 0 })),
    bookings: { value: booked.length, prev: prevBooked.length },
    vouchersSold: { value: paid.length, prev: prevPaid.length },
    visits: { value: visitTotal, prev: prevVisitTotal },
    enquiries: { value: reqs.length, prev: prevReqs.length },
    conversion: { value: rate(booked.length, reqs.length), prev: rate(prevBooked.length, prevReqs.length) },
  }

  // ── Trends ──
  const zero = () => buckets.map(() => 0)
  const enquirySeries = zero()
  const bookedSeries = zero()
  for (const r of reqs) {
    const i = bucketIndex(buckets, at(r))
    if (i < 0) continue
    enquirySeries[i] += 1
    if (r.status === 'booked') bookedSeries[i] += 1
  }
  const visitSeries = zero()
  for (const v of visits) {
    const i = bucketIndex(buckets, vat(v))
    if (i >= 0) visitSeries[i] += v.count
  }
  const soldSeries = zero()
  const revenueSeries = Object.fromEntries(currencies.map(c => [c, zero()]))
  for (const o of paid) {
    const i = bucketIndex(buckets, oat(o))
    if (i < 0) continue
    soldSeries[i] += 1
    revenueSeries[o.currency][i] += o.amount
  }

  // ── Revenue by country (each in its own currency) ──
  const revenueByCountry = COUNTRY_IDS
    .map(country => {
      const own = paid.filter(o => o.country === country)
      const perCurrency = sumByCurrency(own)
      return { country, orders: own.length, amounts: currencyOrder(perCurrency).map(c => ({ currency: c, value: perCurrency[c] })) }
    })
    .filter(r => r.orders)

  // ── Vouchers ──
  const byOffer = new Map()
  for (const o of paid) {
    const row = byOffer.get(o.offerId) || { id: o.offerId, label: o.offerTitle, sold: 0, amounts: {} }
    row.sold += 1
    row.amounts[o.currency] = (row.amounts[o.currency] || 0) + o.amount
    byOffer.set(o.offerId, row)
  }
  const topOffers = [...byOffer.values()]
    .sort((a, b) => b.sold - a.sold)
    .map(r => ({ ...r, amounts: currencyOrder(r.amounts).map(c => ({ currency: c, value: r.amounts[c] })) }))

  const statusCounts = countBy(orders, o => o.status)
  const voucherPipeline = Object.keys(VOUCHER_STATUS_LABELS).map(s => ({
    key: s, label: VOUCHER_STATUS_LABELS[s], value: statusCounts.get(s) || 0,
  }))
  const gifts = paid.filter(o => o.isGift).length

  // ── Funnel ──
  const contacted = reqs.filter(r => r.status !== 'new').length
  const funnel = [
    { key: 'visits', label: 'Website visits', value: visitTotal },
    { key: 'enquiries', label: 'Enquiries', value: reqs.length },
    { key: 'contacted', label: 'Contacted', value: contacted },
    { key: 'booked', label: 'Booked', value: booked.length },
  ]
  const responseHours = reqs
    .filter(r => r.respondedAt)
    .map(r => (new Date(r.respondedAt).getTime() - at(r)) / HOUR)
    .filter(h => Number.isFinite(h) && h >= 0)
  const prevResponseHours = prevReqs
    .filter(r => r.respondedAt)
    .map(r => (new Date(r.respondedAt).getTime() - at(r)) / HOUR)
    .filter(h => Number.isFinite(h) && h >= 0)

  // ── Breakdowns (enquiries + bookings per value) ──
  function breakdown(keyOf) {
    const rows = new Map()
    for (const r of reqs) {
      const k = keyOf(r)
      if (!k) continue
      const row = rows.get(k) || { key: k, label: k, enquiries: 0, booked: 0 }
      row.enquiries += 1
      if (r.status === 'booked') row.booked += 1
      rows.set(k, row)
    }
    return [...rows.values()]
      .map(r => ({ ...r, rate: rate(r.booked, r.enquiries) }))
      .sort((a, b) => b.enquiries - a.enquiries || a.label.localeCompare(b.label))
  }

  const visitsByCountry = new Map()
  for (const v of visits) visitsByCountry.set(v.country, (visitsByCountry.get(v.country) || 0) + v.count)
  const countries = breakdown(r => r.country).map(row => ({
    ...row,
    visits: visitsByCountry.get(row.key) || 0,
    revenue: revenueByCountry.find(c => c.country === row.key)?.amounts || [],
  }))

  // ── Patients (enquirers) ──
  // "New" means their first-ever enquiry falls in this window — judged
  // against all history the filters allow, not just the window itself.
  const firstSeen = new Map()
  for (const r of reqAll) {
    const t = at(r)
    if (!firstSeen.has(r.person) || t < firstSeen.get(r.person)) firstSeen.set(r.person, t)
  }
  const people = new Set(reqs.map(r => r.person))
  const prevPeople = new Set(prevReqs.map(r => r.person))
  let newPeople = 0
  for (const p of people) if (inWindow(firstSeen.get(p), start, end)) newPeople += 1

  return {
    range, unit, buckets,
    kpis,
    trends: {
      enquiries: enquirySeries,
      booked: bookedSeries,
      visits: visitSeries,
      vouchersSold: soldSeries,
      revenue: revenueSeries,
    },
    currencies,
    revenueByCountry,
    vouchers: {
      topOffers, pipeline: voucherPipeline, requested: orders.length,
      gifts, personal: paid.length - gifts,
    },
    funnel,
    responseTime: { value: median(responseHours), prev: median(prevResponseHours), sample: responseHours.length },
    treatments: breakdown(r => r.treatment),
    areas: breakdown(r => r.treatmentArea),
    countries,
    cities: breakdown(r => r.city),
    clinics: breakdown(r => r.clinic),
    doctors: breakdown(r => r.doctor),
    unassignedDoctor: reqs.filter(r => !r.doctor).length,
    patients: {
      unique: { value: people.size, prev: prevPeople.size },
      newcomers: newPeople,
      returning: people.size - newPeople,
      sources: breakdown(r => r.source),
    },
  }
}

// ── Formatting ───────────────────────────────────────────────

export function fmtNum(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

/** Compact form for axis ticks and tight tiles: 1,284 · 12.9K · 4.2M. */
export function fmtCompact(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`
  if (a >= 1e4) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K`
  return Math.round(n).toLocaleString('en-US')
}

export function fmtMoney(currency, n) {
  return `${currency} ${fmtNum(n)}`
}

export function fmtPct(r, digits = 1) {
  if (r == null || !Number.isFinite(r)) return '—'
  return `${(r * 100).toFixed(digits).replace(/\.0$/, '')}%`
}

export function fmtHours(h) {
  if (h == null || !Number.isFinite(h)) return '—'
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0).replace(/\.0$/, '')} h`
  return `${(h / 24).toFixed(1).replace(/\.0$/, '')} days`
}

/**
 * Change against the previous period as a signed fraction, or null when
 * there's nothing to compare with (a jump from zero isn't a percentage).
 */
export function delta(value, prev) {
  if (value == null || prev == null || !Number.isFinite(value) || !Number.isFinite(prev) || prev === 0) return null
  return (value - prev) / prev
}
