import type { ServiceListing } from "../types/serviceListing";
import { jobsDoneForListing } from "./listingMetrics";

export type CategoryFreelancerSortKey =
  | "recommended"
  | "rating"
  | "jobs_done";

export function parseRating(rating: string): number {
  const n = parseFloat(rating);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Best match: ratings plus jobs done (log-scaled so volume helps without drowning stars).
 */
function recommendedScore(item: ServiceListing): number {
  const rating = parseRating(item.rating);
  const jobs = jobsDoneForListing(item);
  return rating * 24 + Math.log1p(jobs) * 8;
}

export function sortCategoryFreelancers(
  items: ServiceListing[],
  sortKey: CategoryFreelancerSortKey,
): ServiceListing[] {
  const copy = [...items];
  switch (sortKey) {
    case "rating":
      copy.sort((a, b) => parseRating(b.rating) - parseRating(a.rating));
      break;
    case "jobs_done":
      copy.sort(
        (a, b) =>
          jobsDoneForListing(b) - jobsDoneForListing(a),
      );
      break;
    case "recommended":
    default:
      copy.sort((a, b) => recommendedScore(b) - recommendedScore(a));
      break;
  }
  return copy;
}
