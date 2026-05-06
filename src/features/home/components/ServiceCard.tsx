import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const RATING_BADGE = require("../../../../assets/icons/rating-badge.png") as ImageSourcePropType;
import type { ServiceListing } from "../types/serviceListing";
import { jobsDoneForListing } from "../utils/listingMetrics";
import { fontFamily } from "@/theme/fonts";
import {
  getCarouselImageHeight,
  useWoltHomeMetrics,
  WOLT_PAGE_PADDING,
  woltFont,
} from "@/theme/woltHome";
import { freelancerProfileHref } from "@/navigation/routes";
import { colors, radii, shadows, spacing } from "../../../theme/tokens";

type Props = {
  item: ServiceListing;
  /** `carousel`: horizontal strip. `grid`: 2-col. `feed`: full-width stacked list (category browse). */
  variant?: "grid" | "carousel" | "feed";
};

export function ServiceCard({ item, variant = "grid" }: Props) {
  const carousel = variant === "carousel";
  const feed = variant === "feed";
  const wolt = useWoltHomeMetrics();
  const { width: screenW } = useWindowDimensions();

  const carouselW = wolt.carouselCardWidth;
  const carouselImageH = wolt.carouselImageHeight;
  const feedW = Math.max(0, screenW - 2 * WOLT_PAGE_PADDING);
  const feedImageH = feed ? getCarouselImageHeight(feedW) : 0;
  const imageH = feed ? feedImageH : carouselImageH;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, open profile`}
      onPress={() => router.push(freelancerProfileHref(item.id))}
      style={({ pressed }) => [
        styles.card,
        carousel && styles.cardCarouselBase,
        carousel && { width: carouselW },
        feed && styles.cardFeed,
        feed && { width: feedW },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item.imageUrl }}
          style={[
            styles.image,
            carousel || feed ? { height: imageH } : styles.imageGrid,
          ]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(17,17,17,0.22)", "rgba(17,17,17,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
          style={styles.imageShade}
        />
      </View>
      <View
        style={[
          styles.content,
          (carousel || feed) && styles.contentCarousel,
          feed && styles.contentFeed,
        ]}
      >
        {feed ? (
          <View style={styles.feedTitleRow}>
            <View style={styles.feedTextBlock}>
              <Text style={[styles.title, styles.titleCarousel]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text
                style={[styles.subtitle, styles.subtitleCarousel]}
                numberOfLines={2}
              >
                {item.subtitle}
              </Text>
              <Text style={styles.feedJobsDone}>
                {jobsDoneForListing(item).toLocaleString()} jobs done
              </Text>
            </View>
            <View style={styles.feedRatingSide}>
              <Image
                source={RATING_BADGE}
                style={styles.feedRatingIcon}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.feedRatingValue}>{item.rating}</Text>
            </View>
          </View>
        ) : (
          <>
            <Text
              style={[styles.title, carousel && styles.titleCarousel]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.subtitle, carousel && styles.subtitleCarousel]}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
            <View style={[styles.metaRow, carousel && styles.metaRowCarousel]}>
              <Image
                source={RATING_BADGE}
                style={[styles.ratingIcon, carousel && styles.ratingIconCarousel]}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text style={[styles.meta, carousel && styles.metaCarousel]}>{item.rating}</Text>
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadows.floating,
  },
  cardCarouselBase: {
    marginBottom: 0,
  },
  cardFeed: {
    marginBottom: spacing.md,
    alignSelf: "center",
  },
  cardPressed: {
    opacity: 0.94,
  },
  imageWrap: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: "100%",
  },
  /** Clone `RestaurantList` image proportion on narrower cards */
  imageGrid: {
    aspectRatio: 1.06,
    maxHeight: 182,
    minHeight: 124,
  },
  content: {
    padding: 12,
    gap: spacing.xs,
  },
  /** Tighter text stack on horizontal freelancer strips. */
  contentCarousel: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 0,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: woltFont.cardTitle.size,
    fontWeight: woltFont.cardTitle.weight,
    color: colors.textPrimary,
  },
  titleCarousel: {
    marginBottom: 2,
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: woltFont.cardSubtitle.size,
    color: colors.textSecondary,
  },
  subtitleCarousel: {
    marginTop: 0,
    fontSize: 12,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingTop: 6,
  },
  metaRowCarousel: {
    marginTop: 2,
    paddingTop: 0,
    gap: 3,
  },
  ratingIcon: {
    width: 17,
    height: 17,
  },
  ratingIconCarousel: {
    width: 15,
    height: 15,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: woltFont.meta.size,
    color: colors.textSecondary,
    fontWeight: woltFont.meta.weight,
  },
  metaCarousel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
  contentFeed: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 0,
  },
  feedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  feedTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  feedJobsDone: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: colors.textSecondary,
  },
  feedRatingSide: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 5,
  },
  feedRatingIcon: {
    width: 22,
    height: 22,
  },
  feedRatingValue: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "400",
    color: colors.textPrimary,
  },
});
