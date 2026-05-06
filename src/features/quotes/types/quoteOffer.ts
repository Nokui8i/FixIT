/**
 * One quote from a professional for a single service request.
 * Loaded from Firestore collection `quotes` filtered by `requestId`.
 */
export type QuoteOffer = {
  id: string;
  proName: string;
  rating: string;
  eta: string;
  price: string;
  distance: string;
  note: string;
};
