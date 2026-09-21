/**
 * The one place that calls fetch() against kaya-nest-api.
 *
 * Unwraps the backend's response envelope ({success, data, meta} on success,
 * {success:false, error:{statusCode, code, message}} on failure) into either
 * a plain { data, meta } result or a thrown ApiError, and transparently
 * retries a request once after a silent token refresh if it comes back 401.
 */
import { API_BASE_URL } from './config'
import { ApiEndpoints } from './endpoints'
import { getAccessToken, setAccessToken, clearAccessToken } from './token'
import { ApiError } from './errors'

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// A 413 almost never carries a JSON body — it's typically thrown by a proxy
// or body-size limit in front of the actual handler, as plain text or HTML,
// which parseBody() above turns into `null`. Without this, that fell back to
// the generic "Something went wrong." and gave no clue the upload was the
// problem.
const STATUS_FALLBACKS = {
  // Kept in sync with the media-upload 413 message in lib/admin/store-api.js
  // (uploadImageIfNeeded) — same wording wherever a 413 can surface.
  413: '413 Request Entity Too Large - please upload a smaller file.',
}

function toApiError(response, body) {
  const err = body?.error
  return new ApiError(
    err?.statusCode ?? response.status,
    err?.code ?? 'UNKNOWN',
    err?.message ?? STATUS_FALLBACKS[response.status] ?? 'Something went wrong.',
  )
}

/**
 * One HTTP call. Not exported — every caller goes through `apiRequest` below
 * so the 401-retry logic only has to live in one place.
 */
async function rawRequest(path, { method = 'GET', body, skipAuth = false } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(!skipAuth && getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    // fetch() rejecting means the request never reached a server at all (DNS,
    // CORS, connection refused, offline) — e.message is always non-empty here
    // (e.g. Chrome's "Failed to fetch", Safari's "Load failed"), but it's the
    // browser's internal wording, not something to show an admin. Always use
    // our own message instead of `e.message || fallback`, which never falls
    // back in practice.
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Please check your connection and try again.')
  }

  const parsed = await parseBody(response)
  if (!response.ok || parsed?.success === false) throw toApiError(response, parsed)
  return { data: parsed?.data ?? null, meta: parsed?.meta ?? null }
}

// After sitting idle, several calls can come back 401 around the same
// moment (this dashboard fires more than one request per action/refresh).
// Each used to call tryRefresh() independently — but the backend rotates
// the refresh token on use, so of several concurrent refresh attempts only
// the first actually succeeds; the rest fail and would each clear the
// access token that the winning call had just set a moment earlier,
// leaving the session broken until a full page reload forced one clean
// attempt. Sharing a single in-flight promise means every pending 401
// waits on the same attempt instead of racing separate ones.
let refreshPromise = null

/** Silent refresh — never throws; returns whether it succeeded. */
function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data } = await rawRequest(ApiEndpoints.auth.refresh, { method: 'POST', skipAuth: true })
        if (!data?.accessToken) return false
        setAccessToken(data.accessToken)
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

// Fired only when a refresh definitively fails — meaning the session itself
// (the httpOnly refresh-token cookie) has expired, not just the short-lived
// access token. lib/admin/auth.js subscribes to this to drop the app back to
// signed-out state, instead of leaving a dashboard that looks fine but
// silently 401s on every action until someone notices and reloads.
const sessionExpiredListeners = new Set()
export function onSessionExpired(handler) {
  sessionExpiredListeners.add(handler)
  return () => sessionExpiredListeners.delete(handler)
}

/**
 * Make an authenticated (or public, with skipAuth) request. On a 401 from a
 * call that isn't itself the refresh/login endpoint, attempts one silent
 * refresh and retries once before giving up.
 */
export async function apiRequest(path, options = {}) {
  try {
    return await rawRequest(path, options)
  } catch (e) {
    const isAuthEndpoint = path === ApiEndpoints.auth.refresh || path === ApiEndpoints.auth.login
    if (e instanceof ApiError && e.statusCode === 401 && !isAuthEndpoint && !options.skipAuth) {
      const refreshed = await tryRefresh()
      if (refreshed) return rawRequest(path, options)
      clearAccessToken()
      for (const l of sessionExpiredListeners) l()
    }
    throw e
  }
}
