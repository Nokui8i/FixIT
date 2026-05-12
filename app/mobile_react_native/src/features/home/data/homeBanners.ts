/**
 * Home hero ads shape (loaded from Firestore `banners` collection).
 */
export type HomeBannerMediaKind = "image" | "gif" | "video";

export type HomeBannerAd = {
  id: string;
  /** Remote asset URL (image, GIF, mp4/webm/mov, or HLS). */
  mediaUrl: string;
  /** When omitted, inferred from `mediaUrl` (extension / path). */
  kind?: HomeBannerMediaKind;
  /** Optional poster for video (first frame / marketing still). */
  posterUrl?: string;
  accessibilityLabel?: string;
};

/** Infer how to render a banner when `kind` is not set. */
export function resolveBannerKind(ad: Pick<HomeBannerAd, "mediaUrl" | "kind">): HomeBannerMediaKind {
  if (ad.kind) return ad.kind;
  const path = ad.mediaUrl.split("?")[0].toLowerCase();
  if (
    path.endsWith(".mp4") ||
    path.endsWith(".webm") ||
    path.endsWith(".mov") ||
    path.endsWith(".m4v") ||
    path.endsWith(".m3u8")
  ) {
    return "video";
  }
  if (path.endsWith(".gif")) return "gif";
  return "image";
}

/** Slim side gutters — matches near full-bleed promo strips (e.g. Wolt). */
export const BANNER_SIDE_INSET = 12;

/** Inner card width : height (lower = taller banner). */
export const BANNER_ASPECT_WIDTH_OVER_HEIGHT = 1.88;

