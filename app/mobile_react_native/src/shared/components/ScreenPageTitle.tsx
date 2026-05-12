import React from "react";
import { StyleSheet, Text, type TextProps } from "react-native";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING, woltFont } from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";

export type ScreenPageTitleProps = TextProps & {
  children: React.ReactNode;
  /** When false, horizontal padding is omitted (parent row already insets). Default true. */
  padded?: boolean;
};

/**
 * Shared large title for customer stack screens (browse lists, category roster, etc.).
 * Typography matches `woltFont.pageTitle` everywhere.
 */
export function ScreenPageTitle({
  children,
  style,
  padded = true,
  ...rest
}: ScreenPageTitleProps) {
  return (
    <Text style={[styles.base, !padded && styles.unpadded, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fontFamily.black,
    fontSize: woltFont.pageTitle.size,
    fontWeight: woltFont.pageTitle.weight,
    lineHeight: woltFont.pageTitle.lineHeight,
    color: colors.textPrimary,
    letterSpacing: -0.6,
    paddingHorizontal: WOLT_PAGE_PADDING,
    marginBottom: spacing.md,
  },
  unpadded: {
    paddingHorizontal: 0,
  },
});
