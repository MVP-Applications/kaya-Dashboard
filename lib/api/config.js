/**
 * Backend API configuration.
 *
 * A single env var drives everything: its presence decides whether the
 * dashboard talks to the real backend or falls back to the local preview
 * store (see lib/admin/store.js). Mirrors how NEXT_PUBLIC_SUPABASE_URL used
 * to gate that same choice.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export { API_BASE_URL }

/** False when the backend hasn't been wired up yet — the dashboard falls back to preview mode. */
export const isApiConfigured = Boolean(API_BASE_URL)
