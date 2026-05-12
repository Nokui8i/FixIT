/**
 * Wolt-inspired layout metrics for the customer home feed (spacing, type scale,
 * responsive widths). Numbers mirror the reference analysis (~390px-wide phones).
 */
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { spacing } from "@/theme/tokens";

/** Screen horizontal inset — carousels align to this. */
export const WOLT_PAGE_PADDING = 16;

/** Gap between sibling carousel cards — matches clone list `gap: 12`. */
export const WOLT_CAROUSEL_CARD_GAP = 12;

/**
 * Category hero tiles — intentionally compact so more fit on screen.
 */
export const WOLT_CATEGORY_TILE_MAX_W = 104;

/** “Peek the next card” — wide freelancer tiles (still shows next card edge). */
export const WOLT_CAROUSEL_CARD_W_FRACTION = 0.7;

/** Collapsed filter pill row (chip) target height. */
export const WOLT_PILL_HEIGHT = 32;

/** Gap between category tiles / sticky chips (horizontal). */
export const WOLT_CATEGORY_TILE_GAP = 7;

/** Space between the rounded image square and the label. */
export const WOLT_CATEGORY_LABEL_GAP = 4;

export const woltFont = {
  /** Primary screen heading — one scale app-wide (slightly smaller than early Wolt clone 30). */
  pageTitle: { size: 26, weight: "900" as const, lineHeight: 30 },
  /** Clone `CategoryList` “Categories” — 18 / semibold. */
  section: { size: 18, weight: "600" as const },
  /** Home hero line under page chrome */
  heroPrompt: { size: 22, weight: "700" as const },
  /** Clone restaurant / list item name — 16 / semibold */
  cardTitle: { size: 16, weight: "600" as const },
  cardSubtitle: { size: 14, weight: "400" as const },
  /** Clone metadata row ~13 */
  meta: { size: 13, weight: "500" as const },
  /** Clone `RestaurantHeader` location — 14 / semibold */
  location: { size: 14, weight: "600" as const },
  /** Clone category “See all” — 14 / medium */
  seeAll: { size: 14, weight: "500" as const },
  pill: { size: 13, weight: "600" as const },
  /** Clone category name under image — slightly smaller for compact tiles */
  categoryLabel: { size: 13, weight: "600" as const },
} as const;

export function getCategoryTileWidth(screenWidth: number): number {
  const inner = screenWidth - 2 * WOLT_PAGE_PADDING;
  const fromFraction = Math.round(inner * 0.32);
  return Math.min(WOLT_CATEGORY_TILE_MAX_W, Math.max(76, fromFraction));
}

/** Width of one pro card in horizontal discovery carousels. */
export function getCarouselCardWidth(screenWidth: number): number {
  const inner = screenWidth - 2 * WOLT_PAGE_PADDING - WOLT_CAROUSEL_CARD_GAP;
  return Math.max(160, Math.round(inner * WOLT_CAROUSEL_CARD_W_FRACTION));
}

/** Image band — hero photo height scales with card width (carousel strips). */
export function getCarouselImageHeight(cardWidth: number): number {
  return Math.min(190, Math.max(118, Math.round(cardWidth * 0.575)));
}

/** Full card min height (image band + text block) for “See more” tile alignment. */
export function getProsCarouselCardMinHeight(cardWidth: number): number {
  return getCarouselImageHeight(cardWidth) + 84;
}

/**
 * Inner scroll height for expanded category row (before outer `spacing.md`).
 * Layout: square image card (`tw` tall) + gap + label (up to 2 lines) + vertical padding.
 */
export function getCategoryExpandedInnerHeight(screenWidth: number): number {
  const tw = getCategoryTileWidth(screenWidth);
  const imageSquare = tw;
  const labelBlock = 40;
  const verticalPadding = 16;
  return imageSquare + WOLT_CATEGORY_LABEL_GAP + labelBlock + verticalPadding;
}

/**
 * Vertical space the category **hero** row occupies inside the home ScrollView
 * (margins + horizontal strip padding + tile column). Used to know when to pin chips under the header.
 */
/** Must match vertical margins/padding in `CategoryHeroRow`. */
export function getCategoryHeroBlockScrollExtent(screenWidth: number): number {
  const inner = getCategoryExpandedInnerHeight(screenWidth);
  const wrapTop = spacing.sm;
  const scrollPaddingY = spacing.sm * 2;
  const wrapBottom = spacing.xs;
  return wrapTop + scrollPaddingY + wrapBottom + inner;
}

export type WoltHomeMetrics = {
  screenWidth: number;
  categoryTileWidth: number;
  carouselCardWidth: number;
  carouselImageHeight: number;
  categoryExpandedInnerHeight: number;
};

export function useWoltHomeMetrics(): WoltHomeMetrics {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    const carouselCardWidth = getCarouselCardWidth(width);
    return {
      screenWidth: width,
      categoryTileWidth: getCategoryTileWidth(width),
      carouselCardWidth,
      carouselImageHeight: getCarouselImageHeight(carouselCardWidth),
      categoryExpandedInnerHeight: getCategoryExpandedInnerHeight(width),
    };
  }, [width]);
}
