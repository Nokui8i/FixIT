/** One asset inside an album — order matches how the pro uploaded. */
export type PortfolioMediaItem =
  | { type: "image"; url: string }
  | {
      type: "video";
      url: string;
      posterUrl?: string;
      /** Duration in seconds when known (e.g. from upload). Pro uploads: max 60s. */
      durationSec?: number;
    };

/**
 * Album group (Fiverr-style). Title + ordered items; single-item albums are allowed.
 * Maps from `pro_profiles.portfolioAlbums` or equivalent when live.
 */
export type PortfolioAlbum = {
  id: string;
  title: string;
  /** Up to 5 items (images and/or videos) per product rules. */
  items: PortfolioMediaItem[];
};

/**
 * One professional or business shown in discovery grids.
 * Production data comes from Firestore / backend; see `data/demoFreelancers.ts` for dev samples.
 */
export type ServiceListing = {
  id: string;
  title: string;
  subtitle: string;
  eta: string;
  /**
   * **Set by the professional** in their business profile (see `pro_profiles` — e.g. `startingFeeDisplay`).
   * Customer-facing “Starting at …” for typical small / entry jobs; not an average of past work. Use a
   * display string (e.g. "$55", "$55+"). Larger jobs are quoted after the customer describes scope.
   */
  fee: string;
  rating: string;
  imageUrl: string;
  /**
   * Top-of-profile “show off” strip (max **3 images** + **1 video**), usually filled when the pro
   * publishes a **job post** from their profile (creates their card on the platform — future).
   * Not edited from the customer-facing profile view.
   */
  showcaseHero?: {
    imageUrls: string[];
    video?: { url: string; posterUrl?: string };
  };
  /** Slugs matching `categoryCatalog` ids (e.g. `locksmith`). Replace with server fields when wired. */
  categoryIds: string[];
  /**
   * Jobs completed through this platform (lifetime). Drives discovery sort and pro incentives.
   * When omitted, category sort uses a stable placeholder derived from `id` until Firestore.
   */
  jobsDone?: number;
  /** Full profile story — maps from `pro_profiles.bio` when live. */
  bio?: string;
  /**
   * Grouped portfolio (preferred). Product limits: **5 albums**, **5 items per album**;
   * one **video per item slot**, max **60 seconds** when uploading from the pro dashboard.
   */
  portfolioAlbums?: PortfolioAlbum[];
  /** @deprecated Use `portfolioAlbums`; kept for migration / old demos. */
  portfolioImages?: string[];
  /** @deprecated Use `portfolioAlbums`. */
  portfolioVideos?: { url: string; posterUrl?: string; durationSec?: number }[];
};
