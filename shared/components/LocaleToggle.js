'use client'

/** EN/AR switch for a form that edits both locales — same look wherever it appears. */
export default function LocaleToggle({ locale, onChange }) {
  return (
    <div className="ad-toolbar" role="tablist" aria-label="Language">
      <button type="button" role="tab" aria-selected={locale === 'EN'}
        className={`ad-btn ad-btn--sm ${locale === 'EN' ? 'ad-btn--primary' : 'ad-btn--soft'}`}
        onClick={() => onChange('EN')}>
        English
      </button>
      <button type="button" role="tab" aria-selected={locale === 'AR'}
        className={`ad-btn ad-btn--sm ${locale === 'AR' ? 'ad-btn--primary' : 'ad-btn--soft'}`}
        onClick={() => onChange('AR')}>
        العربية
      </button>
    </div>
  )
}
