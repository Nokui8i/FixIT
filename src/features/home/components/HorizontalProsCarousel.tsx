import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { ServiceListing } from "../types/serviceListing";
import { ServiceCard } from "./ServiceCard";
import { WOLT_CAROUSEL_CARD_GAP, WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, shadows, spacing } from "@/theme/tokens";

/** Max pros shown in the home horizontal strip before trailing “See more”. */
export const HOME_PRO_CAROUSEL_MAX = 10;

type Props = {
  items: ServiceListing[];
  /** Opens full list (e.g. `/browse/nearby`) when the roster exceeds `HOME_PRO_CAROUSEL_MAX`. */
  onSeeMore?: () => void;
  /** Parent provides horizontal inset (e.g. featured pink panel padding). */
  flushHorizontal?: boolean;
  /** With `flushHorizontal`, horizontal padding for cards inside a full-bleed panel (screen edge = pink edge). */
  flushInnerPadding?: number;
  /** Hide the trailing arrow tile — use an external “See all” button instead. */
  hideTrailingSeeMore?: boolean;
};

export function HorizontalProsCarousel({
  items,
  onSeeMore,
  flushHorizontal,
  flushInnerPadding,
  hideTrailingSeeMore,
}: Props) {
  const showSeeMore =
    !hideTrailingSeeMore &&
    items.length > HOME_PRO_CAROUSEL_MAX &&
    Boolean(onSeeMore);
  const visible = items.length > HOME_PRO_CAROUSEL_MAX
    ? items.slice(0, HOME_PRO_CAROUSEL_MAX)
    : items;
  const hPad = flushHorizontal
    ? (flushInnerPadding ?? 0)
    : WOLT_PAGE_PADDING;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.track, { paddingLeft: hPad, paddingRight: hPad }]}
    >
      {visible.map((item) => (
        <View key={item.id} style={styles.cardCell}>
          <ServiceCard item={item} variant="carousel" />
        </View>
      ))}
      {showSeeMore && onSeeMore ? (
        <View style={[styles.cardCell, styles.seeMoreAlign]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See more"
            style={({ pressed }) => [
              styles.seeMoreRound,
              pressed && styles.seeMorePressed,
            ]}
            onPress={onSeeMore}
          >
            <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

/** Same carousel without “See more” (e.g. category screen under 10 items). */
export function HorizontalProsCarouselSimple({ items }: { items: ServiceListing[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
    >
      {items.map((item) => (
        <View key={item.id} style={styles.cardCell}>
          <ServiceCard item={item} variant="carousel" />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardCell: {
    marginRight: WOLT_CAROUSEL_CARD_GAP,
  },
  /** Vertical center next to listing cards (row stretches to tallest card). */
  seeMoreAlign: {
    justifyContent: "center",
  },
  seeMoreRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.woltSeeAllBg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
  },
  seeMorePressed: { opacity: 0.85 },
});
