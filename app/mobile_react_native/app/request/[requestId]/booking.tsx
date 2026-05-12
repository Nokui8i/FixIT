import { BookingConfirmationScreen } from "@/features/bookings/screens/BookingConfirmationScreen";

/**
 * Customer: post-accept confirmation and next steps (payment, contact rules, etc.).
 *
 * URL: `/request/:requestId/booking` — optional query `bookingId` after `acceptQuote` succeeds.
 */
export default function RequestBookingRoute() {
  return <BookingConfirmationScreen />;
}
