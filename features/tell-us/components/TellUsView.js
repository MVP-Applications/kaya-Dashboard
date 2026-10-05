'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/shared/context/AdminContext'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import MissingRecord from '@/shared/components/MissingRecord'
import { useQuery } from '@/shared/hooks/useUrlState'
import TellUsQuestionEditor from '@/features/tell-us/components/TellUsQuestionEditor'
import {
  emptyQuestion, newId, flowFor, suggestTreatments, plainHeading, sharedUsage, validateTellUs, NOT_SURE, areaKey,
} from '@/shared/lib/tell-us'

function cloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

/** "What is your *gender*?" rendered with its emphasis, as the website shows it. */
function Heading({ text }) {
  const parts = String(text || '').split('*')
  return <>{parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>))}</>
}

function moved(list, i, dir) {
  const to = i + dir
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[i], next[to]] = [next[to], next[i]]
  return next
}

// ── "Try it" — walk the flow and see what would be suggested ──

function TryIt({ doc, areaId, areaLabel, areaTreatments }) {
  const [answers, setAnswers] = useState({})
  useEffect(() => { setAnswers({}) }, [areaId])

  const flow = flowFor(doc, areaId)
  const suggested = suggestTreatments(doc, areaId, answers, areaTreatments.map(t => t.id))
  const nameOf = Object.fromEntries(areaTreatments.map(t => [t.id, t.name]))
  const answeredOwn = flow.some(q => !q.isShared && (answers[q.id] || []).length)

  function pick(q, optionId) {
    setAnswers(a => {
      const cur = a[q.id] || []
      if (optionId === NOT_SURE) return { ...a, [q.id]: cur.includes(NOT_SURE) ? [] : [NOT_SURE] }
      const base = cur.filter(x => x !== NOT_SURE)
      if (!q.multiple) return { ...a, [q.id]: base.includes(optionId) ? [] : [optionId] }
      return { ...a, [q.id]: base.includes(optionId) ? base.filter(x => x !== optionId) : [...base, optionId] }
    })
  }

  return (
    <div className="ad-panel ad-tu-try">
      <div className="ad-panel-head">
        <h2 className="ad-panel-title">Try it</h2>
        <p className="ad-an-note">How the website asks {areaLabel}, with your unsaved changes.</p>
      </div>
      {!flow.length && <p className="ad-an-empty">No questions are asked — people go straight to the treatments.</p>}
      {flow.map((q, n) => (
        <div key={q.id} className="ad-tu-try-q">
          <div className="ad-tu-try-hd">
            <span className="ad-tu-num">{n + 1}</span>
            <span><Heading text={q.heading || 'Untitled question'} /></span>
          </div>
          <div className="ad-tu-try-opts">
            {q.options.map(o => (
              <button key={o.id} type="button"
                className={`ad-tu-chip${(answers[q.id] || []).includes(o.id) ? ' active' : ''}`}
                onClick={() => pick(q, o.id)}>
                {o.label || 'Untitled'}
              </button>
            ))}
            {!q.isShared && q.notSure && (
              <button type="button"
                className={`ad-tu-chip ad-tu-chip--ghost${(answers[q.id] || []).includes(NOT_SURE) ? ' active' : ''}`}
                onClick={() => pick(q, NOT_SURE)}>
                {q.notSureLabel || 'Not sure'}
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="ad-tu-try-result">
        <span className="ad-field-label">
          {answeredOwn ? 'Would be suggested' : 'Suggested before any answer'} · {suggested.length}
        </span>
        {suggested.length ? (
          <div className="ad-tu-try-opts">
            {suggested.map(s => <span key={s} className="ad-badge">{nameOf[s] || s}</span>)}
          </div>
        ) : (
          <p className="ad-an-empty">No treatments are in {areaLabel} yet.</p>
        )}
      </div>
    </div>
  )
}

// ── Screen ───────────────────────────────────────────────────

// `services` holds one version per country, so names repeat — show the country.
const treatmentOption = s => ({ id: s.id, name: s.country ? `${s.name} · ${s.country}` : s.name })

export default function TellUsView() {
  const { tellUs, tellUsError, saveTellUs, verticals, services, allowed, saving, dataVersion } = useAdmin()
  // Tell Us is a global setting — only a super admin changes it.
  const canManage = allowed('manageSettings')
  const canDelete = canManage

  // The tab (?tab=<area>, 'shared' is the default and left out) and the
  // expanded question (?item=<question or step id>) live in the URL. The
  // draft, validation problems and confirm dialog stay local.
  const { get, set, href } = useQuery()
  const tab = get('tab', 'shared')
  const openId = get('item') || null
  const setOpenId = id => set({ item: id || '' })
  const tabHref = id => href({ tab: id === 'shared' ? '' : id, item: '' })

  const [draft, setDraft] = useState(null)
  const [problems, setProblems] = useState([])
  const [confirm, setConfirm] = useState(null) // { title, body, run }

  // Start (or restart) the draft from whatever is saved.
  useEffect(() => { if (tellUs && !draft) setDraft(cloneSafe(tellUs)) }, [tellUs, draft])

  const dirty = useMemo(
    () => Boolean(draft && tellUs && JSON.stringify(draft) !== JSON.stringify(tellUs)),
    [draft, tellUs],
  )

  // Leaving the page with unsaved edits asks first.
  useEffect(() => {
    // Read-only viewers can't save, so there's nothing to lose.
    if (!dirty || !canManage) return
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, canManage])

  // Areas are keyed by the pillar's backend id (areaKey); services link to
  // verticals by `v.id` (the slug against the live API), so resolve the
  // vertical first. Treatments are identified by their id.
  const verticalFor = key => verticals.find(v => areaKey(v) === key)
  const areaLabel = key => verticalFor(key)?.label || key
  const areaIds = draft ? verticals.map(areaKey).filter(key => draft.areas[key]) : []
  const treatmentsIn = key => {
    const v = verticalFor(key)
    return v ? services.filter(s => (s.verticals || []).includes(v.id)).map(treatmentOption) : []
  }
  const allTreatments = services.map(treatmentOption)

  if (tellUsError) {
    return (
      <div className="ad-view">
        <div className="ad-view-head"><div><h1 className="ad-view-title">Tell Us Everything</h1></div></div>
        <div className="ad-panel ad-blog-unavailable"><strong>The questionnaire can&apos;t be loaded.</strong> {tellUsError}</div>
      </div>
    )
  }
  if (!draft) {
    return <div className="ad-view"><div className="ad-panel ad-an-loading">Loading…</div></div>
  }
  if (tab !== 'shared' && !areaIds.includes(tab)) {
    return <MissingRecord loading={dataVersion === 0} label="main treatment" backHref={tabHref('shared')} backLabel="← Shared questions" />
  }

  const setShared = (i, q) => setDraft(d => ({ ...d, shared: d.shared.map((x, j) => (j === i ? q : x)) }))
  const setSteps = (areaId, fn) => setDraft(d => ({ ...d, areas: { ...d.areas, [areaId]: { steps: fn(d.areas[areaId].steps) } } }))

  function addShared() {
    const q = { ...emptyQuestion(), eyebrow: 'A little more about you' }
    setDraft(d => ({
      ...d,
      shared: [...d.shared, q],
      // Asked everywhere by default; each main treatment can switch it off.
      areas: Object.fromEntries(Object.entries(d.areas).map(([id, a]) => [id, { steps: [...a.steps, { id: newId('step'), shared: q.id, enabled: true }] }])),
    }))
    setOpenId(q.id)
  }

  function removeShared(q) {
    setDraft(d => ({
      ...d,
      shared: d.shared.filter(x => x.id !== q.id),
      areas: Object.fromEntries(Object.entries(d.areas).map(([id, a]) => [id, { steps: a.steps.filter(s => s.shared !== q.id) }])),
    }))
  }

  function addOwn(areaId) {
    const step = { id: newId('step'), question: { ...emptyQuestion(), multiple: true, notSure: true }, enabled: true }
    setSteps(areaId, steps => [...steps, step])
    setOpenId(step.id)
  }

  async function save() {
    const found = validateTellUs(draft, areaLabel)
    setProblems(found)
    if (found.length) return
    if (await saveTellUs(draft)) setDraft(null)
  }

  const sharedById = Object.fromEntries(draft.shared.map(q => [q.id, q]))

  return (
    <div className="ad-view ad-tu">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Tell Us Everything</h1>
          <p className="ad-view-sub">The questions the website asks after someone picks a main treatment, and the treatments their answers suggest.</p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" disabled={!dirty || saving}
            onClick={() => { setDraft(null); setProblems([]); setOpenId(null) }}>
            Discard changes
          </button>
          <button type="button" className="ad-btn ad-btn--primary" disabled={!canManage || !dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {!canManage && <div className="ad-note">Only a super admin can change these settings.</div>}
      {canManage && dirty && <div className="ad-tu-dirty" role="status">You have unsaved changes. They apply to the website once saved.</div>}
      {problems.length > 0 && (
        <div className="ad-form-error ad-tu-problems" role="alert">
          <strong>Fix these before saving:</strong>
          <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className="ad-tu-tabs" role="tablist">
        <Link role="tab" aria-selected={tab === 'shared'}
          className={`ad-tu-tab${tab === 'shared' ? ' active' : ''}`} href={tabHref('shared')}>
          Shared questions
        </Link>
        {areaIds.map(id => (
          <Link key={id} role="tab" aria-selected={tab === id}
            className={`ad-tu-tab${tab === id ? ' active' : ''}`} href={tabHref(id)}>
            {areaLabel(id)}
            <span className="ad-tu-tab-n">{flowFor(draft, id).length}</span>
          </Link>
        ))}
      </div>

      {tab === 'shared' ? (
        <div className="ad-tu-main">
          <p className="ad-tu-intro">
            Written once and used by every main treatment. Switch one off for a specific treatment in its own tab.
            These answers are saved on the enquiry but don&apos;t change which treatments are suggested.
          </p>
          <div className="ad-tu-steps">
            {draft.shared.map((q, i) => {
              const usage = sharedUsage(draft, q.id)
              const open = openId === q.id
              return (
                <div key={q.id} className={`ad-tu-step${open ? ' open' : ''}`}>
                  <div className="ad-tu-step-row">
                    <span className="ad-tu-step-main">
                      <span className="ad-tu-step-title"><span><Heading text={q.heading || 'Untitled question'} /></span></span>
                      <span className="ad-tu-step-meta">
                        {q.options.length} answers · {q.multiple ? 'several allowed' : 'one answer'} · asked in {usage.on.length} of {usage.on.length + usage.off.length}
                        {usage.off.length > 0 && <> · skipped in {usage.off.map(areaLabel).join(', ')}</>}
                      </span>
                    </span>
                    <span className="ad-tu-step-actions">
                      <button type="button" className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => setOpenId(open ? null : q.id)}>
                        {open ? 'Close' : 'Edit'}
                      </button>
                      {canDelete && (
                        <button type="button" className="ad-btn ad-btn--danger ad-btn--sm"
                          onClick={() => setConfirm({
                            title: 'Remove shared question?',
                            body: <>“{plainHeading(q.heading) || 'Untitled question'}” will stop being asked in every main treatment.</>,
                            run: () => removeShared(q),
                          })}>
                          Remove
                        </button>
                      )}
                    </span>
                  </div>
                  {open && <TellUsQuestionEditor shared question={q} onChange={next => setShared(i, next)} />}
                </div>
              )
            })}
          </div>
          {canManage && <button type="button" className="ad-btn ad-btn--soft" onClick={addShared}>+ Add shared question</button>}
        </div>
      ) : (
        <div className="ad-tu-cols">
          <div className="ad-tu-main">
            <p className="ad-tu-intro">
              Asked in this order after someone picks <strong>{areaLabel(tab)}</strong>. Switch off any shared question this treatment doesn&apos;t need.
            </p>
            <div className="ad-tu-steps">
              {draft.areas[tab].steps.map((s, i, all) => {
                const q = s.shared ? sharedById[s.shared] : s.question
                const open = openId === s.id
                const linked = s.question ? s.question.options.filter(o => o.treatments.length).length : 0
                return (
                  <div key={s.id} className={`ad-tu-step${open ? ' open' : ''}${s.enabled ? '' : ' off'}`}>
                    <div className="ad-tu-step-row">
                      <span className="ad-reorder">
                        <button type="button" className="ad-reorder-btn" disabled={i === 0} aria-label="Move up"
                          onClick={() => setSteps(tab, steps => moved(steps, i, -1))}>▲</button>
                        <button type="button" className="ad-reorder-btn" disabled={i === all.length - 1} aria-label="Move down"
                          onClick={() => setSteps(tab, steps => moved(steps, i, 1))}>▼</button>
                      </span>
                      <span className="ad-tu-step-main">
                        <span className="ad-tu-step-title">
                          <span><Heading text={q.heading || 'Untitled question'} /></span>
                          <span className={`ad-tu-kind ad-tu-kind--${s.shared ? 'shared' : 'own'}`}>{s.shared ? 'Shared' : 'Only here'}</span>
                        </span>
                        <span className="ad-tu-step-meta">
                          {q.options.length} answers · {q.multiple ? 'several allowed' : 'one answer'}
                          {!s.shared && <> · {linked} of {q.options.length} suggest treatments</>}
                        </span>
                      </span>
                      <span className="ad-tu-step-actions">
                        <label className="ad-tu-toggle">
                          <input type="checkbox" checked={s.enabled}
                            onChange={e => setSteps(tab, steps => steps.map(x => (x.id === s.id ? { ...x, enabled: e.target.checked } : x)))} />
                          {s.enabled ? 'Asked' : 'Skipped'}
                        </label>
                        {s.shared ? (
                          <Link className="ad-btn ad-btn--ghost ad-btn--sm" href={href({ tab: '', item: s.shared })}>
                            Edit wording
                          </Link>
                        ) : (
                          <button type="button" className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => setOpenId(open ? null : s.id)}>
                            {open ? 'Close' : 'Edit'}
                          </button>
                        )}
                        {!s.shared && canDelete && (
                          <button type="button" className="ad-btn ad-btn--danger ad-btn--sm"
                            onClick={() => setConfirm({
                              title: 'Remove question?',
                              body: <>“{plainHeading(q.heading) || 'Untitled question'}” will no longer be asked in {areaLabel(tab)}.</>,
                              run: () => setSteps(tab, steps => steps.filter(x => x.id !== s.id)),
                            })}>
                            Remove
                          </button>
                        )}
                      </span>
                    </div>
                    {open && s.question && (
                      <TellUsQuestionEditor
                        question={s.question}
                        areaLabel={areaLabel(tab)}
                        areaTreatments={treatmentsIn(tab)}
                        allTreatments={allTreatments}
                        onChange={next => setSteps(tab, steps => steps.map(x => (x.id === s.id ? { ...x, question: next } : x)))}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            {canManage && (
              <button type="button" className="ad-btn ad-btn--soft" onClick={() => addOwn(tab)}>
                + Add a question for {areaLabel(tab)}
              </button>
            )}
          </div>
          <TryIt doc={draft} areaId={tab} areaLabel={areaLabel(tab)} areaTreatments={treatmentsIn(tab)} />
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          confirmLabel="Remove"
          // Nothing is gone until Save — "Discard changes" brings it back.
          consequenceNote=""
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.run(); setConfirm(null); setOpenId(null) }}
        >
          {confirm.body} Nothing changes on the website until you save.
        </ConfirmDialog>
      )}
    </div>
  )
}
