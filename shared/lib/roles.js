/**
 * Roles and their fixed permissions. Kept free of imports so the data layer
 * (store-api / store-local) can use it without an import cycle through
 * auth.js → store.js.
 */
export const ROLE_LABELS = {
  super_admin: 'Super admin',
  admin: 'Admin',
  staff: 'Staff',
}

/**
 * Permissions per role (mirrors the backend's role guards):
 * - manageUsers: open Users & Roles and invite/edit people (admins: staff in
 *   their own countries only; super admins: anyone).
 * - manageAdmins: create/promote admins and super admins.
 * - manageSettings: global settings — countries & cities, categories, page
 *   and site copy, Tell Us, footer. Everyone else sees them read-only.
 * - viewCustomers: customer accounts (they hold health data).
 */
export const PERMISSIONS = {
  super_admin: {
    create: true, edit: true, delete: true, manageUsers: true, manageAdmins: true,
    viewCustomers: true, manageCountries: true, manageSettings: true,
  },
  admin: {
    create: true, edit: true, delete: true, manageUsers: true, manageAdmins: false,
    viewCustomers: true, manageCountries: false, manageSettings: false,
  },
  staff: {
    create: true, edit: true, delete: false, manageUsers: false, manageAdmins: false,
    viewCustomers: false, manageCountries: false, manageSettings: false,
  },
}

export function can(user, action) {
  if (!user) return false
  return Boolean(PERMISSIONS[user.role]?.[action])
}

export const ROLE_TO_BACKEND = { super_admin: 'SUPER_ADMIN', admin: 'ADMIN', staff: 'STAFF' }
export const ROLE_FROM_BACKEND = { SUPER_ADMIN: 'super_admin', ADMIN: 'admin', STAFF: 'staff' }

export const isSuperAdmin = user => user?.role === 'super_admin'
