'use client'

/**
 * One tab per country the user can access, across the top of the treatment
 * form. A tick marks countries the treatment is offered in; the active tab
 * is the `?tab=` query param (see ServiceForm).
 */
export default function CountryTabs({ countries, active, offered, invalid, onSelect }) {
  return (
    <div className="ad-country-tabs" role="tablist" aria-label="Country">
      {countries.map(c => {
        const isOn = offered.has(c.code)
        const hasError = invalid === c.code
        return (
          <button
            key={c.code}
            type="button"
            role="tab"
            aria-selected={active === c.code}
            className={`ad-country-tab${active === c.code ? ' active' : ''}${isOn ? ' on' : ''}${hasError ? ' error' : ''}`}
            onClick={() => onSelect(c.code)}
          >
            <span className="ad-country-tab-mark" aria-hidden="true">{isOn ? '✓' : '+'}</span>
            {c.name}
            <span className="ad-country-tab-code">{c.code}</span>
          </button>
        )
      })}
    </div>
  )
}
