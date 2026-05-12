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
  subtitle?: string;
  onSubtitlePress?: () => void;
  /** Optional right-side slot (e.g. icon button). */
  right?: React.ReactNode;
  /**
   * When true, skip extra safe-area top padding (use under `CustomerAppChrome`, which
   * already reserves space below the blurred top bar).
   */
  omitSafeAreaTop?: boolean;
};

/**
 * Simple stack header with back affordance.
 * Used on inner screens because root `Stack` uses `headerShown: false` for Wolt-style custom chrome.
 */
export function ScreenHeader({
  title,
  subtitle,
  onSubtitlePress,
  right,
  omitSafeAreaTop,
}: Props) {
  const insets = useSafeAreaInsets();
  const topPad = omitSafeAreaTop ? spacing.sm : insets.top + spacing.sm;

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <View style={[styles.wrap, { paddingTop: topPad }]}>
      <View style={styles.row}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        {title ? (
          <View style={styles.titleCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              onSubtitlePress ? (
                <Pressable
                  onPress={onSubtitlePress}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={subtitle}
                >
                  <Text style={[styles.subtitle, styles.subtitleLink]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )
            ) : null}
          </View>
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
    textAlign: "center",
    fontSize: woltFont.cardTitle.size,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  titleCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  subtitleLink: {
    textDecorationLine: "underline",
  },
  titleSpacer: {
    flex: 1,
  },
  right: {
    minWidth: 56,
    alignItems: "flex-end",
  },
});
