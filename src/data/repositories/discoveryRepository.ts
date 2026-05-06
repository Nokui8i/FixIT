import {
  collection,
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

type DiscoveryCategoryDoc = {
  label?: string;
  abbreviation?: string;
  tint?: string;
  isActive?: boolean;
  sortOrder?: number;
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
};

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
    bio: typeof docData.bio === "string" ? docData.bio : undefined,
  };
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
      query(collection(db, "pro_profiles"), where("isActive", "==", true), limit(150)),
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
