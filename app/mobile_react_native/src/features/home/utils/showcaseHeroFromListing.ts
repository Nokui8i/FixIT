import type { ServiceListing } from "../types/serviceListing";
import type { ShowcaseSlide } from "../types/freelancerShowcase";
import { SHOWCASE_MAX_IMAGES } from "../types/freelancerShowcase";

/** Enforces max 3 images + 1 video; images first, then at most one video. */
export function clampShowcaseSlides(slides: ShowcaseSlide[]): ShowcaseSlide[] {
  const images: ShowcaseSlide[] = [];
  let video: ShowcaseSlide | undefined;
  for (const s of slides) {
    if (s.type === "image" && images.length < SHOWCASE_MAX_IMAGES) {
      images.push(s);
    } else if (s.type === "video" && !video) {
      video = s;
    }
  }
  return video ? [...images, video] : images;
}

/**
 * Hero carousel slides from listing data (e.g. set when the pro publishes a job post — future).
 * Not edited from the customer-facing profile card.
 */
export function buildShowcaseSlidesFromListing(
  listing: ServiceListing,
): ShowcaseSlide[] {
  const hero = listing.showcaseHero;
  if (hero) {
    const imgs = (hero.imageUrls ?? [])
      .slice(0, SHOWCASE_MAX_IMAGES)
      .map((uri) => ({ type: "image" as const, uri }));
    const v = hero.video;
    if (v?.url) {
      return clampShowcaseSlides([
        ...imgs,
        {
          type: "video" as const,
          uri: v.url,
          posterUri: v.posterUrl,
        },
      ]);
    }
    if (imgs.length > 0) return imgs;
  }
  return [{ type: "image", uri: listing.imageUrl }];
}
