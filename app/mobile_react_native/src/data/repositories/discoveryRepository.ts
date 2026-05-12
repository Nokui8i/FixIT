import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import {
  categoryCatalog,
  type CategoryTile,
  categoryTilesFromRows,
} from "@/features/home/data/categoryCatalog";
import {
  type HomeBrowseSection,
} from "@/features/home/data/demoFreelancers";
import type { ServiceListing } from "@/features/home/types/serviceListing";
import { getFirebaseFirestore } from "@/shared/firebase/client";
import { isFirebaseConfigured } from "@/shared/firebase/config";
import { hasOwnerBypass, normalizeStoredUserRole } from "@/shared/domain/userRoles";
import type { PortfolioAlbum, PortfolioMediaItem } from "@/features/home/types/serviceListing";

type DiscoveryCategoryDoc = {
  label?: string;
  abbreviation?: string;
  tint?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type ShowcaseHeroDoc = {
  imageUrls?: string[];
  video?: { url?: string; posterUrl?: string };
};

type DiscoveryProDoc = {
  title?: string;
  subtitle?: string;
  eta?: string;
  fee?: string;
  rating?: string | number;
  imageUrl?: string;
  categoryIds?: string[];
  jobsDone?: number;
  bio?: string;
  isActive?: boolean;
  verification_status?: "pending_approval" | "approved" | "rejected" | "pending";
  is_licensed?: boolean;
  is_insured?: boolean;
  licenseNumber?: string;
  showcaseHero?: ShowcaseHeroDoc;
  portfolioAlbums?: unknown[];
};

/** Shared parser for Firestore-stored portfolio arrays on `pro_profiles`. */
export function portfolioAlbumsFromFirestore(raw: unknown): PortfolioAlbum[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const albums: PortfolioAlbum[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "Work";
    if (!id) continue;
    const itemsRaw = o.items;
    const items: PortfolioMediaItem[] = [];
    if (Array.isArray(itemsRaw)) {
      for (const it of itemsRaw) {
        if (!it || typeof it !== "object") continue;
        const m = it as Record<string, unknown>;
        const t = m.type === "video" ? "video" : m.type === "image" ? "image" : null;
        const url = typeof m.url === "string" ? m.url.trim() : "";
        if (!t || !url) continue;
        if (t === "image") items.push({ type: "image", url });
        else {
          items.push({
            type: "video",
            url,
            posterUrl: typeof m.posterUrl === "string" ? m.posterUrl : undefined,
            durationSec:
              typeof m.durationSec === "number" && Number.isFinite(m.durationSec)
                ? m.durationSec
                : undefined,
          });
        }
      }
    }
    albums.push({ id, title: title.length > 0 ? title : "Work", items });
  }
  return albums.length > 0 ? albums : undefined;
}

function showcaseFromDoc(docData: DiscoveryProDoc): ServiceListing["showcaseHero"] | undefined {
  const h = docData.showcaseHero;
  if (!h || typeof h !== "object") return undefined;
  const imageUrls = Array.isArray(h.imageUrls)
    ? h.imageUrls.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim())
    : [];
  const v = h.video && typeof h.video === "object" ? h.video : undefined;
  const vu = typeof v?.url === "string" ? v.url.trim() : "";
  if (vu) {
    return {
      imageUrls,
      video: {
        url: vu,
        posterUrl: typeof v?.posterUrl === "string" ? v.posterUrl.trim() : undefined,
      },
    };
  }
  if (imageUrls.length > 0) return { imageUrls };
  return undefined;
}

export type DiscoveryData = {
  source: "firebase";
  categories: CategoryTile[];
  listings: ServiceListing[];
};

function toRatingLabel(v: string | number | undefined): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(1);
  return "4.8";
}

