/**
 * Authentication + roles, backed by kaya-nest-api.
 *
 * The backend issues a short-lived access token (returned in the response
 * body, sent back as `Authorization: Bearer`) and a long-lived refresh token
 * (an httpOnly cookie it manages entirely). The access token is kept in
 * memory only (lib/api/token.js) — a page reload calls `/auth/refresh` to
 * silently mint a new one from the cookie, so signing in survives a reload
 * the same way Supabase's persisted session used to.
 *
 * The backend only knows two roles, STAFF and ADMIN — mapped here onto this
 * app's existing 'editor'/'admin' so ROLE_LABELS, PERMISSIONS and every
 * screen that reads user.role stay unchanged.
 *
 * IMPORTANT: `can()` is a UI convenience — it hides buttons a role shouldn't
 * press. It is NOT the security boundary; the backend's own role guards are.
 */
import { apiRequest, onSessionExpired } from '@/lib/api/client'
import { ApiEndpoints } from '@/lib/api/endpoints'
import { setAccessToken, clearAccessToken } from '@/lib/api/token'
import { isApiConfigured } from '@/lib/api/config'
import { loadSession, saveSession, clearSession, demoUsers } from './store'

export const ROLE_LABELS = {
  admin: 'Administrator',
  editor: 'Content Editor',
}

/** Permissions per role. Admins can do everything; editors can't delete, manage users or see analytics (revenue included). */
export const PERMISSIONS = {
  admin: { create: true, edit: true, delete: true, manageUsers: true, viewAnalytics: true },
  editor: { create: true, edit: true, delete: false, manageUsers: false, viewAnalytics: false },
}

export function can(user, action) {
  if (!user) return false
  return Boolean(PERMISSIONS[user.role]?.[action])
}

const ROLE_FROM_BACKEND = { ADMIN: 'admin', STAFF: 'editor' }

/** Build the app-level user object the dashboard renders from a staff profile. */
function toUser(staff) {
  return {
    id: staff.id,
    email: staff.email || '',
    name: staff.name || (staff.email || '').split('@')[0],
    title: ROLE_LABELS[ROLE_FROM_BACKEND[staff.role]] || '',
    role: ROLE_FROM_BACKEND[staff.role] || 'editor',
  }
}

// Same-tab auth-change notifications. There's no server-push session source
// like Supabase's client had, so signIn/signOut notify these directly —
// cross-tab sign-out no longer propagates automatically.
const listeners = new Set()
function notify(user) {
  for (const l of listeners) l(user)
}

// A refresh that definitively fails means the refresh-token cookie itself
// has expired — the session is genuinely over, not just the access token.
// Drop straight back to signed-out state so the dashboard shows the login
// screen on its own, rather than looking signed-in while every action
// quietly 401s until someone reloads.
if (isApiConfigured) onSessionExpired(() => notify(null))

/**
 * Sign in with email + password.
 * Returns { ok: true, user } or { ok: false, error }.
 */
export async function signIn(email, password) {
  // Preview mode: pick whichever demo account was entered. There is no password
  // check because there is no account to protect — this path is unreachable
  // once NEXT_PUBLIC_API_BASE_URL is set.
  if (!isApiConfigured) {
    const wanted = String(email).trim().toLowerCase()
    const users = demoUsers()
    const found = users.find(u => u.email.toLowerCase() === wanted) || users[0]
    if (!found) return { ok: false, error: 'No demo accounts available.' }
    saveSession(found)
    notify(found)
    return { ok: true, user: found }
  }

  try {
    const { data } = await apiRequest(ApiEndpoints.auth.login, {
      method: 'POST',
      body: { email: String(email).trim(), password },
      skipAuth: true,
    })
    setAccessToken(data.accessToken)
    const user = toUser(data.staff)
    notify(user)
    return { ok: true, user }
  } catch (e) {
    return { ok: false, error: e.message || 'Could not sign in.' }
  }
}

export async function signOut() {
  if (!isApiConfigured) {
    clearSession()
    notify(null)
    return
  }
  try {
    await apiRequest(ApiEndpoints.auth.logout, { method: 'POST' })
  } catch {
    /* the token is being dropped locally either way */
  }
  clearAccessToken()
  notify(null)
}

/**
 * Resolve the currently active session into a user, or null when signed out.
 * Called on mount so a refresh doesn't bounce the user back to the login
 * screen — the real path does this via a silent token refresh rather than a
 * stored session, since the access token itself is memory-only.
 */
export async function getCurrentUser() {
  if (!isApiConfigured) return loadSession()

  try {
    const { data } = await apiRequest(ApiEndpoints.auth.me)
    return toUser(data)
  } catch {
    return null
  }
}

/**
 * Subscribe to sign-in / sign-out events so the dashboard follows the
 * session. Returns an unsubscribe function.
 */
export function onAuthChange(handler) {
  listeners.add(handler)
  return () => listeners.delete(handler)
}
