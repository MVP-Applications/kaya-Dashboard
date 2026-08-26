/**
 * Data layer entry point.
 *
 * Two interchangeable backends implement the same API:
 *
 *   · store-api.js   — kaya-nest-api. Foundation only for now — most of its
 *                      functions aren't connected to real endpoints yet and
 *                      throw a clear "not connected" error until each
 *                      feature is integrated one at a time.
 *   · store-local.js — localStorage, seeded from the current site content.
 *
 * The local one is selected when the API base URL is absent, so the
 * dashboard is fully explorable before a backend exists. Nothing above this
 * module knows which is in play; `isDemoMode` is exported only so the UI can
 * say so honestly rather than implying edits are going live.
 */
import { isApiConfigured } from '@/lib/api/config'
import * as remote from './store-api'
import * as local from './store-local'

export const isDemoMode = !isApiConfigured

const backend = isApiConfigured ? remote : local

export const fetchAll = (...a) => backend.fetchAll(...a)
export const refetchRequests = (...a) => backend.refetchRequests(...a)

export const persistServices = (...a) => backend.persistServices(...a)
export const persistVerticals = (...a) => backend.persistVerticals(...a)
export const persistDoctors = (...a) => backend.persistDoctors(...a)
export const persistReviews = (...a) => backend.persistReviews(...a)
export const persistVouchers = (...a) => backend.persistVouchers(...a)
export const persistLocations = (...a) => backend.persistLocations(...a)

export const removeService = (...a) => backend.removeService(...a)
export const removeVertical = (...a) => backend.removeVertical(...a)
export const removeDoctor = (...a) => backend.removeDoctor(...a)
export const removeReview = (...a) => backend.removeReview(...a)
export const removeVoucher = (...a) => backend.removeVoucher(...a)
export const removeLocation = (...a) => backend.removeLocation(...a)

export const persistPageSection = (...a) => backend.persistPageSection(...a)
export const persistSiteSection = (...a) => backend.persistSiteSection(...a)

export const persistRequestPatch = (...a) => backend.persistRequestPatch(...a)
export const removeRequest = (...a) => backend.removeRequest(...a)
export const subscribeToRequests = (...a) => backend.subscribeToRequests(...a)

export const fetchOverrides = (...a) => backend.fetchOverrides(...a)
export const persistOverrideSection = (...a) => backend.persistOverrideSection(...a)

export const fetchUsers = (...a) => backend.fetchUsers(...a)
export const updateUserRole = (...a) => backend.updateUserRole(...a)

/**
 * Submit an enquiry from the public site.
 *
 * Not called anywhere in this repo — it exists for the separate public
 * website project to import, so the booking form there keeps working the
 * same way regardless of which backend is configured here. In preview mode
 * it records the submission locally so the flow can be demonstrated; against
 * the real API it isn't connected yet (see lib/admin/store-api.js).
 */
export const submitRequest = (...a) => backend.submitRequest(...a)

/** No backend endpoint for this exists yet — see store-api.js. */
export const triggerPublish = (...a) => backend.triggerPublish(...a)

// Preview-only helpers. Guarded so a configured build can never take this path.
export const loadSession = () => (isApiConfigured ? null : local.loadSession())
export const saveSession = u => { if (!isApiConfigured) local.saveSession(u) }
export const clearSession = () => { if (!isApiConfigured) local.clearSession() }
export const demoUsers = () => (isApiConfigured ? [] : local.demoUsers())
export const resetDemo = () => { if (!isApiConfigured) local.resetDemo() }
