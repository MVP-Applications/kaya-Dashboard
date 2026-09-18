'use client'
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  fetchAll,
  persistServices, removeService, reorderServices,
  persistVerticals, removeVertical,
  persistCategories, removeCategory, reorderCategories,
  persistDoctors, removeDoctor, reorderDoctors,
  persistReviews, removeReview,
  persistVouchers, removeVoucher, reorderVouchers,
  persistLocations, removeLocation,
  persistPageSection, persistSiteSection,
  fetchRequestsPage, fetchRequestStatusCounts, fetchRequestCountries,
  persistRequestStatus, persistRequestNotes, removeRequestRecord,
  fetchUsers, updateUserRole,
  fetchOverrides, persistOverrideSection,
  isDemoMode, resetDemo as resetDemoData,
} from '@/lib/admin/store'
import { resolveContent, setOverride, clearSectionOverride } from '@/lib/admin/country-content'
import { COUNTRY_IDS } from '@/lib/countries'
import { signIn, signOut, getCurrentUser, onAuthChange, can } from '@/lib/admin/auth'

const AdminContext = createContext(null)

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within <AdminProvider>')
  return ctx
}

const EMPTY = {
  services: [], verticals: [], categories: [], doctors: [], reviews: [],
  vouchers: [], locations: [], pages: {}, site: {},
}

const EMPTY_REQUEST_STATUS_COUNTS = { new: 0, contacted: 0, booked: 0, closed: 0, total: 0 }

