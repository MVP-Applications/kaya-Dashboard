'use client'

/**
 * Reusable image field: preview + upload (stored as a data URL in the mock)
 * or a pasted URL / path. Used by the review & voucher forms.
 */
export default function ImagePicker({ value, onChange, icon = '🖼', variant = '' }) {
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }

  const isData = typeof value === 'string' && value.startsWith('data:')

  return (
    <div className="ad-image-field">
      <div className={`ad-image-preview ${variant}`}>
        {value
          ? <img src={value} alt="" />
          : (
            <div className="ad-image-ph">
              <span className="ad-image-ph-icon" aria-hidden="true">{icon}</span>
              <span>No image</span>
            </div>
          )}
      </div>
      <div className="ad-image-actions">
        <label className="ad-btn ad-btn--soft ad-file-btn">
          {value ? 'Replace' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleFile} hidden />
        </label>
        {value && (
          <button type="button" className="ad-btn ad-btn--ghost" onClick={() => onChange('')}>
            Remove
          </button>
        )}
        <label className="ad-field ad-image-url">
          <span className="ad-field-label">or paste URL / path</span>
          <input className="ad-input" value={isData ? '' : (value || '')}
            placeholder="/Assets/…"
            onChange={e => onChange(e.target.value)} />
        </label>
      </div>
    </div>
  )
}
