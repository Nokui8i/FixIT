import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "@/theme/fonts";
import {
  WOLT_CATEGORY_LABEL_GAP,
  WOLT_CATEGORY_TILE_GAP,
  WOLT_PAGE_PADDING,
  useWoltHomeMetrics,
  woltFont,
} from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";
import type { CategoryTile } from "../data/categoryCatalog";

type Props = {
  tiles: CategoryTile[];
  onSelectCategory?: (tile: CategoryTile) => void;
};

/**
 * Large category tiles for the home feed — lives **inside** the main ScrollView so it scrolls
 * away with the banner and listings (no overlay “vacuum” over the feed).
 */
export function CategoryHeroRow({ tiles, onSelectCategory }: Props) {
  const m = useWoltHomeMetrics();
  const tw = m.categoryTileWidth;
  const cornerRadius = 10;
  const abbrevSize = Math.min(24, Math.max(16, Math.round(tw * 0.26)));

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heroScrollContent}
      >
        {tiles.map((tile) => (
          <Pressable
            key={tile.id}
            style={[styles.heroCardWrap, { marginRight: WOLT_CATEGORY_TILE_GAP }]}
            onPress={() => onSelectCategory?.(tile)}
            disabled={!onSelectCategory}
          >
            <View style={[styles.heroItem, { width: tw }]}>
              <View
                style={[
                  styles.heroImageCard,
                  {
                    width: tw,
                    height: tw,
                    backgroundColor: tile.tint,
                    borderRadius: cornerRadius,
                  },
                ]}
              >
                {tile.image ? (
                  <Image
                    source={tile.image}
                    style={[styles.heroImageFill, { borderRadius: cornerRadius }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.heroGlyphWrap}>
                    <Text style={[styles.heroGlyphText, { fontSize: abbrevSize }]}>
                      {tile.abbreviation}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroLabel} numberOfLines={2}>
                {tile.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: WOLT_PAGE_PADDING,
  },
  heroScrollContent: {
    paddingVertical: spacing.sm,
    paddingRight: WOLT_PAGE_PADDING,
  },
  heroCardWrap: {},
  heroItem: {
    alignItems: "center",
  },
  heroImageCard: {
    overflow: "hidden",
  },
  heroImageFill: {
    width: "100%",
    height: "100%",
  },
  heroGlyphWrap: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGlyphText: {
    fontFamily: fontFamily.bold,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  heroLabel: {
    fontFamily: fontFamily.semiBold,
    marginTop: WOLT_CATEGORY_LABEL_GAP,
    width: "100%",
    fontSize: woltFont.categoryLabel.size,
    fontWeight: woltFont.categoryLabel.weight,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 17,
    backgroundColor: "transparent",
  },
});
