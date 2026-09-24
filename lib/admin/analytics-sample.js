/**
 * Sample history for the Analytics screen in preview mode.
 *
 * The preview inbox only holds a handful of enquiries and voucher requests —
 * far too few for a trend line — and nothing records website visits at all.
 * This builds ~180 days of plausible activity from the catalogue that IS in
 * the browser (treatments, verticals, doctors, clinics, voucher offers), so
 * every chart and filter has something real-shaped to work against.
 *
 * It is deterministic — a fixed-seed PRNG, dates relative to today — so the
 * numbers don't jump between reloads, and nothing is written to storage.
 * The Analytics screen labels all of it "Sample data".
 *
 * The shape returned is the contract a future analytics endpoint should meet
 * (see lib/admin/analytics.js), so swapping this out touches nothing upstream.
 */
import { COUNTRY_IDS, COUNTRY_CURRENCY, normaliseCountry } from '@/lib/countries'

export const SAMPLE_DAYS = 180

const DAY = 86_400_000
const HOUR = 3_600_000

// Share of traffic per market, and how much each market's visits turn into
// enquiries / voucher orders. Rough, but consistent enough to read as real.
const MARKET = {
  UAE: { visits: 430, enquiryRate: 0.012, vouchers: 1.1 },
  KSA: { visits: 190, enquiryRate: 0.011, vouchers: 0.5 },
  Oman: { visits: 70, enquiryRate: 0.012, vouchers: 0.2 },
}

// Sample-only conversion from the AED list price, so orders from KSA and Oman
// carry their own currency. Real orders will carry what was actually charged.
const FROM_AED = { AED: 1, SAR: 1.02, OMR: 0.105 }

// Busier midweek, quieter on Fridays (Sun=0 … Sat=6).
const WEEKDAY = [1.05, 1.1, 1.08, 1.06, 1.0, 0.72, 0.86]

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Whole-number draw with the given mean (Poisson via Knuth, fine for small means). */
function poisson(rand, mean) {
  const l = Math.exp(-mean)
  let k = 0
  let p = 1
  do { k += 1; p *= rand() } while (p > l)
  return k - 1
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)]
}

function pickWeighted(rand, entries) {
  const total = entries.reduce((a, [, w]) => a + w, 0)
  let r = rand() * total
  for (const [value, w] of entries) {
    r -= w
    if (r <= 0) return value
  }
  return entries[entries.length - 1][0]
}

function roundPrice(amount, currency) {
  if (currency === 'OMR') return Math.max(1, Math.round(amount))
  return Math.max(5, Math.round(amount / 5) * 5)
}

function startOfDay(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Status an enquiry would plausibly have reached, given how old it is. */
function requestStatus(rand, ageHours) {
  if (ageHours < 6) return rand() < 0.85 ? 'new' : 'contacted'
  if (ageHours < 48) return pickWeighted(rand, [['new', 0.3], ['contacted', 0.45], ['booked', 0.2], ['closed', 0.05]])
  return pickWeighted(rand, [['new', 0.03], ['contacted', 0.2], ['booked', 0.36], ['closed', 0.41]])
}

function voucherStatus(rand, ageHours) {
  if (ageHours < 24) return pickWeighted(rand, [['REQUESTED', 0.5], ['PAYMENT_LINK_SENT', 0.35], ['PAID', 0.15]])
  if (ageHours < 24 * 7) return pickWeighted(rand, [['REQUESTED', 0.08], ['PAYMENT_LINK_SENT', 0.22], ['PAID', 0.35], ['FULFILLED', 0.3], ['CANCELLED', 0.05]])
  return pickWeighted(rand, [['PAYMENT_LINK_SENT', 0.04], ['PAID', 0.12], ['FULFILLED', 0.6], ['EXPIRED', 0.17], ['CANCELLED', 0.07]])
}

/**
 * The real (preview) inbox records, reshaped onto the analytics contract so
 * they count alongside the sample history.
 */
function fromInbox(requests, voucherRequests) {
  const reqs = requests.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt || null,
    status: r.status,
    source: r.source,
    country: normaliseCountry(r.country),
    city: r.city || '',
    clinic: r.clinic || '',
    treatmentArea: r.treatmentArea || '',
    treatment: r.treatment || '',
    doctor: r.doctor || '',
    person: (r.email || r.mobile || r.id).toLowerCase(),
  }))

  const currencyCountry = Object.fromEntries(Object.entries(COUNTRY_CURRENCY).map(([c, cur]) => [cur, c]))
  const orders = voucherRequests.map(v => ({
    id: v.id,
    submittedAt: v.submittedAt,
    status: v.status,
    offerId: v.offerId,
    offerTitle: v.offerTitle,
    amount: Number(v.offerPrice) || 0,
    currency: v.offerCurrency || 'AED',
    country: normaliseCountry(v.country) || currencyCountry[v.offerCurrency] || 'UAE',
    isGift: Boolean(v.isGift),
  }))

  return { reqs, orders }
}

/**
 * @returns {{
 *   sample: true, generatedAt: string, since: string,
 *   requests: object[], voucherOrders: object[],
 *   visits: { date: string, country: string, count: number }[],
 * }}
 */
