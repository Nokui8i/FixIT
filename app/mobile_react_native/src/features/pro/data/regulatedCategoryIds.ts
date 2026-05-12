/**
 * US-wide conservative default: license fields required on pro apply when any selected
 * category is in this set. Law is state- and scope-dependent; this matches product policy.
 */
export const REGULATED_CATEGORY_IDS = [
  "electrician",
  "plumber",
  "hvac",
  "pest_control",
  "locksmith",
  "roofing",
  "garage_door",
  "pool_spa",
] as const;

const REGULATED_SET = new Set<string>(REGULATED_CATEGORY_IDS);

export function isRegulatedCategoryId(categoryId: string): boolean {
  return REGULATED_SET.has(categoryId);
}

export function proSelectionRequiresLicense(categoryIds: string[]): boolean {
  return categoryIds.some((id) => REGULATED_SET.has(id));
}
