import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CollapsibleBio } from "../components/CollapsibleBio";
import { FreelancerShowcaseHero } from "../components/FreelancerShowcaseHero";
import { useDiscoveryData } from "../hooks/useDiscoveryData";
import type { PortfolioAlbum } from "../types/serviceListing";
import { feeCompactLine } from "../utils/listingFeeLabels";
import { jobsDoneForListing } from "../utils/listingMetrics";
import {
  albumCoverSource,
  albumItemCount,
  getPortfolioAlbums,
  PREVIEW_ALBUM_MAX,
} from "../utils/portfolioAlbums";
import { freelancerIdFromParams } from "../utils/freelancerRouteParams";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  freelancerChatHref,
  freelancerPortfolioGalleryHref,
} from "@/navigation/routes";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING, woltFont } from "@/theme/woltHome";
import { colors, radii, shadows, spacing } from "@/theme/tokens";
import { listingById } from "@/data/repositories/discoveryRepository";

const RATING_BADGE = require("../../../../assets/icons/rating-badge.png");

function firstItemIsVideo(album: PortfolioAlbum): boolean {
  return album.items[0]?.type === "video";
}

type AlbumTileProps = {
  album: PortfolioAlbum;
  tileSize: number;
  onOpenGallery: () => void;
};

function AlbumPreviewTile({ album, tileSize, onOpenGallery }: AlbumTileProps) {
  const cover = albumCoverSource(album);
  const n = albumItemCount(album);
  const isVideo = firstItemIsVideo(album);

  return (
    <Pressable
      style={[styles.albumTile, { width: tileSize }]}
      onPress={onOpenGallery}
      accessibilityRole="button"
      accessibilityLabel={`${album.title}, ${n} items, open portfolio gallery`}
    >
      <View style={[styles.albumCoverWrap, { width: tileSize, height: tileSize }]}>
        {cover ? (
          <Image
            source={cover}
            style={styles.albumCover}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.albumCover, styles.albumCoverPlaceholder]} />
        )}
        {isVideo ? (
          <View style={styles.playBadge}>
            <Ionicons name="play" size={22} color={colors.background} />
          </View>
        ) : null}
      </View>
      <Text style={styles.albumTileTitle} numberOfLines={2}>
        {album.title}
      </Text>
      <Text style={styles.albumTileMeta}>
        {n} {n === 1 ? "item" : "items"}
      </Text>
    </Pressable>
  );
}

/**
 * Customer-facing professional profile: identity, bio, portfolio album preview.
 */
