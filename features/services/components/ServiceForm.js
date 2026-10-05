'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from '@/shared/context/AdminContext'
import { emptyService } from '@/shared/lib/seed'
import { sortCountries } from '@/shared/lib/content'
import { resolveSlug } from '@/shared/lib/slug'
import { useQueryParam } from '@/shared/hooks/useUrlState'
import CountryTabs from '@/features/services/components/CountryTabs'
import TreatmentFields from '@/features/services/components/TreatmentFields'

/** Every field a country tab edits, with defaults for anything missing. */
function draftFrom(record, country) {
  return {
    ...emptyService(),
    cardImage: '', clinics: [], isPopular: false,
    durationMinsAr: '', sessionsAr: '', downtimeNotesAr: '', downtimeLevelAr: '',
    ...record,
    country,
  }
}

const trimList = list => list.map(s => s.trim()).filter(Boolean)
// The backend requires a title per benefit — a row with only an icon or a
// description typed in is dropped as incomplete.
const cleanBenefits = list => list
  .map(b => ({ i: b.i.trim(), t: b.t.trim(), d: b.d.trim() }))
  .filter(b => b.t)

/**
 * Create / edit one treatment. Each country the user can access is a tab
 * with the full form for that country's own version — its own name, slug,
 * copy, images, verticals and clinics. A tab that is switched on is offered
 * in that country; switching an existing one off removes it there on save.
 * Countries the user can't access aren't shown and are never changed.
 */
