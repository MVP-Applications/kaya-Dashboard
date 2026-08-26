/**
 * Holds the current access token in memory only.
 *
 * The refresh token is an httpOnly cookie the backend controls entirely, so
 * the access token doesn't need to survive a reload on its own — a silent
 * refresh call restores it (see getCurrentUser in lib/admin/auth.js). Keeping
 * it out of localStorage/sessionStorage means it's never readable by anything
 * other than this running page.
 */
let accessToken = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}
