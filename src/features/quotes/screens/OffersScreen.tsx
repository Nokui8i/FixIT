import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { acceptQuote } from "@/features/bookings/api/acceptQuote";
import { OfferCard } from "@/features/quotes/components/OfferCard";
import type { QuoteOffer } from "@/features/quotes/types/quoteOffer";
import {
  type OfferSortKey,
  sortOffers,
} from "@/features/quotes/utils/sortOffers";
import { requestBookingPath } from "@/navigation/routes";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { EmptyState } from "@/shared/components/EmptyState";
import { colors, radii, spacing } from "@/theme/tokens";

const SORT_OPTIONS: { key: OfferSortKey; label: string }[] = [
  { key: "recommended", label: "Best match" },
  { key: "price_low", label: "Price" },
  { key: "eta", label: "ETA" },
  { key: "rating", label: "Rating" },
];

/**
 * Customer: compare quotes for one request.
 * Data: subscribe to Firestore `quotes` where `requestId` matches the route param.
 */
export function OffersScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const id = typeof requestId === "string" ? requestId : "";
  const offers: QuoteOffer[] = [];
  // Implement: useState + useEffect with Firestore onSnapshot on `quotes` where requestId === id.

  const [sortKey, setSortKey] = useState<OfferSortKey>("recommended");
  const [refreshing, setRefreshing] = useState(false);
  const [busyQuoteId, setBusyQuoteId] = useState<string | null>(null);

  const sortedOffers = useMemo(
    () => sortOffers(offers, sortKey),
    [offers, sortKey],
  );

  const onRefresh = () => {
    setRefreshing(true);
    // Replace with Firestore refetch or snapshot re-run when wired.
    setTimeout(() => setRefreshing(false), 400);
  };

  const onAccept = async (offer: QuoteOffer) => {
    if (!id) return;
    setBusyQuoteId(offer.id);
    try {
      const result = await acceptQuote({ requestId: id, quoteId: offer.id });
      if (result.status === "ok") {
        router.replace(requestBookingPath(id, result.bookingId));
        return;
      }
      Alert.alert("Cannot accept yet", result.message);
    } finally {
      setBusyQuoteId(null);
    }
  };

  return (
    <CustomerAppChrome>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ScreenPageTitle padded={false}>Offers</ScreenPageTitle>
        <Text style={styles.requestLine}>
          Request ID: <Text style={styles.mono}>{id || "—"}</Text>
        </Text>

        <Text style={styles.sortHeading}>Sort</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}
        >
          {SORT_OPTIONS.map((opt) => {
            const on = sortKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.sortChip, on && styles.sortChipOn]}
                onPress={() => setSortKey(opt.key)}
              >
                <Text style={[styles.sortChipText, on && styles.sortChipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.sortHint}>
          {offers.length === 0
            ? "Sorting applies once quotes load from Firestore."
            : null}
        </Text>

        {sortedOffers.length === 0 ? (
          <EmptyState
            title="No offers yet"
            description="Listen to Firestore `quotes` for this `requestId` after dispatch is implemented. Render one card per QuoteOffer."
          />
        ) : (
          sortedOffers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              onAccept={onAccept}
              busy={busyQuoteId === o.id}
            />
          ))
        )}
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  requestLine: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  mono: {
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sortHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sortRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipOn: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.woltSeeAllBg,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  sortChipTextOn: {
    color: colors.textPrimary,
  },
  sortHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    minHeight: 16,
  },
});
