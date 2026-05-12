import React from "react";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ServiceListing } from "../types/serviceListing";
import { feeCompactLine } from "../utils/listingFeeLabels";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, radii, spacing } from "@/theme/tokens";

const RATING_BADGE = require("../../../../assets/icons/rating-badge.png") as ImageSourcePropType;

/** Exported so list separators align with the avatar column. */
export const FREELANCER_LIST_AVATAR_SIZE = 76;

type Props = {
  item: ServiceListing;
  onPress?: () => void;
};

/**
 * Full-width discovery row (single column) — Wolt-style list vs compact grid cards.
 */
export function FreelancerListRow({ item, onPress }: Props) {
  const inner = (
    <>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.avatar}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {item.subtitle}
        </Text>
        <View style={styles.metaRow}>
          <Image
            source={RATING_BADGE}
            style={styles.ratingIcon}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.metaText}>{item.rating}</Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {item.eta}
          </Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {feeCompactLine(item)}
          </Text>
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.subtitle}`}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel={`${item.title}. ${item.subtitle}`}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  rowPressed: {
    opacity: 0.92,
  },
  avatar: {
    width: FREELANCER_LIST_AVATAR_SIZE,
    height: FREELANCER_LIST_AVATAR_SIZE,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceSoft,
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: "center",
    minHeight: FREELANCER_LIST_AVATAR_SIZE - 4,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  ratingIcon: {
    width: 14,
    height: 14,
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  metaSep: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.55,
  },
});
