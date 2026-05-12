import type { TradeLicenseDraft } from "@/data/repositories/proProfileRepository";
import { emptyTradeLicenseDraft } from "@/data/repositories/proProfileRepository";
import { isRegulatedCategoryId } from "@/features/pro/data/regulatedCategoryIds";

/** Same completeness rules as provider apply (trade license blocks). */
export function isTradeLicenseComplete(L: TradeLicenseDraft): boolean {
  return (
    L.licenseNumber.trim().length > 0 &&
    L.licenseState.trim().length > 0 &&
    L.licenseExpirationDate.trim().length > 0 &&
    L.licenseDocumentUrl.trim().length > 0
  );
}

/** Adding this category is allowed only if it’s not regulated, or license payload is complete. */
export function canOfferRegulatedCategory(
  categoryId: string,
  licensesByCategoryId: Record<string, TradeLicenseDraft>,
  options?: { bypass?: boolean },
): boolean {
  if (options?.bypass) return true;
  if (!isRegulatedCategoryId(categoryId)) return true;
  const L = licensesByCategoryId[categoryId] ?? emptyTradeLicenseDraft();
  return isTradeLicenseComplete(L);
}
