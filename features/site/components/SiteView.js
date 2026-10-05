'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ContentEditor from '@/shared/components/ContentEditor'
import CountryNotice from '@/shared/components/CountryNotice'
import { SITE_GROUPS, seedSite } from '@/shared/lib/content'
import { useQuery } from '@/shared/hooks/useUrlState'

/** Site-wide content: the footer, and the brand/contact details reused everywhere. */
export default function SiteView() {
  const { site, saveSection, allowed, activeCountry } = useAdmin()
  // The active tab is ?tab=<group id>; the first group is the default and is
  // left out of the URL.
  const { get, href } = useQuery()
  const tab = get('tab', SITE_GROUPS[0].id)

  // Kept for the per-section "Revert" action, which restores the original copy.
  const seeded = useMemo(() => seedSite(), [])

  const group = SITE_GROUPS.find(g => g.id === tab) || SITE_GROUPS[0]
  // Footer & Global are global settings — only a super admin changes them.
  const canManage = allowed('manageSettings')

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Footer &amp; Global</h1>
          <p className="ad-view-sub">Content that appears on every page of the site.</p>
        </div>
      </div>

      {!canManage && <div className="ad-note">Only a super admin can change these settings.</div>}

      <div className="ad-cf-tabs">
        {SITE_GROUPS.map(g => (
          <Link key={g.id}
            className={`ad-cf-tab${group.id === g.id ? ' active' : ''}`}
            href={href({ tab: g.id === SITE_GROUPS[0].id ? '' : g.id })}>
            <span aria-hidden="true">{g.icon}</span> {g.label}
          </Link>
        ))}
      </div>

      <ContentEditor
        group={group}
        values={site[group.id]}
        seed={seeded[group.id]}
        canEdit={canManage}
        onSave={(sectionId, sectionValues) => saveSection('site', group.id, sectionId, sectionValues)}
      >
        <span className="ad-cf-count">{group.hint}</span>
      </ContentEditor>
    </div>
  )
}