export function buildSampleAnalytics({
  services = [], verticals = [], doctors = [], vouchers = [], locations = [],
  requests = [], voucherRequests = [], now = Date.now(),
}) {
  const rand = mulberry32(20260924)
  const today = startOfDay(now)

  const verticalLabel = Object.fromEntries(verticals.map(v => [v.id, v.label]))
  const clinicsIn = Object.fromEntries(COUNTRY_IDS.map(c => [c, locations.filter(l => l.country === c)]))
  // Popular treatments get picked more — a gentle long tail rather than uniform.
  const treatmentWeights = services
    .filter(s => (s.verticals || []).length)
    .map((s, i) => [s, 1 / (1 + i * 0.18)])

  const out = { requests: [], voucherOrders: [], visits: [] }
  let seq = 0

  for (let d = SAMPLE_DAYS - 1; d >= 0; d--) {
    const dayStart = today - d * DAY
    const date = new Date(dayStart)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    // Steady growth across the window, so period comparisons have a story.
    const growth = 0.8 + 0.35 * ((SAMPLE_DAYS - d) / SAMPLE_DAYS)
    const weekday = WEEKDAY[date.getDay()]
    // Today is only partly over.
    const dayShare = d === 0 ? Math.min(1, (now - dayStart) / DAY) : 1

    for (const country of COUNTRY_IDS) {
      const m = MARKET[country]
      if (!m) continue
      const noise = 0.85 + rand() * 0.3
      const visits = Math.round(m.visits * growth * weekday * noise * dayShare)
      out.visits.push({ date: iso, country, count: visits })

      // ── Enquiries ──
      const enquiries = poisson(rand, visits * m.enquiryRate)
      for (let i = 0; i < enquiries; i++) {
        const createdAt = dayStart + (8 + rand() * 15) * HOUR * dayShare
        if (createdAt > now) continue
        const ageHours = (now - createdAt) / HOUR
        const status = requestStatus(rand, ageHours)
        const clinic = clinicsIn[country].length ? pick(rand, clinicsIn[country]) : null

        const service = treatmentWeights.length ? pickWeighted(rand, treatmentWeights) : null
        const verticalId = service ? pick(rand, service.verticals) : ''
        const source = rand() < 0.72 ? 'consultation' : 'concern'
        const matchingDoctors = doctors.filter(doc =>
          (doc.countries || []).some(c => normaliseCountry(c) === country)
          && (doc.verticals || []).includes(verticalId))
        const doctor = source === 'consultation' && matchingDoctors.length && rand() < 0.65
          ? pick(rand, matchingDoctors).name : ''

        // A pool large enough that most people enquire once, some come back.
        const person = `patient-${Math.floor(rand() * 4200)}`
        const respondedAt = status === 'new'
          ? null
          : Math.min(now, createdAt + (0.5 + rand() ** 2 * 36) * HOUR)

        seq += 1
        out.requests.push({
          id: `sample-req-${seq}`,
          createdAt: new Date(createdAt).toISOString(),
          respondedAt: respondedAt ? new Date(respondedAt).toISOString() : null,
          status,
          source,
          country,
          city: clinic?.city || '',
          clinic: clinic?.name || '',
          treatmentArea: verticalLabel[verticalId] || '',
          // Concern-finder enquiries describe symptoms, not a named treatment.
          treatment: source === 'concern' && rand() < 0.6 ? '' : (service?.name || ''),
          doctor,
          person,
        })
      }

      // ── Voucher orders ──
      const offers = vouchers.filter(v => !(v.regions || []).length || v.regions.includes(country))
      const orders = offers.length ? poisson(rand, m.vouchers * growth * weekday * dayShare) : 0
      for (let i = 0; i < orders; i++) {
        const submittedAt = dayStart + (9 + rand() * 14) * HOUR * dayShare
        if (submittedAt > now) continue
        const offer = pickWeighted(rand, offers.map((o, idx) => [o, 1 / (1 + idx * 0.4)]))
        const currency = COUNTRY_CURRENCY[country] || 'AED'
        const base = Number(offer.price) || 0
        const rate = (FROM_AED[currency] || 1) / (FROM_AED[offer.currency] || 1)

        seq += 1
        out.voucherOrders.push({
          id: `sample-vr-${seq}`,
          submittedAt: new Date(submittedAt).toISOString(),
          status: voucherStatus(rand, (now - submittedAt) / HOUR),
          offerId: offer.id,
          offerTitle: offer.title,
          amount: roundPrice(base * rate, currency),
          currency,
          country,
          isGift: rand() < 0.4,
        })
      }
    }
  }

  const inbox = fromInbox(requests, voucherRequests)
  return {
    sample: true,
    generatedAt: new Date(now).toISOString(),
    since: new Date(today - (SAMPLE_DAYS - 1) * DAY).toISOString(),
    requests: [...out.requests, ...inbox.reqs],
    voucherOrders: [...out.voucherOrders, ...inbox.orders],
    visits: out.visits,
  }
}