export function FreelancerProfileScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = freelancerIdFromParams(params.id);
  const { data: discoveryData } = useDiscoveryData();
  const listing = id ? listingById(discoveryData, id) : undefined;
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const heroH = Math.min(320, Math.round(screenW * 0.85));

  const inner = screenW - 2 * WOLT_PAGE_PADDING;
  const gridGap = spacing.sm;
  const tileSize = (inner - gridGap) / 2;

  if (!listing) {
    return (
      <CustomerAppChrome>
        <View style={styles.notFound}>
          <EmptyState
            title="Professional not found"
            description="Go back to discovery and pick a listing."
          />
        </View>
      </CustomerAppChrome>
    );
  }

  const albums = getPortfolioAlbums(listing);
  const previewAlbums = albums.slice(0, PREVIEW_ALBUM_MAX);
  const showSeeAll = albums.length > PREVIEW_ALBUM_MAX;

  const openGallery = () => {
    router.push(freelancerPortfolioGalleryHref(listing.id));
  };

  const bioBody =
    listing.bio ??
    `${listing.subtitle} Write your story for customers in your pro profile when the dashboard is connected.`;

  const chatFabBottom = insets.bottom + 14;

  return (
    <CustomerAppChrome>
      <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <FreelancerShowcaseHero listing={listing} heroHeight={heroH} />

        <View style={styles.pad}>
          <Text style={styles.name}>{listing.title}</Text>
          <Text style={styles.tagline}>{listing.subtitle}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Image
                source={RATING_BADGE}
                style={styles.ratingIcon}
                resizeMode="contain"
              />
              <Text style={styles.statValue}>{listing.rating}</Text>
            </View>
            <Text style={styles.statDivider}>·</Text>
            <Text style={styles.statMuted}>
              {jobsDoneForListing(listing).toLocaleString()} jobs done
            </Text>
            <Text style={styles.statDivider}>·</Text>
            <Text style={styles.statMuted}>{listing.eta}</Text>
            <Text style={styles.statDivider}>·</Text>
            <Text style={styles.statMuted}>{feeCompactLine(listing)}</Text>
          </View>

          <View style={styles.chipRow}>
            {listing.categoryIds.map((cid) => {
              const label =
                discoveryData.categories.find((row) => row.id === cid)?.label ?? cid;
              if (!label) return null;
              return (
                <View key={cid} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Bio</Text>
          <CollapsibleBio body={bioBody} />

          <View style={styles.portfolioSectionHeader}>
            <Text style={[styles.sectionLabel, styles.portfolioSectionTitle]}>
              Portfolio
            </Text>
            {showSeeAll ? (
              <Pressable
                onPress={openGallery}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="See all portfolio albums"
              >
                <Text style={styles.seeAllLink}>See all</Text>
              </Pressable>
            ) : null}
          </View>

          {albums.length === 0 ? (
            <Text style={styles.portfolioEmpty}>
              No albums yet — this pro can organize photos and videos into albums from their dashboard.
            </Text>
          ) : (
            <View style={[styles.albumGrid, { gap: gridGap }]}>
              {previewAlbums.map((album) => (
                <AlbumPreviewTile
                  key={album.id}
                  album={album}
                  tileSize={tileSize}
                  onOpenGallery={openGallery}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.chatFab,
          { bottom: chatFabBottom, right: WOLT_PAGE_PADDING },
          pressed && styles.chatFabPressed,
        ]}
        onPress={() => router.push(freelancerChatHref(listing.id))}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${listing.title}`}
      >
        <View style={styles.chatFabAvatarWrap}>
          <Image
            source={{ uri: listing.imageUrl }}
            style={styles.chatFabAvatar}
            contentFit="cover"
          />
          <View style={styles.chatFabOnlineDot} />
        </View>
        <Text style={styles.chatFabLabel}>Chat</Text>
      </Pressable>
      </View>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  scroll: { flex: 1 },
  body: { paddingBottom: spacing.xxxl },
  notFound: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingHorizontal: WOLT_PAGE_PADDING,
  },
  pad: {
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingTop: spacing.lg,
  },
  name: {
    fontFamily: fontFamily.black,
    fontSize: woltFont.pageTitle.size,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
    fontSize: woltFont.cardSubtitle.size,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingIcon: { width: 18, height: 18 },
  statValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  statMuted: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  statDivider: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.button,
    backgroundColor: colors.woltSeeAllBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.bold,
    fontSize: woltFont.section.size,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  portfolioSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  portfolioSectionTitle: {
    marginTop: 0,
    marginBottom: 0,
  },
  seeAllLink: {
    fontFamily: fontFamily.regular,
    fontSize: woltFont.seeAll.size,
    fontWeight: woltFont.seeAll.weight,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  albumTile: {
    marginBottom: spacing.md,
  },
  albumCoverWrap: {
    borderRadius: radii.card,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
    ...shadows.card,
  },
  albumCover: {
    width: "100%",
    height: "100%",
  },
  albumCoverPlaceholder: {
    backgroundColor: colors.surfaceSoft,
  },
  playBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  albumTileTitle: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 18,
  },
  albumTileMeta: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  portfolioEmpty: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chatFab: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    backgroundColor: colors.background,
    borderRadius: 28,
    ...shadows.floating,
    zIndex: 30,
  },
  chatFabPressed: { opacity: 0.92 },
  chatFabAvatarWrap: {
    width: 36,
    height: 36,
    position: "relative",
  },
  chatFabAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chatFabOnlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: colors.background,
  },
  chatFabLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
