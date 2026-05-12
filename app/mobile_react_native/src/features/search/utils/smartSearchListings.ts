import { categoryCatalog } from "@/features/home/data/categoryCatalog";
import type { ServiceListing } from "@/features/home/types/serviceListing";

export type SmartSearchHit = { listing: ServiceListing; score: number };

const labelByCategoryId = (): Map<string, string> =>
  new Map(categoryCatalog.map((c) => [c.id, c.label]));

/**
 * Multi-word and substring triggers → category ids we surface (no mechanic vertical in catalog:
 * map automotive intent to mobile auto + tire (+ handyman for odd jobs); keys/locks to locksmith + doors, etc.).
 */
const PHRASE_CATEGORY_HINTS: { match: (q: string) => boolean; categories: string[] }[] =
  [
    {
      match: (q) =>
        q.includes("car key") ||
        q.includes("auto key") ||
        q.includes("lost key") ||
        q.includes("lockout") ||
        q.includes("lock out") ||
        q.includes("locked out") ||
        q.includes("transponder") ||
        q.includes("ignition key"),
      categories: ["locksmith", "roadside"],
    },
    {
      match: (q) =>
        q.includes("flat tire") ||
        q.includes("spare tire") ||
        q.includes("jump start") ||
        q.includes("roadside"),
      categories: ["roadside", "tire"],
    },
    {
      match: (q) => q.includes("wheel") && (q.includes("align") || q.includes("mobile tire") || q.includes("new tires")),
      categories: ["tire"],
    },
    {
      match: (q) =>
        q.includes("mechanic") ||
        q.includes("engine") ||
        q.includes("brake") ||
        q.includes("oil change") ||
        q.includes("automotive") ||
        q.includes("motor"),
      categories: ["mobile_auto", "tire", "handyman"],
    },
    {
      match: (q) =>
        q.includes("car detail") ||
        q.includes("auto detail") ||
        q.includes("detailing") ||
        q.includes("ceramic coating") ||
        q.includes("mobile car wash"),
      categories: ["mobile_auto"],
    },
    {
      match: (q) =>
        q.includes("leak") ||
        q.includes("drain") ||
        q.includes("toilet") ||
        q.includes("water heater") ||
        q.includes("pipe"),
      categories: ["plumber"],
    },
    {
      match: (q) =>
        q.includes("electric") ||
        q.includes("outlet") ||
        q.includes("wiring") ||
        q.includes("breaker") ||
        q.includes("lighting"),
      categories: ["electrician"],
    },
    {
      match: (q) =>
        q.includes("door") ||
        q.includes("hinge") ||
        q.includes("frame") ||
        q.includes("storm door"),
      categories: ["doors", "locksmith", "handyman"],
    },
    {
      match: (q) =>
        q.includes("assemble") ||
        q.includes("mount") ||
        q.includes("shelf") ||
        q.includes("furniture") ||
        q.includes("ikea") ||
        q.includes("flat-pack") ||
        q.includes("flat pack"),
      categories: ["handyman"],
    },
    {
      match: (q) =>
        q.includes("junk removal") ||
        q.includes("haul away mattress") ||
        q.includes("mattress removal") ||
        q.includes("estate cleanout") ||
        q.includes("hot tub removal") ||
        q.includes("spa removal"),
      categories: ["junk_removal", "moving_hauling"],
    },
    {
      match: (q) =>
        q.includes("pressure wash") ||
        q.includes("power wash") ||
        q.includes("driveway clean"),
      categories: ["pressure_washing", "landscaping"],
    },
    {
      match: (q) =>
        q.includes("gutter clean") ||
        q.includes("gutters ") ||
        q.endsWith("gutters"),
      categories: ["roofing", "landscaping"],
    },
    {
      match: (q) =>
        q.includes("solar panel") || q.includes("solar cleaning") || q.includes("panels solar"),
      categories: ["solar_panel"],
    },
    {
      match: (q) =>
        q.includes("sewer camera") || q.includes("duct cleaning") || q.includes("air duct"),
      categories: ["plumber", "hvac"],
    },
  ];

