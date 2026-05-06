import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "@/theme/fonts";
import { woltFont } from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  title: string;
  onSeeAllPress?: () => void;
  /** Wolt-scale section title (~22pt). */
  largeTitle?: boolean;
};

export function SectionHeader({ title, onSeeAllPress, largeTitle }: Props) {
  return (
    <View style={styles.row}>
      <Text
        style={[styles.title, largeTitle && styles.titleLarge]}
        numberOfLines={2}
      >
        {title}
      </Text>
      {onSeeAllPress ? (
        <Pressable style={styles.button} onPress={onSeeAllPress}>
          <Text style={styles.buttonText}>See all</Text>
        </Pressable>
      ) : (
        <View style={styles.buttonPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: spacing.xxl,
    marginBottom: 12,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: woltFont.section.size,
    fontWeight: woltFont.section.weight,
    color: colors.textPrimary,
    paddingRight: spacing.sm,
  },
  /** Clone `RestaurantListPage` subsection — 20 / bold */
  titleLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.25,
  },
  /** Clone `CategoryList` “See all” pill */
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.woltSeeAllBg,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  buttonText: {
    fontFamily: fontFamily.regular,
    color: colors.woltSeeAllText,
    fontSize: woltFont.seeAll.size,
    fontWeight: woltFont.seeAll.weight,
  },
  buttonPlaceholder: {
    minWidth: 72,
  },
});
