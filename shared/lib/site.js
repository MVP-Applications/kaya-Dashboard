/**
 * Where the public Kaya site lives.
 *
 * The dashboard is now a standalone app, so "View site" and "View page" have
 * to point at the real website rather than at a route in this project. Set
 * NEXT_PUBLIC_SITE_URL in .env.local (and in the host's environment variables)
 * to override the default.
 */
const RAW = process.env.NEXT_PUBLIC_SITE_URL || 'https://kaya.rvamp.com'

/** No trailing slash, so joining a path never doubles the separator. */
export const SITE_URL = RAW.replace(/\/+$/, '')

/** Absolute URL for a site path, e.g. siteUrl('/about') → https://…/about. */
export function siteUrl(path = '/') {
  const clean = String(path || '/')
  return `${SITE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`
}
