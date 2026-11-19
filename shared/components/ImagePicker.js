'use client'
import { useEffect, useState } from 'react'

// The preview fits inside this box, in the shape the website shows the image.
const PREVIEW_W = 200
const PREVIEW_H = 150

// What the upload endpoint accepts (kaya-nest-api media.controller.admin.ts).
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
const MAX_BYTES = 10 * 1024 * 1024
// How far a picture's shape may drift from the slot's before we warn.
const RATIO_TOLERANCE = 0.15

/**
 * Reusable image field: preview + upload (uploaded on save) or a pasted URL /
 * path. `hint` says what size/shape the site shows it at.
 *
 * `ratio` (width ÷ height) gives the preview the website's shape, so the
 * admin sees the crop visitors will get. `fit: 'contain'` shows the whole
 * image instead — for logos and images the site never crops.
 *
 * `recommended` ({ width, height }) is the upload size the slot needs; a
 * picked file smaller than that, or a different shape from `ratio`, gets a
 * warning (it still saves). Files the server won't take are refused here.
 *
 * With `onFocusChange`, clicking the preview sets the focal point (`focus`,
 * "x% y%") — the part of the picture the website keeps in view when it crops.
 */
export default function ImagePicker({
  value, onChange, icon = '🖼', variant = '', hint = '', ratio = null, fit = 'cover',
  recommended = null, focus = '', onFocusChange,
}) {
  const [problem, setProblem] = useState('')
  const [warning, setWarning] = useState('')

  // A new value (another record, or Remove) clears the last file's notes.
  useEffect(() => { if (!value) { setProblem(''); setWarning('') } }, [value])

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setProblem('Choose a JPEG, PNG, WebP, GIF, AVIF or SVG image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setProblem(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Images can be up to 10 MB.`)
      return
    }
    setProblem('')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      measure(dataUrl).then(size => setWarning(sizeWarning(size, recommended, ratio)))
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function pickFocus(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    onFocusChange(`${clamp(x)}% ${clamp(y)}%`)
  }

  const isData = typeof value === 'string' && value.startsWith('data:')
  const box = ratio
    ? (ratio >= PREVIEW_W / PREVIEW_H
      ? { width: PREVIEW_W, height: Math.round(PREVIEW_W / ratio) }
      : { width: Math.round(PREVIEW_H * ratio), height: PREVIEW_H })
    : undefined
  const focusable = Boolean(value && onFocusChange && fit !== 'contain')
  const [fx, fy] = parseFocus(focus)

  return (
    <div className="ad-image-field">
      <div
        className={`ad-image-preview ${variant}${fit === 'contain' ? ' ad-image-preview--contain' : ''}${focusable ? ' ad-image-preview--focus' : ''}`}
        style={box}
        onClick={focusable ? pickFocus : undefined}
        title={focusable ? 'Click the part of the picture that must stay in view' : undefined}
      >
        {value
          ? <img src={value} alt="" style={focus ? { objectPosition: focus } : undefined} />
          : (
            <div className="ad-image-ph">
              <span className="ad-image-ph-icon" aria-hidden="true">{icon}</span>
              <span>No image</span>
            </div>
          )}
        {focusable && focus && <span className="ad-image-focus-dot" style={{ left: `${fx}%`, top: `${fy}%` }} aria-hidden="true" />}
      </div>
      <div className="ad-image-actions">
        <label className="ad-btn ad-btn--soft ad-file-btn">
          {value ? 'Replace' : 'Upload'}
          <input type="file" accept={ACCEPTED_TYPES.join(',')} onChange={handleFile} hidden />
        </label>
        {value && (
          <button type="button" className="ad-btn ad-btn--ghost" onClick={() => onChange('')}>
            Remove
          </button>
        )}
        {hint && <p className="ad-fieldset-hint ad-image-hint">{hint}</p>}
        {focusable && (
          <p className="ad-fieldset-hint ad-image-hint">
            Focal point: {focus || 'centre'}. Click the preview to change it.
            {focus && <> <button type="button" className="ad-link-btn" onClick={() => onFocusChange('')}>Reset</button></>}
          </p>
        )}
        {problem && <p className="ad-field-error" role="alert">{problem}</p>}
        {!problem && warning && <p className="ad-image-warning" role="status">{warning}</p>}
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

const clamp = n => Math.min(100, Math.max(0, n))

function parseFocus(focus) {
  const m = /^(\d{1,3})% (\d{1,3})%$/.exec(focus || '')
  return m ? [Number(m[1]), Number(m[2])] : [50, 50]
}

function measure(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** A friendly note when a picture is smaller or a different shape than its slot needs, else ''. */
function sizeWarning(size, recommended, ratio) {
  if (!size || !size.width || !size.height) return ''
  const notes = []
  if (recommended && (size.width < recommended.width || size.height < recommended.height)) {
    notes.push(`It's ${size.width} × ${size.height} px, smaller than the recommended ${recommended.width} × ${recommended.height} px, so it may look soft on large screens.`)
  }
  if (ratio && Math.abs(size.width / size.height - ratio) / ratio > RATIO_TOLERANCE) {
    notes.push('Its shape differs from this slot, so the website will crop it. Check the preview and set the focal point.')
  }
  return notes.join(' ')
}
