import type {
  PortfolioAlbum,
  PortfolioMediaItem,
  ServiceListing,
} from "../types/serviceListing";

/** Profile grid: show this many album tiles; “See all” when there are more (max total albums below). */
export const PREVIEW_ALBUM_MAX = 4;

/** Product rule: maximum albums per professional portfolio. */
export const MAX_PORTFOLIO_ALBUMS = 5;

/** Product rule: maximum photos/videos per album (each item is one image or one video). */
export const MAX_ITEMS_PER_PORTFOLIO_ALBUM = 5;

/** Pro dashboard: portfolio videos must be at most this many seconds. */
export const MAX_PORTFOLIO_VIDEO_DURATION_SEC = 60;

/** Full gallery list: first N thumbnails before the “+” tile that opens the album. */
export const GALLERY_ALBUM_VISIBLE_THUMB_SLOTS = 2;

function clampPortfolioAlbums(albums: PortfolioAlbum[]): PortfolioAlbum[] {
  return albums.slice(0, MAX_PORTFOLIO_ALBUMS).map((album) => ({
    ...album,
    items: album.items.slice(0, MAX_ITEMS_PER_PORTFOLIO_ALBUM),
  }));
}

export function getPortfolioAlbums(listing: ServiceListing): PortfolioAlbum[] {
  if (listing.portfolioAlbums?.length) {
    return clampPortfolioAlbums(listing.portfolioAlbums);
  }
  const items: PortfolioMediaItem[] = [];
  for (const url of listing.portfolioImages ?? []) {
    items.push({ type: "image", url });
  }
  for (const v of listing.portfolioVideos ?? []) {
    items.push({
      type: "video",
      url: v.url,
      posterUrl: v.posterUrl,
      durationSec: v.durationSec,
    });
  }
  if (items.length === 0) return [];
  return clampPortfolioAlbums([
    {
      id: "legacy-all",
      title: "Work",
      items,
    },
  ]);
}

export function getPortfolioAlbumById(
  listing: ServiceListing,
  albumId: string,
): PortfolioAlbum | undefined {
  return getPortfolioAlbums(listing).find((a) => a.id === albumId);
}

export function albumCoverSource(
  album: PortfolioAlbum,
): { uri: string } | null {
  const first = album.items[0];
  if (!first) return null;
  if (first.type === "image") return { uri: first.url };
  return { uri: first.posterUrl ?? first.url };
}

export function albumItemCount(album: PortfolioAlbum): number {
  return album.items.length;
}

export function portfolioHasAnyMedia(listing: ServiceListing): boolean {
  return getPortfolioAlbums(listing).length > 0;
}
