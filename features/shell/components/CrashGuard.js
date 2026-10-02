'use client'
import { Component } from 'react'

/**
 * Last line of defence against a blank screen.
 *
 * When a render throws, React unmounts the whole tree — the page goes white
 * with the reason only visible in the console. That is close to undebuggable
 * for someone who isn't opening devtools, and it leaves them with no way out:
 * the "Reset sample data" button that would fix a bad stored state is inside
 * the tree that just disappeared.
 *
 * So this catches the error, shows what happened, and offers the one action
 * that resolves the common cause — clearing data left by an earlier build.
 */
export default class CrashGuard extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Still log it — devtools remains the better view when it's available.
    console.error('Dashboard crashed:', error, info?.componentStack)
  }

  clearAndReload = () => {
    try {
      Object.keys(window.localStorage)
        .filter(k => k.startsWith('kaya_admin_'))
        .forEach(k => window.localStorage.removeItem(k))
    } catch {
      /* storage may be unavailable — reloading is still worth a try */
    }
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="ad-crash">
        <div className="ad-crash-card">
          <h1 className="ad-crash-title">The dashboard couldn&apos;t start</h1>
          <p className="ad-crash-text">
            This is usually data saved by an earlier version of the dashboard.
            Clearing it fixes the page — nothing on the live site is affected.
          </p>
          <button className="ad-btn ad-btn--primary" onClick={this.clearAndReload}>
            Clear saved data &amp; reload
          </button>
          <details className="ad-crash-details">
            <summary>Technical details</summary>
            <pre>{String(error?.stack || error?.message || error)}</pre>
          </details>
        </div>
      </div>
    )
  }
}
