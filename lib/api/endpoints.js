/**
 * Every route kaya-nest-api exposes, in one place, so no component or store
 * file ever hardcodes a URL. Grouped by backend module.
 *
 * Only `auth` is called from anywhere today — the rest are scaffolding for
 * the feature-by-feature integrations to come, so wiring one up later never
 * requires touching this file's shape, only adding a call that uses it.
 */
const V1 = '/api/v1'

export const ApiEndpoints = {
  auth: {
    login: `${V1}/admin/auth/login`,
    refresh: `${V1}/admin/auth/refresh`,
    logout: `${V1}/admin/auth/logout`,
    me: `${V1}/admin/auth/me`,
  },

  auditLogs: {
    list: `${V1}/admin/audit-logs`,
    loginAttempts: `${V1}/admin/login-attempts`,
  },

  // Not live on kaya-nest-api yet — the routes follow the same convention as
  // every other module so the Blog screen only needs its flag flipped (see
  // BLOGS_API_READY in lib/admin/store-api.js). Adjust here if they differ.
  blogs: {
    adminList: `${V1}/admin/blogs`,
    adminById: id => `${V1}/admin/blogs/${id}`,
    publicList: `${V1}/public/blogs`,
    publicBySlug: slug => `${V1}/public/blogs/${slug}`,
  },

  categories: {
    adminList: `${V1}/admin/categories`,
    adminById: id => `${V1}/admin/categories/${id}`,
    adminReorder: `${V1}/admin/categories/reorder`,
  },

  clinics: {
    adminList: `${V1}/admin/clinics`,
    adminById: id => `${V1}/admin/clinics/${id}`,
    publicList: `${V1}/public/clinics`,
    publicById: id => `${V1}/public/clinics/${id}`,
  },

  doctors: {
    adminList: `${V1}/admin/doctors`,
    adminById: id => `${V1}/admin/doctors/${id}`,
    adminReorder: `${V1}/admin/doctors/reorder`,
    publicList: `${V1}/public/doctors`,
    publicBySlug: slug => `${V1}/public/doctors/${slug}`,
  },

  footer: {
    admin: `${V1}/admin/footer`,
    public: `${V1}/public/footer`,
  },

  globalConfig: {
    admin: `${V1}/admin/global`,
    public: `${V1}/public/global`,
  },

  health: {
    check: `${V1}/health`,
  },

  indulgence: {
    adminList: `${V1}/admin/indulgence`,
    adminById: id => `${V1}/admin/indulgence/${id}`,
    adminReorder: `${V1}/admin/indulgence/reorder`,
    publicList: `${V1}/public/indulgence`,
  },

  leads: {
    adminList: `${V1}/admin/leads`,
    adminExportCsv: `${V1}/admin/leads/export.csv`,
    adminRespond: id => `${V1}/admin/leads/${id}/respond`,
    adminNotes: id => `${V1}/admin/leads/${id}/notes`,
    adminDelete: id => `${V1}/admin/leads/${id}`,
    publicCreate: `${V1}/public/leads`,
  },

  locations: {
    // No admin GET exists for this yet — the public list already returns
    // every country with its cities and needs no auth, so it doubles as the
    // Requests screen's filter data.
    publicCountries: `${V1}/public/locations/countries`,
    adminCountries: `${V1}/admin/countries`,
    adminCountryById: id => `${V1}/admin/countries/${id}`,
    adminCities: `${V1}/admin/cities`,
    adminCityById: id => `${V1}/admin/cities/${id}`,
  },

  media: {
    upload: `${V1}/public/media/upload`,
  },

  pages: {
    adminList: `${V1}/admin/pages`,
    adminById: id => `${V1}/admin/pages/${id}`,
    adminSections: id => `${V1}/admin/pages/${id}/sections`,
    publicBySlug: slug => `${V1}/public/pages/${slug}`,
  },

  pillars: {
    adminList: `${V1}/admin/pillars`,
    adminById: id => `${V1}/admin/pillars/${id}`,
    publicList: `${V1}/public/pillars`,
  },

  staffUsers: {
    adminList: `${V1}/admin/staff-users`,
    adminCreate: `${V1}/admin/staff-users`,
    adminInvite: `${V1}/admin/staff-users/invite`,
  },

  // Not live on kaya-nest-api yet — see TELL_US_API_READY in
  // lib/admin/store-api.js and docs/tell-us-everything.md for the document
  // these routes carry. Adjust here if the backend names them differently.
  tellUs: {
    admin: `${V1}/admin/tell-us`,
    public: `${V1}/public/tell-us`,
  },

  testimonials: {
    adminList: `${V1}/admin/testimonials`,
    adminById: id => `${V1}/admin/testimonials/${id}`,
    publicList: `${V1}/public/testimonials`,
  },

  treatments: {
    adminList: `${V1}/admin/treatments`,
    adminById: id => `${V1}/admin/treatments/${id}`,
    adminReorder: `${V1}/admin/treatments/reorder`,
    publicList: `${V1}/public/treatments`,
    publicBySlug: slug => `${V1}/public/treatments/${slug}`,
  },

  voucherRequests: {
    adminList: `${V1}/admin/voucher-requests`,
    adminById: id => `${V1}/admin/voucher-requests/${id}`,
    adminStatus: id => `${V1}/admin/voucher-requests/${id}/status`,
    publicCreate: `${V1}/public/voucher-requests`,
  },
}
