import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { fontFamily } from "@/theme/fonts";
import { woltFont } from "@/theme/woltHome";
import { colors, spacing } from "../../../theme/tokens";

const NOTIFICATION_BELL = require("../../../../assets/icons/notification-bell.png") as ImageSourcePropType;

/** Same tint for bell PNG and profile vector so they read as one pair. */
const TOP_BAR_ICON_COLOR = colors.textSecondary;
/** Bell + profile (slightly under default 22 for a lighter header). */
const TOP_BAR_ICON_SIZE = 19;

function IconHitTarget({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      style={styles.iconHit}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      {children}
    </Pressable>
  );
}

type Props = {
  /** Default: bell opens notifications. `back` shows a chevron for inner screens. */
  leftAction?: "notifications" | "back";
  onNotificationsPress?: () => void;
  /** When `leftAction` is `back` — defaults to `router.back()`. */
  onBackPress?: () => void;
  onLocationPress?: () => void;
  onProfilePress?: () => void;
  /** When set, shown in the center chip instead of “My Location”. */
  locationSummary?: string;
};

function formatLocationChip(summary?: string) {
  if (!summary?.trim()) return "My Location";
  const t = summary.trim();
  return t.length > 26 ? `${t.slice(0, 24)}…` : t;
}

export function HomeTopBar({
  leftAction = "notifications",
  onNotificationsPress,
  onBackPress,
  onLocationPress,
  onProfilePress,
  locationSummary,
}: Props) {
  const onBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <View style={styles.row}>
      {leftAction === "back" ? (
        <IconHitTarget onPress={onBack} accessibilityLabel="Back">
          <View style={styles.iconCircle}>
            <Ionicons
              name="chevron-back"
              size={TOP_BAR_ICON_SIZE + 2}
              color={colors.textPrimary}
            />
          </View>
        </IconHitTarget>
      ) : (
        <IconHitTarget onPress={onNotificationsPress} accessibilityLabel="Notifications">
          <View style={styles.iconCircle}>
            <Image
              source={NOTIFICATION_BELL}
              style={[styles.iconImage, { tintColor: TOP_BAR_ICON_COLOR }]}
              resizeMode="contain"
            />
          </View>
        </IconHitTarget>
      )}
      <Pressable style={styles.centerPressable} onPress={onLocationPress}>
        <View style={styles.centerWrap}>
          <Text style={styles.locationText} numberOfLines={1}>
            {formatLocationChip(locationSummary)}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </View>
      </Pressable>
      <IconHitTarget onPress={onProfilePress} accessibilityLabel="Account">
        <View style={styles.iconCircle}>
          <Ionicons name="person-outline" size={TOP_BAR_ICON_SIZE} color={TOP_BAR_ICON_COLOR} />
        </View>
      </IconHitTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  centerPressable: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  centerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontFamily: fontFamily.semiBold,
    fontSize: woltFont.location.size,
    fontWeight: woltFont.location.weight,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: TOP_BAR_ICON_SIZE,
    height: TOP_BAR_ICON_SIZE,
  },
});
