import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ServiceListing } from "../types/serviceListing";
import { HorizontalProsCarousel } from "./HorizontalProsCarousel";
import { fontFamily } from "@/theme/fonts";
import { woltFont } from "@/theme/woltHome";
import { colors, shadows, spacing } from "@/theme/tokens";

const NEARBY_CAROUSEL_PIN = require("../../../../assets/home/nearby-carousel-pin.png");

type Props = {
  items: ServiceListing[];
  onSeeMore?: () => void;
};

const BUBBLE_RADIUS = 28;

/** Full-bleed red-wash panel + 3D lift + location pin + nearby pros carousel. */
export function NearbyFeaturedCarouselPanel({ items, onSeeMore }: Props) {
  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={["#FFF5F5", "#FFE8E8", "#FFD6D6", "#F87171"]}
        locations={[0, 0.32, 0.68, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.45)",
            "rgba(255,255,255,0)",
            "rgba(220,38,38,0.14)",
          ]}
          locations={[0, 0.42, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glossShade}
          pointerEvents="none"
        />
        <View style={styles.innerHighlight} pointerEvents="none" />
        <View style={styles.headerRow}>
          <View style={styles.headerLead}>
            <View style={styles.pinWrap}>
              {/* expo-image decodes PNG alpha correctly; RN Image often draws black behind transparency on Android */}
              <Image
                source={NEARBY_CAROUSEL_PIN}
                style={styles.pinImage}
                contentFit="contain"
                accessibilityLabel="Nearby on map"
              />
            </View>
            <Text style={styles.sectionTitle} numberOfLines={2}>
              Nearby Professionals
            </Text>
          </View>
          {onSeeMore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all nearby professionals"
              style={({ pressed }) => [
                styles.seeAllButton,
                pressed && styles.seeAllButtonPressed,
              ]}
              onPress={onSeeMore}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          ) : (
            <View style={styles.seeAllPlaceholder} />
          )}
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyDesc}>
              Connect Firestore to show pros near you.
            </Text>
          </View>
        ) : (
          <HorizontalProsCarousel
            items={items}
            onSeeMore={onSeeMore}
            flushHorizontal
            flushInnerPadding={spacing.lg}
          />
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginVertical: spacing.xl,
    width: "100%",
    alignSelf: "stretch",
    ...shadows.nearbyBubble,
  },
  gradient: {
    borderRadius: BUBBLE_RADIUS,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md,
    overflow: "hidden",
  },
  glossShade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUBBLE_RADIUS,
  },
  /** Soft top sheen */
  innerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "32%",
    opacity: 0.16,
    borderTopLeftRadius: BUBBLE_RADIUS,
    borderTopRightRadius: BUBBLE_RADIUS,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  /** Pin + title — matches SectionHeader title column behavior */
  headerLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: spacing.md,
  },
  /** Transparent PNG — explicit transparent bg avoids Android RN Image black backing */
  pinWrap: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pinImage: {
    width: 76,
    height: 76,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.primary,
    paddingRight: spacing.xs,
  },
  /** Same pill as `SectionHeader` “See all” */
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.woltSeeAllBg,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexShrink: 0,
  },
  seeAllButtonPressed: { opacity: 0.88 },
  seeAllText: {
    fontFamily: fontFamily.regular,
    color: colors.woltSeeAllText,
    fontSize: woltFont.seeAll.size,
    fontWeight: woltFont.seeAll.weight,
  },
  seeAllPlaceholder: {
    minWidth: 72,
    flexShrink: 0,
  },
  emptyBox: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
