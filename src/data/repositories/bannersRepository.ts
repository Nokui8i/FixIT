import { collection, getDocs, limit, query, where } from "firebase/firestore";

import {
  resolveBannerKind,
  type HomeBannerAd,
} from "@/features/home/data/homeBanners";
import { getFirebaseFirestore } from "@/shared/firebase/client";
import { isFirebaseConfigured } from "@/shared/firebase/config";

type BannerDoc = {
  mediaUrl?: string;
  kind?: "image" | "gif" | "video";
  posterUrl?: string;
  accessibilityLabel?: string;
  isActive?: boolean;
  placement?: string;
  sortOrder?: number;
};

export async function loadHomeBanners(): Promise<HomeBannerAd[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const db = getFirebaseFirestore();
    const snap = await getDocs(
      query(
        collection(db, "banners"),
        where("isActive", "==", true),
        where("placement", "==", "home"),
        limit(20),
      ),
    );

    return snap.docs
      .map((d) => ({ id: d.id, ...((d.data() as BannerDoc) ?? {}) }))
      .filter(
        (row) => typeof row.mediaUrl === "string" && row.mediaUrl.trim().length > 0,
      )
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((row) => ({
        id: row.id,
        mediaUrl: row.mediaUrl as string,
        kind: row.kind ?? resolveBannerKind({ mediaUrl: row.mediaUrl as string }),
        posterUrl: row.posterUrl,
        accessibilityLabel:
          typeof row.accessibilityLabel === "string"
            ? row.accessibilityLabel
            : "Advertisement",
      }));
  } catch {
    return [];
  }
}
