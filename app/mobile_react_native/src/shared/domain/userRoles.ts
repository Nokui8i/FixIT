/**
 * Canonical values for `users/{uid}.role` in Firestore.
 * Legacy documents may use `pro`; the app normalizes that to `freelancer`.
 *
 * Meaning (product):
 * - customer: books services only
 * - freelancer: marketplace provider (has or will have `pro_profiles/{uid}`)
 * - manager: internal ops (support, moderation) — wire permissions later
 * - admin: full platform administration except ownership-level actions
 * - owner: business / technical super-user above admin
 */
export const USER_PLATFORM_ROLES = [
  "customer",
  "freelancer",
  "manager",
  "admin",
  "owner",
] as const;

export type UserPlatformRole = (typeof USER_PLATFORM_ROLES)[number];

const LEGACY_PROVIDER_ROLE = "pro" as const;

const ROLE_SET = new Set<string>(USER_PLATFORM_ROLES);

/** For future rule checks (higher = more privilege). */
export const PLATFORM_ROLE_RANK: Record<UserPlatformRole, number> = {
  customer: 0,
  freelancer: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export function normalizeStoredUserRole(raw: unknown): UserPlatformRole {
  if (typeof raw !== "string") return "customer";
  const s = raw.trim().toLowerCase();
  if (s === LEGACY_PROVIDER_ROLE) return "freelancer";
  if (ROLE_SET.has(s)) return s as UserPlatformRole;
  return "customer";
}

export function isFreelancerPlatformRole(role: UserPlatformRole): boolean {
  return role === "freelancer";
}

export function isStaffPlatformRole(role: UserPlatformRole): boolean {
  return role === "manager" || role === "admin" || role === "owner";
}

/** Internal product-review super-user. Owners bypass app-level onboarding gates. */
export function hasOwnerBypass(role: UserPlatformRole): boolean {
  return role === "owner";
}
