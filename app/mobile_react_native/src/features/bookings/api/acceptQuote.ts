export type AcceptQuoteInput = {
  requestId: string;
  quoteId: string;
};

export type AcceptQuoteResult =
  | { status: "ok"; bookingId: string }
  | { status: "error"; message: string };

/**
 * Customer accepts one quote → creates booking, triggers payment flow, updates request.
 *
 * **Not implemented** — use a Cloud Function or transaction:
 * - validate quote belongs to request and is still open
 * - create `bookings` doc
 * - update `service_requests` + `quotes` status
 * - return `bookingId` for navigation to confirmation
 */
export async function acceptQuote(
  _input: AcceptQuoteInput,
): Promise<AcceptQuoteResult> {
  return {
    status: "error",
    message:
      "acceptQuote is not implemented. Add transactional write (booking + request status) and Stripe payment intent, then return bookingId.",
  };
}
