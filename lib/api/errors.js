/**
 * Thrown by lib/api/client.js for every failed request, so callers can branch
 * on `statusCode`/`code` instead of parsing a message string.
 */
export class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message || 'Request failed.')
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}
