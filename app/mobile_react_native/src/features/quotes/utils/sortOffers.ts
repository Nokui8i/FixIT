import type { QuoteOffer } from "@/features/quotes/types/quoteOffer";

export type OfferSortKey = "recommended" | "price_low" | "eta" | "rating";

function parsePrice(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function parseEtaMinutes(s: string): number {
  const m = s.match(/(\d+)/);
  if (!m) return Number.POSITIVE_INFINITY;
  return parseInt(m[1], 10);
}

function parseRating(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Stable sort for Firestore-backed offers once `offers` is non-empty. */
export function sortOffers(
  offers: QuoteOffer[],
  key: OfferSortKey,
): QuoteOffer[] {
  const copy = [...offers];
  if (key === "recommended") {
    return copy;
  }
  copy.sort((a, b) => {
    if (key === "price_low") {
      return parsePrice(a.price) - parsePrice(b.price);
    }
    if (key === "eta") {
      return parseEtaMinutes(a.eta) - parseEtaMinutes(b.eta);
    }
    if (key === "rating") {
      return parseRating(b.rating) - parseRating(a.rating);
    }
    return 0;
  });
  return copy;
}