export function AdminProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [services, setServices] = useState([])
  const [verticals, setVerticals] = useState([])
  const [categories, setCategories] = useState([])
  const [doctors, setDoctors] = useState([])
  const [reviews, setReviews] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [requestStatusCounts, setRequestStatusCounts] = useState(EMPTY_REQUEST_STATUS_COUNTS)
  const [pages, setPages] = useState({})
  const [site, setSite] = useState({})
  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  // '' means "all countries" — editing the shared copy every market inherits.
  const [activeCountry, setActiveCountry] = useState('')
  const [overrides, setOverrides] = useState({})

  // Guards against a slow load from a previous session overwriting fresh state
  // after a sign-out / sign-in.
  const loadToken = useRef(0)

  function applyAll(data) {
    setServices(data.services)
    setVerticals(data.verticals)
    setCategories(data.categories)
    setDoctors(data.doctors)
    setReviews(data.reviews)
    setVouchers(data.vouchers)
    setLocations(data.locations)
    setPages(data.pages)
    setSite(data.site)
  }

  /**
   * Pull everything. Safe to call repeatedly.
   *
   * Content and country overrides load INDEPENDENTLY. They were briefly loaded
   * together with Promise.all, which meant a failure fetching overrides —
   * secondary data most installations don't even have — rejected the whole
   * thing, applyAll never ran, and every list rendered empty. Optional data
   * must not be able to take the catalogue down with it.
   */
  const refresh = useCallback(async () => {
    const token = ++loadToken.current
    setLoading(true)

    // Overrides first and on their own terms: failing here is survivable, so
    // it must not reach the catch below.
    try {
      const ov = await fetchOverrides()
      if (token === loadToken.current) setOverrides(ov || {})
    } catch (e) {
      if (token === loadToken.current) setOverrides({})
      console.error('Country overrides could not be loaded; using shared copy.', e)
    }

    // Same treatment: the sidebar badge going stale is not worth taking the
    // whole catalogue load down over.
    try {
      const counts = await fetchRequestStatusCounts()
      if (token === loadToken.current) setRequestStatusCounts(counts)
    } catch (e) {
      if (token === loadToken.current) setRequestStatusCounts(EMPTY_REQUEST_STATUS_COUNTS)
      console.error('Enquiry status counts could not be loaded.', e)
    }

    try {
      const data = await fetchAll()
      if (token !== loadToken.current) return
      applyAll(data)
      setError('')
    } catch (e) {
      if (token !== loadToken.current) return
      setError(e.message)
    } finally {
      if (token === loadToken.current) setLoading(false)
    }
  }, [])

  /** Staff list, loaded alongside the content. */
  const refreshUsers = useCallback(async () => {
    try {
      setUsers(await fetchUsers())
    } catch {
      // A non-admin can only read their own profile; an empty list is the
      // correct outcome there, not an error worth interrupting them with.
      setUsers([])
    }
  }, [])

  // ── Session ───────────────────────────────────────────
  // Resolve any stored session on mount, then follow auth changes (including
  // sign-out in another tab).
  useEffect(() => {
    let alive = true

    getCurrentUser()
      .then(u => { if (alive) setUser(u) })
      .catch(() => {})
      .finally(() => { if (alive) setReady(true) })

    const unsubscribe = onAuthChange(u => {
      if (!alive) return
      setUser(u)
      if (!u) {
        loadToken.current++
        applyAll(EMPTY)
      }
    })

    return () => { alive = false; unsubscribe() }
  }, [])

  // Load content once signed in; drop it on sign-out.
  useEffect(() => {
    if (!user) return
    refresh()
    refreshUsers()
  }, [user, refresh, refreshUsers])

  // Errors used to sit until someone clicked the banner's × — auto-clear so
  // a stale message doesn't linger over whatever the admin does next.
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(timer)
  }, [error])

  // ── Auth ──────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await signIn(email, password)
    if (res.ok) setUser(res.user)
    return res
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setUser(null)
    loadToken.current++
    applyAll(EMPTY)
  }, [])

  const allowed = useCallback(action => can(user, action), [user])

  /**
   * Optimistically apply `next`, persist it, and roll back to `prev` if the
   * write fails — so the screen never shows a change the database rejected.
   */
  const commit = useCallback(async (prev, next, setList, persist) => {
    setList(next)
    setSaving(true)
    try {
      await persist(next)
      setError('')
      return true
    } catch (e) {
      setList(prev)
      setError(e.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  /**
   * Shared upsert for every keyed collection.
   *
   * Editing a record's own key (a slug rename, for Services/Doctors — the
   * only two collections keyed by something the form lets you edit) used to
   * be handled as delete-then-recreate, because the old Supabase-backed
   * `persist` had no identity beyond that key. It doesn't need to be: every
   * record fetched from the real API now carries its actual backend `id`
   * (see doctorToRecord/treatmentToService), and `persistServices`/
   * `persistDoctors` already prefer that id over a slug lookup when
   * deciding PUT vs POST — so a renamed record with a real `id` is just a
   * normal in-place update, same as any other field edit. Delete-first is
   * now only the fallback for a record with no `id` yet (new/unsaved, or a
   * collection — none currently — still running the old local-only
   * contract), where the key really is the only identity there is.
   */
  const upsertInto = useCallback(async (
    { list, setList, persist, remove, keyOf }, record, originalKey,
  ) => {
    const newKey = keyOf(record)
    const exists = originalKey != null && list.some(r => keyOf(r) === originalKey)
    const renamed = exists && originalKey !== newKey

    if (renamed && !record.id) {
      setSaving(true)
      try {
        await remove(originalKey)
      } catch (e) {
        setError(`Could not rename to "${newKey}" — the previous record could not be removed. ${e.message}`)
        setSaving(false)
        return false
      }
      setSaving(false)
    }

    const next = exists
      ? list.map(r => (keyOf(r) === originalKey ? record : r))
      : [record, ...list]

    return commit(list, next, setList, persist)
  }, [commit])

  /** Shared delete for every keyed collection. */
  const deleteFrom = useCallback(async (
    { list, setList, remove, keyOf, reorder }, key,
  ) => {
    const prev = list
    const next = list.filter(r => keyOf(r) !== key)
    setList(next)
    setSaving(true)
    try {
      await remove(key)
      // Rewrite the remaining rows' `displayOrder` so it stays gap-free after
      // a removal — only meaningful for collections with a backend
      // displayOrder/reorder endpoint (Verticals, Reviews, Locations don't
      // have one, see KA-38 for Reviews, so `reorder` is undefined for them).
      // This calls the dedicated reorder-only endpoint, not a full resave of
      // every untouched record — that used to re-PUT (and thus revalidate)
      // every surviving record for no reason, so one record with an
      // unrelated bad field could fail the whole delete and make the row
      // reappear in the UI even though it had already been removed.
      if (reorder) await reorder(next)
      setError('')
      return true
    } catch (e) {
      setList(prev)
      setError(e.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  // One descriptor per collection, rebuilt only when its list changes. Keeping
  // them in a single memo means every CRUD callback below has exactly one
  // dependency, instead of silently capturing a stale list.
  const cols = useMemo(() => {
    const bySlug = r => r.slug
    const byId = r => r.id
    return {
      services: { list: services, setList: setServices, persist: persistServices, remove: removeService, keyOf: bySlug, reorder: reorderServices },
      verticals: { list: verticals, setList: setVerticals, persist: persistVerticals, remove: removeVertical, keyOf: byId },
      categories: { list: categories, setList: setCategories, persist: persistCategories, remove: removeCategory, keyOf: bySlug, reorder: reorderCategories },
      doctors: { list: doctors, setList: setDoctors, persist: persistDoctors, remove: removeDoctor, keyOf: bySlug, reorder: reorderDoctors },
      reviews: { list: reviews, setList: setReviews, persist: persistReviews, remove: removeReview, keyOf: byId },
      vouchers: { list: vouchers, setList: setVouchers, persist: persistVouchers, remove: removeVoucher, keyOf: byId, reorder: reorderVouchers },
      locations: { list: locations, setList: setLocations, persist: persistLocations, remove: removeLocation, keyOf: byId },
    }
  }, [services, verticals, categories, doctors, reviews, vouchers, locations])

  // ── Collection CRUD ───────────────────────────────────
  // Verticals and locations append (they render as ordered settings lists);
  // everything else prepends so a newly created record is visible immediately.
  const appendTo = useCallback((col, record) => (
    commit(col.list, [...col.list, record], col.setList, col.persist)
  ), [commit])

  /**
   * Move a record one place up or down.
   *
   * Display order is stored as the `sort` column, which is written from array
   * position on every list save — so reordering is just swapping two entries
   * and persisting the list.
   */
  const move = useCallback((name, key, direction) => {
    const col = cols[name]
    const from = col.list.findIndex(r => col.keyOf(r) === key)
    const to = from + direction
    if (from === -1 || to < 0 || to >= col.list.length) return

    const next = [...col.list]
    ;[next[from], next[to]] = [next[to], next[from]]
    return commit(col.list, next, col.setList, col.persist)
  }, [cols, commit])

  const moveUp = useCallback((name, key) => move(name, key, -1), [move])
  const moveDown = useCallback((name, key) => move(name, key, 1), [move])

  const upsertService = useCallback((r, k) => upsertInto(cols.services, r, k), [cols, upsertInto])
  const deleteService = useCallback(k => deleteFrom(cols.services, k), [cols, deleteFrom])

  const upsertVertical = useCallback((record, originalId) => {
    const exists = originalId != null && cols.verticals.list.some(v => v.id === originalId)
    return exists
      ? upsertInto(cols.verticals, record, originalId)
      : appendTo(cols.verticals, record)
  }, [cols, upsertInto, appendTo])
  const deleteVertical = useCallback(k => deleteFrom(cols.verticals, k), [cols, deleteFrom])

  const upsertCategory = useCallback((r, k) => upsertInto(cols.categories, r, k), [cols, upsertInto])
  const deleteCategory = useCallback(k => deleteFrom(cols.categories, k), [cols, deleteFrom])

  const upsertDoctor = useCallback((r, k) => upsertInto(cols.doctors, r, k), [cols, upsertInto])
  const deleteDoctor = useCallback(k => deleteFrom(cols.doctors, k), [cols, deleteFrom])

  const upsertReview = useCallback((r, k) => upsertInto(cols.reviews, r, k), [cols, upsertInto])
  const deleteReview = useCallback(k => deleteFrom(cols.reviews, k), [cols, deleteFrom])

  const upsertVoucher = useCallback((r, k) => upsertInto(cols.vouchers, r, k), [cols, upsertInto])
  const deleteVoucher = useCallback(k => deleteFrom(cols.vouchers, k), [cols, deleteFrom])

  const upsertLocation = useCallback((record, originalId) => {
    const exists = originalId != null && cols.locations.list.some(l => l.id === originalId)
    return exists
      ? upsertInto(cols.locations, record, originalId)
      : appendTo(cols.locations, record)
  }, [cols, upsertInto, appendTo])
  const deleteLocation = useCallback(k => deleteFrom(cols.locations, k), [cols, deleteFrom])

  // ── Requests (consumer submissions) ───────────────────
  // Staff don't create these — they arrive from the public site. Unlike every
  // other collection above, this one is server-paginated/filtered (KA-23):
  // RequestsView asks for exactly the page it needs instead of the whole
  // inbox living in context, so all that's shared here is the status counts
  // (for the sidebar badge and the screen's summary chips) and the two
  // mutations, which both need to keep those counts in sync afterwards.
  const refreshRequestStatusCounts = useCallback(async () => {
    try {
      setRequestStatusCounts(await fetchRequestStatusCounts())
    } catch {
      // the badge/chips simply don't update this time
    }
  }, [])

  const loadRequestsPage = useCallback(filters => fetchRequestsPage(filters), [])
  const loadRequestCountries = useCallback(() => fetchRequestCountries(), [])

  const updateRequestStatus = useCallback(async (id, status) => {
    setSaving(true)
    try {
      const updated = await persistRequestStatus(id, status)
      setError('')
      refreshRequestStatusCounts()
      return updated
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }, [refreshRequestStatusCounts])

  /** Its own endpoint (KA-31) — unlike updateRequestStatus, this never touches status/respondedBy/respondedAt, so it doesn't need to refresh the status counts. */
  const updateRequestNotes = useCallback(async (id, notes) => {
    setSaving(true)
    try {
      const updated = await persistRequestNotes(id, notes)
      setError('')
      return updated
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  const deleteRequestRecord = useCallback(async id => {
    setSaving(true)
    try {
      await removeRequestRecord(id)
      setError('')
      refreshRequestStatusCounts()
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }, [refreshRequestStatusCounts])

  // ── Website content ───────────────────────────────────
  // Page copy is a fixed tree (page → section → field) rather than a list, so
  // it's patched section by section instead of upserted by id. Each save writes
  // exactly one row, so two editors on different sections never collide.
  const updatePageSection = useCallback(async (pageId, sectionId, patch) => {
    const prev = pages
    const merged = { ...prev[pageId]?.[sectionId], ...patch }
    setPages({ ...prev, [pageId]: { ...prev[pageId], [sectionId]: merged } })
    setSaving(true)
    try {
      await persistPageSection(pageId, sectionId, merged)
      setError('')
    } catch (e) {
      setPages(prev)
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [pages])

  const updateSiteSection = useCallback(async (groupId, sectionId, patch) => {
    const prev = site
    const merged = { ...prev[groupId]?.[sectionId], ...patch }
    setSite({ ...prev, [groupId]: { ...prev[groupId], [sectionId]: merged } })
    setSaving(true)
    try {
      await persistSiteSection(groupId, sectionId, merged)
      setError('')
    } catch (e) {
      setSite(prev)
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [site])

  // ── Country-scoped content ────────────────────────────
  // Views read these instead of `pages`/`site` directly, so switching country
  // changes what every editor screen shows without each one knowing how
  // overrides work.
  // Memoised because the `|| {}` fallback would otherwise mint a fresh object
  // every render, defeating the two memos below.
  const countryOverrides = useMemo(
    () => (activeCountry ? (overrides[activeCountry] || {}) : null),
    [activeCountry, overrides],
  )

  const resolvedPages = useMemo(
    () => (countryOverrides ? resolveContent(pages, countryOverrides) : pages),
    [pages, countryOverrides],
  )
  const resolvedSite = useMemo(
    () => (countryOverrides ? resolveContent(site, countryOverrides) : site),
    [site, countryOverrides],
  )

  /**
   * Save a section. With no country selected this edits the shared copy; with
   * one selected it records an override for that country only, so shared copy
   * stays editable in one place.
   */
  const saveSection = useCallback(async (scope, groupId, sectionId, patch) => {
    const baseTree = scope === 'site' ? site : pages
    const setTree = scope === 'site' ? setSite : setPages
    const persistBase = scope === 'site' ? persistSiteSection : persistPageSection

    if (!activeCountry) {
      const prev = baseTree
      const merged = { ...prev[groupId]?.[sectionId], ...patch }
      setTree({ ...prev, [groupId]: { ...prev[groupId], [sectionId]: merged } })
      setSaving(true)
      try {
        await persistBase(groupId, sectionId, merged)
        setError('')
      } catch (e) {
        setTree(prev)
        setError(e.message)
      } finally {
        setSaving(false)
      }
      return
    }

    const prev = overrides
    let next = overrides[activeCountry] || {}
    for (const [key, value] of Object.entries(patch)) {
      next = setOverride(next, baseTree, groupId, sectionId, key, value)
    }

    const all = { ...prev }
    if (Object.keys(next).length) all[activeCountry] = next
    else delete all[activeCountry]

    setOverrides(all)
    setSaving(true)
    try {
      await persistOverrideSection(activeCountry, groupId, sectionId, next[groupId]?.[sectionId] || {})
      setError('')
    } catch (e) {
      setOverrides(prev)
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [activeCountry, overrides, pages, site])

  /** Drop a country's overrides for one section, back to the shared copy. */
  const resetSectionToShared = useCallback(async (groupId, sectionId) => {
    if (!activeCountry) return
    const prev = overrides
    const next = clearSectionOverride(overrides[activeCountry] || {}, groupId, sectionId)

    const all = { ...prev }
    if (Object.keys(next).length) all[activeCountry] = next
    else delete all[activeCountry]

    setOverrides(all)
    setSaving(true)
    try {
      await persistOverrideSection(activeCountry, groupId, sectionId, {})
      setError('')
    } catch (e) {
      setOverrides(prev)
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [activeCountry, overrides])

  // ── Users + roles ─────────────────────────────────────
  const setUserRole = useCallback(async (id, role) => {
    const prev = users
    setUsers(users.map(u => (u.id === id ? { ...u, role } : u)))
    setSaving(true)
    try {
      await updateUserRole(id, role)
      setError('')
    } catch (e) {
      setUsers(prev)
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [users])

  /** Preview only — restore every collection to its seed. */
  const resetDemo = useCallback(async () => {
    resetDemoData()
    await refresh()
    await refreshUsers()
  }, [refresh, refreshUsers])

  const value = {
    ready, demoMode: isDemoMode,
    loading, saving, error, dismissError: () => setError(''),
    refresh, resetDemo,
    user, login, logout, allowed,
    services, upsertService, deleteService,
    verticals, upsertVertical, deleteVertical,
    categories, upsertCategory, deleteCategory,
    doctors, upsertDoctor, deleteDoctor,
    reviews, upsertReview, deleteReview,
    vouchers, upsertVoucher, deleteVoucher,
    requestStatusCounts,
    loadRequestsPage, loadRequestCountries,
    updateRequestStatus, updateRequestNotes, deleteRequestRecord,
    pages: resolvedPages, updatePageSection,
    site: resolvedSite, updateSiteSection,
    basePages: pages, baseSite: site,
    countries: COUNTRY_IDS,
    activeCountry, setActiveCountry,
    overrides: countryOverrides,
    // The full map, so the switcher can show how much each market differs.
    allOverrides: overrides,
    saveSection, resetSectionToShared,
    locations, upsertLocation, deleteLocation,
    users, setUserRole, refreshUsers,
    moveUp, moveDown,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}