/** Single-token hints (lowercased token → categories). */
const TOKEN_CATEGORY_HINTS: Record<string, string[]> = {
  locksmith: ["locksmith"],
  plumber: ["plumber"],
  electrician: ["electrician"],
  handyman: ["handyman"],
  tire: ["tire"],
  doors: ["doors"],
  lock: ["locksmith", "doors"],
  locks: ["locksmith", "doors"],
  key: ["locksmith"],
  keys: ["locksmith"],
  rekey: ["locksmith"],
  car: ["mobile_auto", "tire", "locksmith"],
  auto: ["mobile_auto", "tire", "locksmith"],
  vehicle: ["mobile_auto", "tire", "locksmith"],
  detailing: ["mobile_auto"],
  roadside: ["roadside"],
  junk: ["junk_removal"],
  gutters: ["roofing"],
  gutter: ["roofing"],
  pressure: ["pressure_washing"],
  solar: ["solar_panel"],
  ikea: ["handyman"],
  mechanic: ["tire", "handyman"],
  leak: ["plumber"],
  drain: ["plumber"],
  toilet: ["plumber"],
  wire: ["electrician"],
  outlet: ["electrician"],
  mount: ["handyman"],
};

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(norm: string): string[] {
  return norm
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function expandedCategoryIds(norm: string): Set<string> {
  const out = new Set<string>();
  for (const { match, categories } of PHRASE_CATEGORY_HINTS) {
    if (match(norm)) categories.forEach((c) => out.add(c));
  }
  for (const t of tokenize(norm)) {
    const cats = TOKEN_CATEGORY_HINTS[t];
    if (cats) cats.forEach((c) => out.add(c));
  }
  return out;
}

function listingHaystack(
  listing: ServiceListing,
  labels: Map<string, string>,
): string {
  const parts: string[] = [
    listing.title,
    listing.subtitle,
    listing.bio ?? "",
  ];
  for (const id of listing.categoryIds) {
    parts.push(id, labels.get(id) ?? "");
  }
  for (const album of listing.portfolioAlbums ?? []) {
    parts.push(album.title);
  }
  return parts.join(" ").toLowerCase();
}

function scoreListing(
  norm: string,
  tokens: string[],
  expandedCats: Set<string>,
  haystack: string,
  listingTitle: string,
  listingCategoryIds: string[],
): number {
  let score = 0;

  if (norm.length >= 2 && haystack.includes(norm)) {
    score += 14;
  }

  for (const t of tokens) {
    if (t.length < 2) continue;
    if (haystack.includes(t)) score += 5;
  }

  const titleLower = listingTitle.toLowerCase();
  for (const t of tokens) {
    if (t.length >= 3 && titleLower.includes(t)) score += 6;
  }

  let catHits = 0;
  for (const cid of listingCategoryIds) {
    if (expandedCats.has(cid)) catHits += 1;
  }
  if (catHits > 0) {
    score += 10 + catHits * 3;
  }

  return score;
}

/**
 * Rank listings for a customer query. Uses name/subtitle/bio/portfolio titles + keyword→category expansion.
 * Replace with Algolia / Firestore full-text + embeddings when backend exists.
 */
export function smartSearchListings(
  rawQuery: string,
  pool: ServiceListing[],
): SmartSearchHit[] {
  const norm = normalizeQuery(rawQuery);
  if (norm.length === 0) return [];

  const labels = labelByCategoryId();
  const expandedCats = expandedCategoryIds(norm);
  const tokens = tokenize(norm);

  const hits: SmartSearchHit[] = [];
  for (const listing of pool) {
    const hay = listingHaystack(listing, labels);
    const score = scoreListing(
      norm,
      tokens,
      expandedCats,
      hay,
      listing.title,
      listing.categoryIds,
    );
    if (score > 0) hits.push({ listing, score });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.listing.title.localeCompare(b.listing.title);
  });
  return hits;
}
