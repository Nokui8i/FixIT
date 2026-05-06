import type { ServiceListing } from "../types/serviceListing";

/**
 * `item.fee` is the pro’s own “starting at” amount from their profile; these strings only label it for customers.
 */

/** Strips legacy “from ” prefix from demo / API strings. */
export function parseFeeAmount(fee: string): string {
  return fee.replace(/^\s*from\s+/i, "").trim();
}

/** Tight copy for list rows, carousels, and profile stat row. */
export function feeCompactLine(item: ServiceListing): string {
  return `Starts ${parseFeeAmount(item.fee)}`;
}
