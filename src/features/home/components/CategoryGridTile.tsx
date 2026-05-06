import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { fontFamily } from "@/theme/fonts";
import {
  WOLT_CATEGORY_LABEL_GAP,
  WOLT_CATEGORY_TILE_GAP,
  WOLT_PAGE_PADDING,
  woltFont,
} from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";
import type { CategoryTile } from "../data/categoryCatalog";

type Props = {
  tile: CategoryTile;
  onPress: () => void;
};

/**
 * Two-column discovery tile (Wolt-style): pastel square + art + label below.
 * Width is derived from the window so grids stay edge-aligned with carousels.
 */
export function CategoryGridTile({ tile, onPress }: Props) {
  const { width: screenW } = useWindowDimensions();
  const gap = WOLT_CATEGORY_TILE_GAP;
  const pad = WOLT_PAGE_PADDING;
  const cellW = Math.max(140, (screenW - 2 * pad - gap) / 2);
  const cornerRadius = 12;
  const abbrevSize = Math.min(32, Math.max(20, Math.round(cellW * 0.22)));

  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrap,
        { width: cellW, marginBottom: spacing.lg },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.artCard,
          {
            width: cellW,
            height: cellW * 0.72,
            backgroundColor: tile.tint,
            borderRadius: cornerRadius,
          },
        ]}
      >
        {tile.image ? (
          <Image
            source={tile.image}
            style={[styles.artImageFill, { borderRadius: cornerRadius }]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.artGlyphWrap}>
            <Text style={[styles.glyph, { fontSize: abbrevSize }]}>
              {tile.abbreviation}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {tile.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  pressed: { opacity: 0.92 },
  artCard: {
    overflow: "hidden",
  },
  artImageFill: {
    width: "100%",
    height: "100%",
  },
  artGlyphWrap: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontFamily: fontFamily.bold,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  label: {
    fontFamily: fontFamily.bold,
    marginTop: WOLT_CATEGORY_LABEL_GAP,
    fontSize: woltFont.categoryLabel.size + 1,
    fontWeight: woltFont.categoryLabel.weight,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 18,
  },
});
