import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
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
import { useFreelancerListing } from "../hooks/useFreelancerListing";
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
import { freelancerChatHref, freelancerPortfolioGalleryHref } from "@/navigation/routes";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

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
 * Customer-facing **business profile**: showcase hero, identity, bio, portfolio preview.
 */
export function FreelancerProfileScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = freelancerIdFromParams(params.id);
  const { data: discoveryData } = useDiscoveryData();
  const { listing, loading } = useFreelancerListing(id);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const heroH = Math.min(320, Math.round(screenW * 0.85));

  const inner = screenW - 2 * WOLT_PAGE_PADDING;
  const gridGap = 10;
  const portfolioColumns = 3;
  const tileSize = (inner - gridGap * (portfolioColumns - 1)) / portfolioColumns;

  if (loading) {
    return (
      <CustomerAppChrome>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingCaption}>Loading profile…</Text>
        </View>
      </CustomerAppChrome>
    );
  }

  if (!listing) {
    return (
      <CustomerAppChrome>
        <View style={styles.notFound}>
          <EmptyState
            title="Professional not found"
            description="This provider may still be onboarding, inactive, or the link is outdated."
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
    `${listing.subtitle} Add your story from Pro dashboard — listing and portfolio.`;

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
          <View style={styles.profileIntroCard}>
            <Text style={styles.name}>{listing.title}</Text>
            <Text style={styles.tagline}>{listing.subtitle}</Text>

            <View style={styles.statsRow}>
              <View style={[styles.statPill, styles.ratingPill]}>
                <Image
                  source={RATING_BADGE}
                  style={styles.ratingIcon}
                  resizeMode="contain"
                />
                <Text style={styles.statValue}>{listing.rating}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statMuted}>
                  {jobsDoneForListing(listing).toLocaleString()} jobs done
                </Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statMuted}>{listing.eta}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statMuted}>{feeCompactLine(listing)}</Text>
              </View>
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
            <View style={styles.trustBadgeRow}>
              {listing.isLicensed ? (
                <View style={styles.trustBadge}>
                  <Ionicons name="ribbon-outline" size={15} color="#B91C1C" />
                  <Text style={styles.trustBadgeText}>Licensed</Text>
                </View>
              ) : null}
              {listing.isInsured ? (
                <View style={styles.trustBadge}>
                  <Ionicons name="shield-checkmark-outline" size={15} color="#15803D" />
                  <Text style={styles.trustBadgeText}>Insured</Text>
                </View>
              ) : null}
            </View>
            {listing.isLicensed && listing.licenseNumber ? (
              <Text style={styles.licenseNumberText}>License: {listing.licenseNumber}</Text>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccentDot} />
              <Text style={styles.sectionLabel}>Bio</Text>
            </View>
            <CollapsibleBio body={bioBody} />
          </View>

          <View style={[styles.sectionCard, styles.portfolioCard]}>
            <View style={styles.portfolioSectionHeader}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentDot} />
                <Text style={[styles.sectionLabel, styles.portfolioSectionTitle]}>
                  Portfolio
                </Text>
              </View>
              {showSeeAll ? (
                <Pressable
                  onPress={openGallery}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="See all portfolio albums"
                  style={styles.seeAllPill}
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
  screenRoot: { flex: 1, backgroundColor: "#FFFDFD" },
  scroll: { flex: 1, backgroundColor: "#FFFDFD" },
  body: { paddingBottom: spacing.xxxl },
  notFound: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingHorizontal: WOLT_PAGE_PADDING,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingCaption: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  pad: {
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  profileIntroCard: {
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3D7D9",
  },
  name: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.35,
  },
  tagline: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: "600",
    color: "#57534E",
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.chip,
    backgroundColor: "#F5F5F4",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E5E4",
  },
  ratingPill: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingIcon: { width: 18, height: 18 },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statMuted: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: "600",
    color: "#44403C",
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
    marginTop: spacing.lg,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.chip,
    backgroundColor: "#FFE4E6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FECDD3",
  },
  chipText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    fontWeight: "700",
    color: "#7F1D1D",
  },
  trustBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radii.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D6D3D1",
    backgroundColor: "#FFFFFF",
  },
  trustBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    fontWeight: "700",
    color: "#292524",
  },
  licenseNumberText: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: "600",
    color: "#78716C",
  },
  sectionCard: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F3D7D9",
  },
  portfolioCard: {
    paddingBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionAccentDot: {
    width: 5,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  portfolioSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  portfolioSectionTitle: {
    marginTop: 0,
    marginBottom: 0,
  },
  seeAllLink: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  seeAllPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.chip,
    backgroundColor: "#FFF1F2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FECDD3",
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  albumTile: {
    marginBottom: spacing.sm,
  },
  albumCoverWrap: {
    borderRadius: radii.image,
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
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  albumTileTitle: {
    marginTop: 6,
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 15,
  },
  albumTileMeta: {
    marginTop: 1,
    fontFamily: fontFamily.regular,
    fontSize: 11,
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
