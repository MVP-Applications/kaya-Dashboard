'use client'
import { useAdmin } from './AdminContext'

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
 */
export default function CountryFields({ countries, pricing, onChange, showPricing = true, pricingHint }) {
  const { countryRecords } = useAdmin()
  const selected = Array.isArray(countries) ? countries : []
  const prices = normalisePricing(pricing, countryRecords)
  const everywhere = selected.length === 0

  function toggle(code) {
    const next = selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code]
    onChange({ countries: next, pricing: prices })
  }

  function setPrice(code, field, value) {
    onChange({
      countries: selected,
      pricing: { ...prices, [code]: { ...prices[code], [field]: value } },
    })
  }

  return (
    <div className="ad-country-fields">
      <label className="ad-field">
        <span className="ad-field-label">Available in</span>
        <div className="ad-check-row">
          {countryRecords.map(c => (
            <label key={c.code} className="ad-check">
              <input
                type="checkbox"
                checked={everywhere || selected.includes(c.code)}
                onChange={() => toggle(c.code)}
              />
              {c.code}
            </label>
          ))}
        </div>
        <span className="ad-field-hint">
          {everywhere
            ? 'Available in every country. Tick specific countries to limit it.'
            : `Shown only in ${selected.join(', ')}.`}
        </span>
      </label>

      {showPricing && (
        <div className="ad-field">
          <span className="ad-field-label">Price per country</span>
          <div className="ad-price-grid">
            {countryRecords.map(c => {
              const off = !everywhere && !selected.includes(c.code)
              return (
                <div key={c.code} className={`ad-price-row${off ? ' is-off' : ''}`}>
                  <span className="ad-price-country">{c.code}</span>
                  <input
                    className="ad-input ad-price-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="—"
                    value={prices[c.code].price}
                    onChange={e => setPrice(c.code, 'price', e.target.value)}
                    disabled={off}
                  />
                  <input
                    className="ad-input ad-price-cur"
                    type="text"
                    value={prices[c.code].currency}
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
