'use client'
import { PROVIDER_LABELS, PROVIDER_SHORT } from '@/lib/admin/customers'

/** Small pieces shared by the Customers list and profile. */

export function relativeDate(iso) {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProviderBadges({ providers = [] }) {
  return (
    <span className="ad-cu-providers">
      {providers.map(p => (
        <span key={p} className={`ad-cu-provider ad-cu-provider--${p.toLowerCase()}`} title={PROVIDER_LABELS[p]}>{PROVIDER_SHORT[p] || p}</span>
      ))}
    </span>
  )
}
