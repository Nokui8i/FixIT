/**
 * Central route strings for Expo Router.
 *
 * Prefer importing from here instead of scattering string literals,
 * so renames and audits stay easy for the whole team.
 *
 * File locations still define the URL tree under `app/` — this module
 * only holds the string values you navigate to.
 */
export const routes = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  home: "/",
  /** Full category grid (browse all service types). */
  categories: "/categories",
  search: "/search",
  account: "/account",
  /** Account management (personal data, photo, legal, device) — not generic “app settings”. */
  accountManagement: "/account-management",
  notifications: "/notifications",
  /** Customer inbox — threads opened from freelancer profiles (Chat). */
  messages: "/messages",
  /** Create / post a job — main hub tab (`app/(tabs)/post.tsx`). */
  requestNew: "/post",
  /** Customer request history list. */
  myRequests: "/my-requests",
  rateBookingBase: "/rate",
  /** Pro dashboard — business tools (incoming jobs, quotes). */
  proHome: "/pro",
  proIncoming: "/pro/incoming",
  proRequirements: "/pro/requirements",
  proApply: "/pro/apply",
  /** Edit the marketplace profile customers see: hero, bio, portfolio, ETA, price. */
  proProfile: "/pro/profile",
  /** Trade license numbers + documents for regulated categories (ops review). */
  proTradeLicenses: "/pro/trade-licenses",
} as const;

export function legalDocumentPath(kind: "terms" | "privacy"): string {
  return `/legal/${kind}`;
}

/** e.g. `/category/locksmith` — list freelancers for one category (from home tiles). */
export function categoryBrowsePath(categoryId: string): string {
  return `/category/${encodeURIComponent(categoryId)}`;
}

/** `/browse/nearby` | `/browse/top-rated` | `/browse/around-you` — full list behind home carousels. */
export function browseSectionPath(
  section: "nearby" | "top-rated" | "around-you",
): string {
  return `/browse/${section}`;
}

/** Customer view of a professional — `/freelancer/:id` (not the `/pro` workspace). */
export function freelancerProfilePath(proId: string): string {
  return `/freelancer/${encodeURIComponent(proId)}`;
}

/** Prefer this with `router.push` so Expo Router passes `id` into `[id].tsx` reliably. */
export function freelancerProfileHref(proId: string): {
  pathname: "/freelancer/[id]";
  params: { id: string };
} {
  return { pathname: "/freelancer/[id]", params: { id: proId } };
}

/** Full portfolio gallery (all albums) for one professional. */
export function freelancerPortfolioGalleryHref(proId: string): {
  pathname: "/freelancer/[id]/portfolio";
  params: { id: string };
} {
  return {
    pathname: "/freelancer/[id]/portfolio",
    params: { id: proId },
  };
}

/** Direct message thread with one professional (UI-only until Firestore chat). */
export function freelancerChatHref(
  proId: string,
  meta?: { proName?: string; proImageUrl?: string },
): {
  pathname: "/freelancer/[id]/chat";
  params: { id: string; proName?: string; proImageUrl?: string };
} {
  return {
    pathname: "/freelancer/[id]/chat",
    params: { id: proId, proName: meta?.proName, proImageUrl: meta?.proImageUrl },
  };
}

/** One album (all items) for a professional — from gallery “+N” or title. */
export function freelancerPortfolioAlbumHref(
  proId: string,
  albumId: string,
): {
  pathname: "/freelancer/[id]/portfolio/[albumId]";
  params: { id: string; albumId: string };
} {
  return {
    pathname: "/freelancer/[id]/portfolio/[albumId]",
    params: { id: proId, albumId },
  };
}

/** Build `/request/:requestId/offers` with a raw id (must be URL-safe). */
export function requestOffersPath(requestId: string): string {
  return `/request/${encodeURIComponent(requestId)}/offers`;
}

/** After accepting a quote — `bookingId` from `acceptQuote` response (omit until known). */
export function requestBookingPath(
  requestId: string,
  bookingId?: string,
): string {
  const base = `/request/${encodeURIComponent(requestId)}/booking`;
  if (bookingId) {
    return `${base}?bookingId=${encodeURIComponent(bookingId)}`;
  }
  return base;
}

export function rateBookingPath(bookingId: string): string {
  return `${routes.rateBookingBase}/${encodeURIComponent(bookingId)}`;
}