export default function ServiceForm({ groupId, initialVersions, onClose }) {
  const { services, verticals, saveTreatment, saving, accessibleCountries, activeCountry, allowed } = useAdmin()
  const countries = useMemo(() => sortCountries(accessibleCountries), [accessibleCountries])
  const isNew = !groupId

  const initiallyOffered = useMemo(() => new Set(initialVersions.map(v => v.country)), [initialVersions])
  const [drafts, setDrafts] = useState(() => {
    const byCountry = {}
    countries.forEach(c => {
      byCountry[c.code] = draftFrom(initialVersions.find(v => v.country === c.code), c.code)
    })
    return byCountry
  })
  const [offered, setOffered] = useState(() => {
    if (initialVersions.length) return new Set(initiallyOffered)
    const first = activeCountry || countries[0]?.code
    return new Set(first ? [first] : [])
  })
  const [error, setError] = useState('')
  const [invalidTab, setInvalidTab] = useState('')

  // The open tab is in the URL (?tab=KSA) so a refresh or shared link reopens it.
  const [tabParam, setTab] = useQueryParam('tab')
  const fallbackTab = (activeCountry && countries.some(c => c.code === activeCountry) && activeCountry)
    || [...offered][0] || countries[0]?.code || ''
  const tab = countries.some(c => c.code === tabParam) ? tabParam : fallbackTab
  const tabCountry = countries.find(c => c.code === tab)
  const form = drafts[tab] || draftFrom(null, tab)
  const isOn = offered.has(tab)
  const canRemoveCountry = allowed('delete')
  const title = [...offered].map(code => drafts[code]?.name).find(Boolean) || initialVersions[0]?.name || ''

  function patchDraft(code, patch) {
    setDrafts(d => ({ ...d, [code]: { ...(d[code] || draftFrom(null, code)), ...patch } }))
  }

  function setOn(code, on) {
    setOffered(prev => {
      const next = new Set(prev)
      if (on) next.add(code)
      else next.delete(code)
      return next
    })
  }

  /**
   * Start a country's tab from another country's content — not its clinics
   * (those are per country) or verticals this country doesn't offer.
   */
  function copyFrom(fromCode) {
    const src = drafts[fromCode]
    const here = drafts[tab]
    const offeredHere = new Set(verticals.filter(v => (v.countries || []).includes(tab)).map(v => v.id))
    patchDraft(tab, {
      ...src,
      id: here.id,
      groupId: here.groupId,
      country: tab,
      clinics: [],
      verticals: src.verticals.filter(id => offeredHere.has(id)),
    })
    setOn(tab, true)
  }

  /** One country's draft -> the record the store saves, or an error message. */
  function toVersion(code) {
    const f = drafts[code] || draftFrom(null, code)
    const name = f.name.trim()
    if (!name) return { error: 'Name is required.' }
    const what = f.what.trim()
    if (!what) return { error: '"What it is" is required.' }
    const mechanism = f.mechanism.trim()
    if (!mechanism) return { error: '"How it works" is required.' }

    // Slugs only need to be unique within the country.
    const taken = services
      .filter(s => s.country === code && s.groupId !== groupId)
      .map(s => s.slug)
    const { slug, error: slugError } = resolveSlug(f.slug, name, taken)
    if (slugError) return { error: slugError }

    return {
      version: {
        id: f.id,
        groupId,
        country: code,
        slug,
        name,
        image: f.image,
        cardImage: f.cardImage,
        thumb: f.thumb,
        category: f.category,
        verticals: f.verticals,
        clinics: f.clinics,
        badge: f.badge,
        isPopular: f.isPopular,
        sub: f.sub.trim(),
        what,
        mechanism,
        durationMins: String(f.durationMins).trim(),
        sessions: String(f.sessions).trim(),
        downtimeNotes: f.downtimeNotes.trim(),
        downtimeLevel: f.downtimeLevel.trim(),
        suitable: trimList(f.suitable),
        benefits: cleanBenefits(f.benefits),
        nameAr: f.nameAr.trim(),
        subAr: f.subAr.trim(),
        whatAr: f.whatAr.trim(),
        mechanismAr: f.mechanismAr.trim(),
        suitableAr: trimList(f.suitableAr),
        benefitsAr: cleanBenefits(f.benefitsAr),
        durationMinsAr: String(f.durationMinsAr).trim(),
        sessionsAr: String(f.sessionsAr).trim(),
        downtimeNotesAr: f.downtimeNotesAr.trim(),
        downtimeLevelAr: f.downtimeLevelAr.trim(),
      },
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInvalidTab('')

    const codes = countries.map(c => c.code).filter(code => offered.has(code))
    if (!codes.length) {
      return setError(isNew
        ? 'Turn on at least one country.'
        : 'Turn on at least one country. To remove this treatment everywhere, delete it from the list.')
    }

    const versions = []
    for (const code of codes) {
      const { version, error: err } = toVersion(code)
      if (err) {
        setTab(code)
        setInvalidTab(code)
        return setError(`${countries.find(c => c.code === code)?.name || code}: ${err}`)
      }
      versions.push(version)
    }
    const removedCountries = [...initiallyOffered].filter(code => !offered.has(code))

    const saved = await saveTreatment({ groupId, versions, removedCountries })
    // On failure the error toast is shown and the draft stays open.
    if (saved) onClose()
  }

  if (!countries.length) {
    return (
      <div className="ad-editor">
        <div className="ad-editor-head">
          <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        </div>
        <p className="ad-empty">You don&apos;t have access to any country yet — ask a super admin to assign one.</p>
      </div>
    )
  }

  const otherOffered = countries.filter(c => c.code !== tab && offered.has(c.code))
  const removingExisting = !isOn && initiallyOffered.has(tab)

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New treatment' : 'Edit treatment'}</h1>
          <p className="ad-view-sub">
            {isNew ? 'Create a treatment and fill in its content for each country.' : title}
          </p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create treatment' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body ad-form-sections">
        <CountryTabs countries={countries} active={tab} offered={offered} invalid={invalidTab}
          onSelect={code => { setTab(code); setInvalidTab('') }} />

        <div className="ad-note ad-country-offer">
          <label className="ad-check">
            <input
              type="checkbox"
              checked={isOn}
              disabled={isOn && initiallyOffered.has(tab) && !canRemoveCountry}
              onChange={e => setOn(tab, e.target.checked)}
            />
            Offer this treatment in {tabCountry?.name}
          </label>
          {isOn && initiallyOffered.has(tab) && !canRemoveCountry && (
            <span className="ad-muted">Only an admin can stop offering it in a country.</span>
          )}
          {removingExisting && (
            <span className="ad-form-error">
              Saving will remove this treatment from {tabCountry?.name}. Its content there is deleted.
            </span>
          )}
        </div>

        {isOn ? (
          <TreatmentFields key={tab} country={tab} form={form} onChange={patch => patchDraft(tab, patch)} />
        ) : (
          <div className="ad-fieldset ad-country-off">
            <p>
              {removingExisting
                ? `Turn it back on to keep ${tabCountry?.name}'s version.`
                : `Not offered in ${tabCountry?.name}. Turn it on to add content for ${tabCountry?.name}.`}
            </p>
            <div className="ad-country-off-actions">
              <button type="button" className="ad-btn ad-btn--primary" onClick={() => setOn(tab, true)}>
                {removingExisting ? 'Keep this country' : `Start empty`}
              </button>
              {!removingExisting && otherOffered.map(c => (
                <button key={c.code} type="button" className="ad-btn ad-btn--soft" onClick={() => copyFrom(c.code)}>
                  Copy content from {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
