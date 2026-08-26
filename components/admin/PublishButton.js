'use client'
import { useState } from 'react'
import { triggerPublish } from '@/lib/admin/store'

/**
 * Publishes edits to the live site.
 *
 * The public site is a static export, so saved changes sit in the database
 * until the site is rebuilt. This triggers that rebuild.
 *
 * There's no backend endpoint for this yet, so triggerPublish() currently
 * always reports "not configured" — see lib/admin/store-api.js.
 */
export default function PublishButton() {
  const [state, setState] = useState('idle') // idle | working | done | error
  const [message, setMessage] = useState('')

  async function publish() {
    if (state === 'working') return
    setState('working')
    setMessage('')

    try {
      const data = await triggerPublish()
      if (data?.ok === false) throw new Error(data.error || 'Publish was refused.')

      setState('done')
      setMessage('Rebuild started — the site updates in a few minutes.')
      setTimeout(() => setState('idle'), 8000)
    } catch (e) {
      setState('error')
      setMessage(e.message || 'Could not start the rebuild.')
    }
  }

  const label = {
    idle: '↑ Publish to site',
    working: '↑ Publishing…',
    done: '✓ Publishing',
    error: '↑ Publish to site',
  }[state]

  return (
    <div className="ad-publish">
      <button
        className="ad-publish-btn"
        onClick={publish}
        disabled={state === 'working'}
      >
        {label}
      </button>
      {message && (
        <p className={`ad-publish-msg${state === 'error' ? ' ad-publish-msg--error' : ''}`}>
          {message}
        </p>
      )}
    </div>
  )
}
