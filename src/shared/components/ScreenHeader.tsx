import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamily } from "@/theme/fonts";
import { woltFont } from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  /** When omitted, only the back row shows (use a large title in the screen body). */
  title?: string;
  /** Optional right-side slot (e.g. icon button). */
  right?: React.ReactNode;
};

/**
 * Simple stack header with back affordance.
 * Used on inner screens because root `Stack` uses `headerShown: false` for Wolt-style custom chrome.
 */
export function ScreenHeader({ title, right }: Props) {
  const insets = useSafeAreaInsets();

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={styles.titleSpacer} />
        )}
        <View style={styles.right}>{right ?? null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backBtn: {
    minWidth: 56,
  },
  backText: {
    fontFamily: fontFamily.semiBold,
    fontSize: woltFont.cardTitle.size,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  title: {
    fontFamily: fontFamily.bold,
    flex: 1,
    textAlign: "center",
    fontSize: woltFont.cardTitle.size,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  titleSpacer: {
    flex: 1,
  },
  right: {
    minWidth: 56,
    alignItems: "flex-end",
  },
});
