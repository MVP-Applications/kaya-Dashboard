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

function toApiError(response, body) {
  const err = body?.error
  return new ApiError(
    err?.statusCode ?? response.status,
    err?.code ?? 'UNKNOWN',
    err?.message ?? 'Something went wrong.',
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
    throw new ApiError(0, 'NETWORK_ERROR', e.message || 'Could not reach the server.')
  }

  const parsed = await parseBody(response)
  if (!response.ok || parsed?.success === false) throw toApiError(response, parsed)
  return { data: parsed?.data ?? null, meta: parsed?.meta ?? null }
}

/** Silent refresh — never throws; returns whether it succeeded. */
async function tryRefresh() {
  try {
    const { data } = await rawRequest(ApiEndpoints.auth.refresh, { method: 'POST', skipAuth: true })
    if (!data?.accessToken) return false
    setAccessToken(data.accessToken)
    return true
  } catch {
    return false
  }
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
    }
    throw e
  }
}
