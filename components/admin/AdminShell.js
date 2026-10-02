'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdmin } from './AdminContext'
import { ROLE_LABELS } from '@/lib/admin/auth'
import PublishButton from './PublishButton'
import CountrySwitcher from './CountrySwitcher'
import { SITE_URL } from '@/lib/site'
import { viewFromPath, viewHref } from '@/lib/admin/routes'

// Nav is grouped so the catalogue (records) and the website (page copy) read as
// distinct jobs. A group with no label renders its items without a heading.
const NAV_GROUPS = [
  {
    label: '',
    items: [{ id: 'overview', label: 'Overview', icon: '◧' }],
  },
  {
    label: 'Enquiries',
    items: [
      { id: 'requests', label: 'Requests', icon: '✉' },
      { id: 'voucher-requests', label: 'Voucher Requests', icon: '🎟' },
      // `permission` hides the item from roles without it (see PERMISSIONS).
      { id: 'customers', label: 'Customers', icon: '☺', permission: 'viewCustomers' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { id: 'services', label: 'Treatments & Services', icon: '✦' },
      { id: 'verticals', label: 'Verticals', icon: '◈' },
      // `hidden` keeps the view wired up but out of the sidebar.
      { id: 'categories', label: 'Categories', icon: '▣', hidden: true },
      { id: 'tell-us', label: 'Tell Us Everything', icon: '◎' },
      { id: 'doctors', label: 'Doctors', icon: '⚕' },
      { id: 'indulgence', label: 'Indulgence', icon: '🎁' },
      { id: 'reviews', label: 'Reviews', icon: '★', hidden: true },
    ],
  },
  {
    label: 'Website',
    items: [
      { id: 'pages', label: 'Pages', icon: '▤' },
      { id: 'locations', label: 'Clinics', icon: '⌖' },
      { id: 'countries', label: 'Countries', icon: '🌐' },
      { id: 'contacts', label: 'Contacts', icon: '☎' },
      { id: 'site', label: 'Footer & Global', icon: '▭' },
    ],
  },
  {
    label: 'Settings',
    items: [{ id: 'users', label: 'Users & Roles', icon: '👤' }],
  },
]

export default function AdminShell({ children }) {
  const {
    user, logout, requestStatusCounts, refresh, resetDemo, allowed,
    loading, saving, error, dismissError, success, dismissSuccess, demoMode,
  } = useAdmin()
  // The section is the URL, so a refresh or a new tab lands on the same screen.
  const view = viewFromPath(usePathname())
  const [menuOpen, setMenuOpen] = useState(false)

  const newRequests = requestStatusCounts.new

  return (
    <div className={`ad-shell${menuOpen ? ' ad-shell--menu' : ''}`}>
      {/* Sidebar */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-brand">
          <img src="/Assets/kaya-logo-vector.svg" alt="Kaya" className="ad-sidebar-logo" />
          <span className="ad-sidebar-badge">CMS</span>
        </div>

        <nav className="ad-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div className="ad-nav-group" key={group.label || `g${gi}`}>
              {group.label && <div className="ad-nav-divider">{group.label}</div>}
              {group.items.filter(n => !n.hidden && (!n.permission || allowed(n.permission))).map(n => (
                <Link
                  key={n.id}
                  href={viewHref(n.id)}
                  className={`ad-nav-item${view === n.id ? ' active' : ''}`}
                  aria-current={view === n.id ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="ad-nav-icon" aria-hidden="true">{n.icon}</span>
                  {n.label}
                  {n.id === 'requests' && newRequests > 0 && (
                    <span className="ad-nav-badge">{newRequests}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="ad-sidebar-foot">
          {!demoMode && <PublishButton />}
          <button className="ad-reset" onClick={refresh} disabled={loading}>
            {loading ? '↻ Refreshing…' : '↻ Refresh content'}
          </button>
          {demoMode && (
            <button className="ad-reset" onClick={resetDemo} disabled={loading}>
              ↺ Reset sample data
            </button>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="ad-main">
        <header className="ad-topbar">
          <button
            className="ad-menu-toggle"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <span className="ad-topbar-crumb">Kaya CMS</span>
          {/* Never let a preview be mistaken for the live site. */}
          {demoMode && (
            <span className="ad-demo-tag" title="Changes are saved in this browser only">
              Preview mode
            </span>
          )}
          {saving && <span className="ad-saving">Saving…</span>}
          <div className="ad-topbar-right">
            <CountrySwitcher />
            <a href={SITE_URL} className="ad-btn ad-btn--ghost" target="_blank" rel="noreferrer">
              View site ↗
            </a>
            <div className="ad-user">
              <span className="ad-avatar">{user.name.charAt(0)}</span>
              <span className="ad-user-info">
                <span className="ad-user-name">{user.name}</span>
                <span className={`ad-role-pill ad-role-pill--${user.role}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
              <button className="ad-btn ad-btn--ghost ad-logout" onClick={logout}>Sign out</button>
            </div>
          </div>
        </header>

        <main className="ad-content">
          {children}
        </main>
      </div>

      {menuOpen && <div className="ad-scrim" onClick={() => setMenuOpen(false)} />}

      {/* Center-screen cue for an in-flight save — the topbar's "Saving…"
          text is easy to miss, especially once a form has already closed. */}
      {saving && (
        <div className="ad-loading-overlay" role="status" aria-live="polite">
          <div className="ad-loading-pill">
            <span className="ad-spinner" aria-hidden="true" />
            Saving…
          </div>
        </div>
      )}

      {/* Toasts float above the page instead of shifting content around. */}
      <div className="ad-toast-stack" role="status" aria-live="polite">
        {success && (
          <div className="ad-toast ad-toast--success">
            <span className="ad-toast-text">{success}</span>
            <button className="ad-toast-close" onClick={dismissSuccess} aria-label="Dismiss">×</button>
          </div>
        )}
        {error && (
          <div className="ad-toast ad-toast--error" role="alert">
            <span className="ad-toast-text">{error}</span>
            <button className="ad-toast-close" onClick={dismissError} aria-label="Dismiss">×</button>
          </div>
        )}
      </div>
    </div>
  )
}
