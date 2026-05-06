import { OffersScreen } from "@/features/quotes/screens/OffersScreen";

/**
 * Compare quotes for a single request (customer flow).
 *
 * URL: `/request/:requestId/offers`
 *
 * `requestId` comes from the path (see Expo Router dynamic segments).
 */
export default function RequestOffersRoute() {
  return <OffersScreen />;
}
