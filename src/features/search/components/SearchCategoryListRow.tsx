import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CategoryTile } from "@/features/home/data/categoryCatalog";
import { specialtiesForCategory } from "@/features/requests/data/categorySpecialties";
import { fontFamily } from "@/theme/fonts";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  tile: CategoryTile;
  onPress: () => void;
  showDivider?: boolean;
};

function keywordLine(categoryId: string): string {
  const opts = specialtiesForCategory(categoryId).filter((o) => o.id !== "general");
  const list = (opts.length > 0 ? opts : specialtiesForCategory(categoryId)).slice(0, 4);
  return list.map((o) => o.label).join(" · ");
}

/**
 * Fiverr-style category row: icon well, bold title, gray keyword line from local specialties.
 */
export function SearchCategoryListRow({ tile, onPress, showDivider }: Props) {
  const subtitle = keywordLine(tile.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tile.label}, browse category`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconWell, { backgroundColor: tile.tint }]}>
        {tile.image ? (
          <Image
            source={tile.image}
            style={styles.iconImageFill}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.iconGlyph}>{tile.abbreviation}</Text>
        )}
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{tile.label}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {showDivider ? <View style={styles.divider} pointerEvents="none" /> : null}
    </Pressable>
  );
}

const ICON_WELL = 48;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 72,
    position: "relative",
    backgroundColor: colors.background,
  },
  rowPressed: {
    backgroundColor: colors.rowWash,
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  /** Fills the tinted well edge-to-edge (rounded clip on the well). */
  iconImageFill: {
    width: "100%",
    height: "100%",
  },
  iconGlyph: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  textCol: {
    flex: 1,
    marginLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  divider: {
    position: "absolute",
    left: spacing.lg + ICON_WELL + spacing.md,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
});
