import type { ServiceListing } from "../types/serviceListing";

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Jobs completed on-platform. Demo uses a stable placeholder per `id` until Firestore. */
export function jobsDoneForListing(item: ServiceListing): number {
  if (item.jobsDone != null) return item.jobsDone;
  const s = seedFromId(item.id);
  return 12 + (s % 488);
}
