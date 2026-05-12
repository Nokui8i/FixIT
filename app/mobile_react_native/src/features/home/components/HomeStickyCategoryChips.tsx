import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { fontFamily } from "@/theme/fonts";
import {
  WOLT_CATEGORY_TILE_GAP,
  WOLT_PAGE_PADDING,
  WOLT_PILL_HEIGHT,
  woltFont,
} from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";
import type { CategoryTile } from "../data/categoryCatalog";

/** Chip row height (pills + vertical padding inside track). */
const CHIP_ROW_HEIGHT = WOLT_PILL_HEIGHT + spacing.xs * 2;
/**
 * Extra background below the blurred header before the pills — does not change `top`;
 * only adds breathing room inside the sticky strip.
 */
const STICKY_TOP_GAP = spacing.sm;
const TOTAL_STICKY_HEIGHT = STICKY_TOP_GAP + CHIP_ROW_HEIGHT;

/** Scroll distance (px) over which the strip eases in — longer = gentler “dock into place”. */
const REVEAL_LEAD = 88;
const REVEAL_TAIL = 16;
/** Soft vertical settle so labels feel like they land under the header, not pop in. */
const SETTLE_SLIDE_PX = 12;

type Props = {
  scrollY: SharedValue<number>;
  heroScrollExtent: number;
  topUnderHeader: number;
  tiles: CategoryTile[];
  onSelectCategory?: (tile: CategoryTile) => void;
};

function smoothstep01(t: number): number {
  "worklet";
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/**
 * Category chips pinned under the header: smooth scroll-linked reveal (no hard edge vs feed).
 */
export function HomeStickyCategoryChips({
  scrollY,
  heroScrollExtent,
  topUnderHeader,
  tiles,
  onSelectCategory,
}: Props) {
  const revealStart = Math.max(0, heroScrollExtent - REVEAL_LEAD);
  const revealEnd = heroScrollExtent + REVEAL_TAIL;

  const shellStyle = useAnimatedStyle(() => {
    const t = interpolate(
      scrollY.value,
      [revealStart, revealEnd],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const eased = smoothstep01(t);
    return {
      height: eased * TOTAL_STICKY_HEIGHT,
      overflow: "hidden" as const,
    };
  });

  const innerStyle = useAnimatedStyle(() => {
    const t = interpolate(
      scrollY.value,
      [revealStart, revealEnd],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const eased = smoothstep01(t);
    return {
      opacity: eased,
      transform: [{ translateY: (1 - eased) * SETTLE_SLIDE_PX }],
    };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.shell, { top: topUnderHeader }, shellStyle]}
    >
      <Animated.View style={[styles.rowWrap, innerStyle]} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.track}
        >
          {tiles.map((tile) => (
            <Pressable
              key={tile.id}
              style={styles.chip}
              onPress={() => onSelectCategory?.(tile)}
              disabled={!onSelectCategory}
            >
              <Text style={styles.chipText}>{tile.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 12,
    backgroundColor: colors.background,
    /** Extra fill below the header; `top` unchanged — only grows the sticky background downward. */
    paddingTop: STICKY_TOP_GAP,
  },
  rowWrap: {
    flex: 1,
    minHeight: CHIP_ROW_HEIGHT,
    justifyContent: "center",
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingRight: WOLT_PAGE_PADDING,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    minHeight: WOLT_PILL_HEIGHT,
    borderRadius: WOLT_PILL_HEIGHT / 2,
    backgroundColor: colors.woltIconWell,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.light,
    marginRight: WOLT_CATEGORY_TILE_GAP,
    justifyContent: "center",
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: woltFont.pill.size,
    fontWeight: woltFont.pill.weight,
    color: colors.textPrimary,
  },
});
