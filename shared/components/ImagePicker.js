'use client'

// The preview fits inside this box, in the shape the website shows the image.
const PREVIEW_W = 200
const PREVIEW_H = 150

/**
 * Reusable image field: preview + upload (stored as a data URL in the mock)
 * or a pasted URL / path. `hint` says what size/shape the site shows it at.
 *
 * `ratio` (width ÷ height) gives the preview the website's shape, so the
 * admin sees the crop visitors will get. `fit: 'contain'` shows the whole
 * image instead — for logos and images the site never crops.
 */
export default function ImagePicker({
  value, onChange, icon = '🖼', variant = '', hint = '', ratio = null, fit = 'cover',
}) {
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }

  const isData = typeof value === 'string' && value.startsWith('data:')
  const box = ratio
    ? (ratio >= PREVIEW_W / PREVIEW_H
      ? { width: PREVIEW_W, height: Math.round(PREVIEW_W / ratio) }
      : { width: Math.round(PREVIEW_H * ratio), height: PREVIEW_H })
    : undefined

  return (
    <div className="ad-image-field">
      <div className={`ad-image-preview ${variant}${fit === 'contain' ? ' ad-image-preview--contain' : ''}`} style={box}>
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
        {hint && <p className="ad-fieldset-hint ad-image-hint">{hint}</p>}
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
