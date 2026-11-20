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

/**
 * Every website page lives under /<country>/<language>, like the old
 * kayaskinclinic.com (kaya-website/shared/lib/sitePath.js). Links from the
 * dashboard open the UAE English version.
 */
export const SITE_PREFIX = '/uae/en'

/**
 * A site path → its address on the website: the prefix, the sections'
 * current names (/doctors → /meet-the-experts, /blogs → /know-skin-hair) and
 * no trailing slash. Mirrors localizePath in kaya-website.
 */
export function sitePath(path = '/') {
  const raw = String(path || '/')
  const cut = raw.search(/[?#]/)
  const p = (cut === -1 ? raw : raw.slice(0, cut)).replace(/^(?!\/)/, '/')
  const tail = cut === -1 ? '' : raw.slice(cut)
  const clean = (p.replace(/\/+$/, '') || '/')
    .replace(/^\/doctors(?=\/|$)/, '/meet-the-experts')
    .replace(/^\/blogs(?=\/|$)/, '/know-skin-hair')
  return `${SITE_PREFIX}${clean === '/' ? '' : clean}${tail}`
}

/** Absolute URL for a site path, e.g. siteUrl('/about') → https://…/uae/en/about. */
export function siteUrl(path = '/') {
  return `${SITE_URL}${sitePath(path)}`
}
