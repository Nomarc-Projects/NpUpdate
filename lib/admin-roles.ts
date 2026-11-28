/**
 * Shared role vocabulary for the super-admin role manager.
 *
 * This lives outside `lib/services/admin.ts` because that module is a
 * `"use server"` boundary: Next.js only allows async function exports there,
 * so constants imported by client components (the role picker, the roster
 * table) have to come from a plain module.
 *
 * The five roles a super admin may assign. `professional`/`exhibitor`/
 * `employer` are the stackable platform roles (stored in `user_role`); `admin`
 * and `super_admin` are the two non-stackable tiers stored on `user.role`.
 * Keeping them together lets the admin console offer one role picker while the
 * underlying model keeps admin privilege on the single authoritative scalar
 * that every server-side guard reads.
 */
export const MANAGEABLE_ROLES = ["professional", "exhibitor", "employer", "admin", "super_admin"] as const;
export type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

export const ROLE_LABELS: Record<ManageableRole, string> = {
  professional: "Professional",
  exhibitor: "Exhibitor",
  employer: "Employer",
  admin: "Admin",
  super_admin: "Super Admin",
};

/** Roles that live in `user_role` and can be held alongside one another. */
export const STACKABLE_ROLES: readonly ManageableRole[] = ["professional", "exhibitor", "employer"];

/** Minimum number of non-banned super admins that must always exist. */
export const SUPER_ADMIN_FLOOR = 2;
