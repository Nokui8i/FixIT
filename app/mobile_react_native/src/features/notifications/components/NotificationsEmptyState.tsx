import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { colors, spacing } from "@/theme/tokens";

const ILLUSTRATION = require("../../../../assets/illustrations/notifications-empty.png") as ImageSourcePropType;

const ILLUSTRATION_MAX = 420;
const WIDTH_RATIO = 0.9;

type Props = {
  title?: string;
  description?: string;
};

/**
 * Wolt-style empty notifications: large centered hero art, title, supporting copy (no card chrome).
 */
export function NotificationsEmptyState({
  title = "No updates right now",
  description = "Check back later for offers, messages, payments, and reminders about your requests.",
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const illustrationWidth = useMemo(
    () => Math.min(windowWidth * WIDTH_RATIO, ILLUSTRATION_MAX),
    [windowWidth],
  );
  const illustrationHeight = illustrationWidth * 0.75;

  return (
    <View style={styles.root}>
      <Image
        source={ILLUSTRATION}
        style={[styles.image, { width: illustrationWidth, height: illustrationHeight }]}
        resizeMode="contain"
        accessibilityLabel="No notifications illustration"
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  image: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
});
