/**
 * Icons an admin can pick for content cards (e.g. the About page's
 * principles). Content stores the `key`; the website draws the `symbol`.
 * kaya-website mirrors this list in lib/contentIcons.js — change both
 * together, and never rename a key that's already in use (saved content
 * would lose its icon).
 */
export const CONTENT_ICONS = [
  { key: 'medical', symbol: '⚕', label: 'Medical' },
  { key: 'circle', symbol: '◎', label: 'Circle' },
  { key: 'infinity', symbol: '♾', label: 'Infinity' },
  { key: 'star', symbol: '✦', label: 'Star' },
  { key: 'sparkle', symbol: '✧', label: 'Sparkle' },
  { key: 'heart', symbol: '♡', label: 'Heart' },
  { key: 'flower', symbol: '✿', label: 'Flower' },
  { key: 'diamond', symbol: '◆', label: 'Diamond' },
  { key: 'sun', symbol: '☼', label: 'Sun' },
  { key: 'check', symbol: '✓', label: 'Check' },
]

/** Options for a `select` field: "⚕  Medical". */
export const CONTENT_ICON_OPTIONS = CONTENT_ICONS.map(i => ({ value: i.key, label: `${i.symbol}  ${i.label}` }))
