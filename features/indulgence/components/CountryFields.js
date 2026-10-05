'use client'
import { useAdmin } from '@/shared/context/AdminContext'

// A default currency for a country with no price ever entered for it yet —
// Country itself has no currency field (that's a pricing concern, not part
// of a country's identity), so this stays a small display default, never a
// second list of which countries exist. Falls back to the country's own
// dial-code-adjacent market label when a code isn't in this map.
const DEFAULT_CURRENCY = { UAE: 'AED', KSA: 'SAR', OMAN: 'OMR' }

function normalisePricing(stored, countryRecords) {
  const out = Object.fromEntries(
    countryRecords.map(c => [c.code, { price: '', currency: DEFAULT_CURRENCY[c.code] || '' }]),
  )
  if (!stored || typeof stored !== 'object') return out

  for (const c of countryRecords) {
    const row = stored[c.code]
    if (!row || typeof row !== 'object') continue
    out[c.code] = {
      price: row.price == null ? '' : String(row.price),
      currency: row.currency || DEFAULT_CURRENCY[c.code] || '',
    }
  }
  return out
}

/**
 * Which markets offer a record, and what it costs in each.
 *
 * Availability is stored as a list of country codes, and an EMPTY list means
 * "everywhere". That way a newly created service is live in all markets rather
 * than silently invisible until someone remembers to tick three boxes — the
 * safer default for a catalogue that is mostly shared.
 *
 * Only countries the user can access are offered. A country they can't
 * access that the record is already limited to (another team's market) stays
 * in the value and is shown ticked but read-only, with its price untouched.
 */
export default function CountryFields({ countries, pricing, onChange, showPricing = true, pricingHint }) {
  const { countryRecords, accessibleCountries } = useAdmin()
  const selected = Array.isArray(countries) ? countries : []
  // Pricing is normalised over every country so other teams' prices survive a save.
  const prices = normalisePricing(pricing, countryRecords)
  const everywhere = selected.length === 0
  const accessible = new Set(accessibleCountries.map(c => c.code))
  const locked = selected.filter(code => !accessible.has(code))
  const shown = [
    ...accessibleCountries,
    ...locked.map(code => countryRecords.find(c => c.code === code) || { code, name: code }),
  ]
  // Prices may be missing for a locked code that isn't a known country record.
  const priceOf = code => prices[code] || { price: '', currency: DEFAULT_CURRENCY[code] || '' }

  function toggle(code) {
    if (!accessible.has(code)) return
    const next = selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code]
    onChange({ countries: next, pricing: prices })
  }

  function setPrice(code, field, value) {
    onChange({
      countries: selected,
      pricing: { ...prices, [code]: { ...priceOf(code), [field]: value } },
    })
  }

  return (
    <div className="ad-country-fields">
      <label className="ad-field">
        <span className="ad-field-label">Available in</span>
        <div className="ad-check-row">
          {shown.map(c => {
            const isLocked = !accessible.has(c.code)
            return (
              <label key={c.code} className="ad-check"
                title={isLocked ? 'Managed by another country team' : undefined}>
                <input
                  type="checkbox"
                  checked={everywhere || selected.includes(c.code)}
                  disabled={isLocked}
                  onChange={() => toggle(c.code)}
                />
                {c.code}
              </label>
            )
          })}
        </div>
        <span className="ad-field-hint">
          {everywhere
            ? 'Available in every country. Tick specific countries to limit it.'
            : `Shown only in ${selected.join(', ')}.`}
          {locked.length > 0 && ` ${locked.join(', ')} ${locked.length === 1 ? 'is' : 'are'} managed by another country team.`}
        </span>
      </label>

      {showPricing && (
        <div className="ad-field">
          <span className="ad-field-label">Price per country</span>
          <div className="ad-price-grid">
            {shown.map(c => {
              const off = !accessible.has(c.code) || (!everywhere && !selected.includes(c.code))
              return (
                <div key={c.code} className={`ad-price-row${off ? ' is-off' : ''}`}>
                  <span className="ad-price-country">{c.code}</span>
                  <input
                    className="ad-input ad-price-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="—"
                    value={priceOf(c.code).price}
                    onChange={e => setPrice(c.code, 'price', e.target.value)}
                    disabled={off}
                  />
                  <input
                    className="ad-input ad-price-cur"
                    type="text"
                    value={priceOf(c.code).currency}
                    onChange={e => setPrice(c.code, 'currency', e.target.value)}
                    disabled={off}
                    aria-label={`${c.code} currency`}
                  />
                </div>
              )
            })}
          </div>
          <span className="ad-field-hint">
            {pricingHint || 'Leave a price blank to hide it in that country rather than showing another market\u2019s figure.'}
          </span>
        </div>
      )}
    </div>
  )
}