function toServiceListing(id: string, docData: DiscoveryProDoc): ServiceListing | null {
  const title = typeof docData.title === "string" ? docData.title.trim() : "";
  if (title.length === 0) return null;
  const categoryIds = Array.isArray(docData.categoryIds)
    ? docData.categoryIds.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  const portfolios = portfolioAlbumsFromFirestore(docData.portfolioAlbums);
  return {
    id,
    title,
    subtitle:
      typeof docData.subtitle === "string" && docData.subtitle.trim().length > 0
        ? docData.subtitle.trim()
        : "Local professional",
    eta:
      typeof docData.eta === "string" && docData.eta.trim().length > 0
        ? docData.eta.trim()
        : "—",
    fee:
      typeof docData.fee === "string" && docData.fee.trim().length > 0
        ? docData.fee.trim()
        : "Quote",
    rating: toRatingLabel(docData.rating),
    imageUrl:
      typeof docData.imageUrl === "string" && docData.imageUrl.trim().length > 0
        ? docData.imageUrl.trim()
        : "https://i.pravatar.cc/400?img=22",
    categoryIds,
    jobsDone:
      typeof docData.jobsDone === "number" && Number.isFinite(docData.jobsDone)
        ? docData.jobsDone
        : undefined,
    bio:
      typeof docData.bio === "string" && docData.bio.trim().length > 0
        ? docData.bio.trim()
        : undefined,
    isLicensed: docData.is_licensed === true,
    isInsured: docData.is_insured === true,
    licenseNumber:
      typeof docData.licenseNumber === "string" ? docData.licenseNumber : undefined,
    showcaseHero: showcaseFromDoc(docData),
    ...(portfolios ? { portfolioAlbums: portfolios } : {}),
  };
}

/**
 * Public (or owner preview) ServiceListing from `pro_profiles/{proId}`.
 * Non-owners require approved + active listing to reduce draft leakage.
 */
export async function fetchProListingById(
  proId: string,
  viewerUid?: string | null,
): Promise<ServiceListing | null> {
  if (!isFirebaseConfigured() || !proId.trim()) return null;
  try {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, "pro_profiles", proId.trim()));
    if (!snap.exists()) return null;
    const viewerRoleSnap = viewerUid
      ? await getDoc(doc(db, "users", viewerUid)).catch(() => null)
      : null;
    const ownerViewer = hasOwnerBypass(
      normalizeStoredUserRole(viewerRoleSnap?.data()?.role),
    );
    const docData = (snap.data() as DiscoveryProDoc) ?? {};
    if (!ownerViewer && docData.verification_status !== "approved") return null;
    const active = docData.isActive !== false;
    if (!ownerViewer && !active && viewerUid !== proId.trim()) return null;
    return toServiceListing(proId.trim(), docData);
  } catch {
    return null;
  }
}

export async function bootstrapDiscoveryIfMissing(): Promise<void> {
  // Intentionally no-op: discovery must use only real Firebase content.
}

export async function loadDiscoveryData(): Promise<DiscoveryData> {
  if (!isFirebaseConfigured()) {
    return { source: "firebase", categories: [], listings: [] };
  }

  try {
    const db = getFirebaseFirestore();

    const categoriesSnap = await getDocs(collection(db, "categories"));
    const categoryRows = categoriesSnap.docs
      .map((d) => ({ id: d.id, ...((d.data() as DiscoveryCategoryDoc) ?? {}) }))
      .filter((c) => c.isActive !== false && typeof c.label === "string")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((c) => ({
        id: c.id,
        label: c.label as string,
        abbreviation: c.abbreviation,
        tint: c.tint,
      }));

    const listingsSnap = await getDocs(
      query(
        collection(db, "pro_profiles"),
        where("isActive", "==", true),
        where("verification_status", "==", "approved"),
        limit(150),
      ),
    );
    const listings = listingsSnap.docs
      .map((d) => toServiceListing(d.id, (d.data() as DiscoveryProDoc) ?? {}))
      .filter((v): v is ServiceListing => v !== null);

    return {
      source: "firebase",
      categories:
        categoryRows.length > 0 ? categoryTilesFromRows(categoryRows) : categoryCatalog,
      listings,
    };
  } catch {
    return { source: "firebase", categories: [], listings: [] };
  }
}

export function listingsForCategory(
  data: DiscoveryData,
  categoryId: string,
): ServiceListing[] {
  return data.listings.filter((row) => row.categoryIds.includes(categoryId));
}

export function listingsForBrowse(
  data: DiscoveryData,
  section: HomeBrowseSection,
): ServiceListing[] {
  if (section === "top-rated") {
    return [...data.listings]
      .sort((a, b) => Number.parseFloat(b.rating) - Number.parseFloat(a.rating))
      .slice(0, 20);
  }
  return data.listings;
}

export function listingById(
  data: DiscoveryData,
  id: string,
): ServiceListing | undefined {
  return data.listings.find((row) => row.id === id);
}
