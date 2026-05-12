/**
 * Product taxonomy — **single source of truth** for service categories.
 *
 * To add a category: append one object to `rawCategoryCatalog` with at least `id` and `label`.
 * Home chips, hero row, new-request picker, and `/category/:id` all read from the built `categoryCatalog`.
 * Optional: `abbreviation`, `tint`, `image` — otherwise defaults are applied (see `buildCategoryTiles`).
 */
import type { ImageSourcePropType } from "react-native";

const CATEGORY_LOCKSMITH = require("../../../../assets/account/category-locksmith.png") as ImageSourcePropType;
const CATEGORY_PLUMBER = require("../../../../assets/account/category-plumber.png") as ImageSourcePropType;
const CATEGORY_ELECTRICIAN = require("../../../../assets/account/category-electrician.png") as ImageSourcePropType;
const CATEGORY_HANDYMAN = require("../../../../assets/account/category-handyman.png") as ImageSourcePropType;

/** What you edit when adding categories — only `id` + `label` are required. */
export type CategoryCatalogInput = {
  id: string;
  label: string;
  abbreviation?: string;
  tint?: string;
  image?: ImageSourcePropType;
};

export type CategoryTile = {
  id: string;
  label: string;
  abbreviation: string;
  tint: string;
  image: ImageSourcePropType;
};

/** Category “platform” backgrounds — all red family (no green/yellow/blue cycle). */
const TINT_CYCLE = [
  "#FFE4E6",
  "#FECDD3",
  "#FECACA",
  "#FCA5A5",
  "#FEE2E2",
  "#FFF1F2",
  "#FDF2F4",
  "#FDA4AF",
] as const;

function abbreviationFromLabel(label: string): string {
  const cleaned = label.replace(/[^A-Za-z0-9\s]/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[1][0] ?? "";
    return (a + b).toUpperCase().slice(0, 2);
  }
  const compact = cleaned.replace(/\s/g, "");
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return (compact + "X").slice(0, 2).toUpperCase();
}

function tintForIndex(index: number): string {
  return TINT_CYCLE[index % TINT_CYCLE.length];
}

/**
 * Canonical list — append rows here. Order defines default tint rotation when `tint` is omitted.
 */
const rawCategoryCatalog: CategoryCatalogInput[] = [
  { id: "locksmith", label: "Locksmith", abbreviation: "Lk", tint: "#FECACA", image: CATEGORY_LOCKSMITH },
  { id: "plumber", label: "Plumber", abbreviation: "Pl", tint: "#FCA5A5", image: CATEGORY_PLUMBER },
  { id: "electrician", label: "Electrician", abbreviation: "El", tint: "#FFE4E6", image: CATEGORY_ELECTRICIAN },
  { id: "doors", label: "Doors", abbreviation: "Dr", tint: "#FECDD3", image: CATEGORY_HANDYMAN },
  { id: "tire", label: "Mobile Tire Shop", abbreviation: "MT", tint: "#FEE2E2", image: CATEGORY_HANDYMAN },
  { id: "mobile_auto", label: "Mobile Auto Service", abbreviation: "Au", tint: "#FFF1F2", image: CATEGORY_HANDYMAN },
  { id: "handyman", label: "Handyman", abbreviation: "Hm", tint: "#FDA4AF", image: CATEGORY_HANDYMAN },
  { id: "hvac", label: "HVAC", abbreviation: "HV", image: CATEGORY_HANDYMAN },
  { id: "appliance_repair", label: "Appliance Repair", abbreviation: "AR", image: CATEGORY_HANDYMAN },
  { id: "garage_door", label: "Garage Door", abbreviation: "GD", image: CATEGORY_HANDYMAN },
  { id: "roofing", label: "Roofing", abbreviation: "Rf", image: CATEGORY_HANDYMAN },
  { id: "windows_glass", label: "Windows & Glass", abbreviation: "WG", image: CATEGORY_HANDYMAN },
  { id: "painting", label: "Painting", abbreviation: "Pt", image: CATEGORY_HANDYMAN },
  { id: "flooring", label: "Flooring", abbreviation: "Fl", image: CATEGORY_HANDYMAN },
  { id: "carpentry", label: "Carpentry", abbreviation: "Cp", image: CATEGORY_HANDYMAN },
  { id: "pest_control", label: "Pest Control", abbreviation: "PC", image: CATEGORY_HANDYMAN },
  { id: "cleaning", label: "Cleaning", abbreviation: "Cl", image: CATEGORY_HANDYMAN },
  { id: "moving_hauling", label: "Moving & Hauling", abbreviation: "MH", image: CATEGORY_HANDYMAN },
  { id: "junk_removal", label: "Junk Removal", abbreviation: "JR", image: CATEGORY_HANDYMAN },
  { id: "landscaping", label: "Landscaping", abbreviation: "Ls", image: CATEGORY_HANDYMAN },
  { id: "pressure_washing", label: "Pressure Washing", abbreviation: "PW", image: CATEGORY_HANDYMAN },
  { id: "pool_spa", label: "Pool & Spa", abbreviation: "PS", image: CATEGORY_HANDYMAN },
  { id: "solar_panel", label: "Solar Panel Service", abbreviation: "So", image: CATEGORY_HANDYMAN },
  { id: "smart_home", label: "Smart Home", abbreviation: "SH", image: CATEGORY_HANDYMAN },
  { id: "roadside", label: "Roadside Assistance", abbreviation: "RA", image: CATEGORY_HANDYMAN },
];

const categoryImageById: Record<string, ImageSourcePropType> =
  rawCategoryCatalog.reduce<Record<string, ImageSourcePropType>>((acc, row) => {
    if (row.image) acc[row.id] = row.image;
    return acc;
  }, {});

function buildCategoryTiles(entries: CategoryCatalogInput[]): CategoryTile[] {
  return entries.map((c, index) => ({
    id: c.id,
    label: c.label,
    abbreviation: c.abbreviation ?? abbreviationFromLabel(c.label),
    tint: c.tint ?? tintForIndex(index),
    image: c.image ?? CATEGORY_HANDYMAN,
  }));
}

export const categoryCatalog: CategoryTile[] = buildCategoryTiles(rawCategoryCatalog);

export function categoryTilesFromRows(
  rows: Array<
    Pick<CategoryCatalogInput, "id" | "label"> &
      Partial<Pick<CategoryCatalogInput, "abbreviation" | "tint">>
  >,
): CategoryTile[] {
  return buildCategoryTiles(
    rows.map((row) => ({
      ...row,
      image: categoryImageById[row.id] ?? CATEGORY_HANDYMAN,
    })),
  );
}

/** Stable id list for validation (e.g. API payloads). */
export const allCategoryIds: readonly string[] = categoryCatalog.map((c) => c.id);

export function isKnownCategoryId(categoryId: string): boolean {
  return categoryCatalog.some((c) => c.id === categoryId);
}

export function categoryLabelFromId(categoryId: string): string | null {
  const row = categoryCatalog.find((c) => c.id === categoryId);
  return row?.label ?? null;
}
