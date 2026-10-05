/**
 * Authentication + roles, backed by kaya-nest-api.
 *
 * The backend issues a short-lived access token (returned in the response
 * body, sent back as `Authorization: Bearer`) and a long-lived refresh token
 * (an httpOnly cookie it manages entirely). The access token is kept in
 * memory only (shared/lib/api/token.js) — a page reload calls `/auth/refresh` to
 * silently mint a new one from the cookie, so signing in survives a reload
 * the same way Supabase's persisted session used to.
 *
 * Three roles, fixed per role (no per-user permission editor):
 *   super_admin — every country; manages admins, staff and global settings.
 *   admin       — assigned countries/clinics; can delete; manages staff there.
 *   staff       — assigned countries/clinics; create and edit only.
 * Admins and staff only ever see their own countries/clinics — the backend
 * filters every list and rejects writes outside them; `user.countries` /
 * `user.clinics` here only shape the UI (country tabs, pickers, filters).
 *
 * IMPORTANT: `can()` is a UI convenience — it hides buttons a role shouldn't
 * press. It is NOT the security boundary; the backend's own role guards are.
 */
import { apiRequest, onSessionExpired } from '@/shared/lib/api/client'
import { ApiEndpoints } from '@/shared/lib/api/endpoints'
import { setAccessToken, clearAccessToken } from '@/shared/lib/api/token'
import { isApiConfigured } from '@/shared/lib/api/config'
import { loadSession, saveSession, clearSession, demoUsers } from '@/shared/lib/store'

export {
  ROLE_LABELS, PERMISSIONS, can, ROLE_TO_BACKEND, ROLE_FROM_BACKEND, isSuperAdmin,
} from '@/shared/lib/roles'
import { ROLE_LABELS, ROLE_FROM_BACKEND } from '@/shared/lib/roles'

/** Build the app-level user object the dashboard renders from a staff profile. */
function toUser(staff) {
  const role = ROLE_FROM_BACKEND[staff.role] || 'staff'
  return {
    id: staff.id,
    email: staff.email || '',
    name: staff.name || (staff.email || '').split('@')[0],
    title: ROLE_LABELS[role] || '',
    role,
    // Country.code of each assigned country — empty for super admins, who see every country.
    countries: (staff.countries || []).map(c => c.code),
    // Assigned clinic ids — empty means every clinic in `countries`.
    clinics: (staff.clinics || []).map(c => c.id),
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
