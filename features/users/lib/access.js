/**
 * Who may assign / manage whom — mirrors kaya-nest-api's staff-users rules
 * (StaffUsersService.assertCanManage) so the UI only offers what the API
 * would accept. The API is still the boundary; this only hides buttons.
 *
 * - Super admins manage anyone and assign any role.
 * - Admins manage staff only, and only staff whose countries (and, when the
 *   admin is clinic-limited, clinics) all sit inside the admin's own.
 * - Nobody manages their own account here (role / access changes on
 *   yourself are refused by the API).
 */
import { isSuperAdmin } from '@/shared/lib/auth'

export const ROLE_ORDER = ['super_admin', 'admin', 'staff']

/** Roles `me` may give someone (invite or edit). */
export function assignableRoles(me) {
  if (isSuperAdmin(me)) return ROLE_ORDER
  if (me?.role === 'admin') return ['staff']
  return []
}

const subset = (list, of) => list.every(x => of.includes(x))

/** Whether `me` may edit / remove `target` (a user or a pending invite). */
export function canManage(me, target) {
  if (!me || !target || target.id === me.id) return false
  if (isSuperAdmin(me)) return true
  if (me.role !== 'admin' || target.role !== 'staff') return false
  if (!subset(target.countries || [], me.countries || [])) return false
  const myClinics = me.clinics || []
  return myClinics.length === 0 || subset(target.clinics || [], myClinics)
}

/** Clinics `me` may hand out: every clinic they can see, narrowed to their own clinic list when they have one. */
export function clinicsFor(me, locations) {
  const mine = me?.clinics || []
  if (isSuperAdmin(me) || mine.length === 0) return locations
  return locations.filter(l => mine.includes(l.id))
}

/** A save-blocking problem with a role/countries/clinics choice made by `me`, or ''. */
export function accessError({ role, countries, clinics }, me) {
  if (!role) return 'Pick a role.'
  if (role === 'super_admin') return ''
  if (countries.length === 0) return 'Pick at least one country.'
  // A clinic-limited admin can't grant "every clinic" — that reaches past their own.
  if (!isSuperAdmin(me) && (me?.clinics || []).length > 0 && clinics.length === 0) return 'Pick at least one clinic.'
  return ''
}

/** What to send for a role/countries/clinics choice — a super admin carries no countries or clinics. */
export function accessPayload({ role, countries, clinics }) {
  return role === 'super_admin' ? { role, countries: [], clinics: [] } : { role, countries, clinics }
}
