/**
 * Footer link types — mirrors kaya-nest-api's FooterLinkType
 * (src/modules/footer/footer-link-type.enum.ts), which is the source of
 * truth and validates every save. The website mirrors the same values in
 * kaya-website's features/shell/lib/footerLinks.js. Change all three together.
 *
 * - ROUTE:    a page on the website; `url` is the path, e.g. "/about"
 * - EXTERNAL: another site; `url` is a full http(s) address
 * - CALL:     tel: link to the visitor's country phone number (Contacts)
 * - WHATSAPP: WhatsApp chat with the visitor's country number (Contacts)
 */
export const FOOTER_LINK_TYPE = {
  ROUTE: 'ROUTE',
  EXTERNAL: 'EXTERNAL',
  CALL: 'CALL',
  WHATSAPP: 'WHATSAPP',
}

export const FOOTER_LINK_TYPE_OPTIONS = [
  { value: FOOTER_LINK_TYPE.ROUTE, label: 'Website page' },
  { value: FOOTER_LINK_TYPE.EXTERNAL, label: 'External link' },
  { value: FOOTER_LINK_TYPE.CALL, label: 'Call (country phone number)' },
  { value: FOOTER_LINK_TYPE.WHATSAPP, label: 'WhatsApp (country number)' },
]

/** Only these two types carry a url; Call/WhatsApp use the country's Contact. */
export const footerLinkHasUrl = type =>
  type === FOOTER_LINK_TYPE.ROUTE || type === FOOTER_LINK_TYPE.EXTERNAL

// Same rules as the backend's IsFooterLinkUrl validator.
const ROUTE_PATH = /^\/(?!\/)\S*$/
const LOOKS_LIKE_FULL_URL = /https?:\/\/|www\./i
const EXTERNAL_URL = /^https?:\/\/[^\s/?#]+\.[^\s]+$/i

/** Error message for a link's url, or '' when it's fine. */
export function validateFooterLinkUrl(type, url) {
  const value = String(url || '').trim()
  if (type === FOOTER_LINK_TYPE.ROUTE) {
    if (!value) return 'Add the page path, e.g. /about.'
    if (LOOKS_LIKE_FULL_URL.test(value)) return 'Paste only the path after the domain, e.g. /about — no https:// or www.'
    if (!ROUTE_PATH.test(value)) return 'The path must start with a single / and contain no spaces, e.g. /about.'
    return ''
  }
  if (type === FOOTER_LINK_TYPE.EXTERNAL) {
    if (!value) return 'Add the full address, e.g. https://www.instagram.com/kaya.'
    if (!EXTERNAL_URL.test(value)) return 'Use a full address starting with https://, e.g. https://www.instagram.com/kaya.'
    return ''
  }
  return ''
}

/** Social profile links are always external. */
export function validateSocialUrl(url) {
  return validateFooterLinkUrl(FOOTER_LINK_TYPE.EXTERNAL, url)
}
