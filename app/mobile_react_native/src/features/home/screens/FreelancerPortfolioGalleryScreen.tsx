import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { PortfolioImageLightbox } from "../components/PortfolioImageLightbox";
import { PortfolioMediaThumb } from "../components/PortfolioMediaThumb";
import { PortfolioVideoLightbox } from "../components/PortfolioVideoLightbox";
import { useFreelancerListing } from "../hooks/useFreelancerListing";
import type { PortfolioAlbum, PortfolioMediaItem } from "../types/serviceListing";
import {
  GALLERY_ALBUM_VISIBLE_THUMB_SLOTS,
  getPortfolioAlbums,
} from "../utils/portfolioAlbums";
import { freelancerIdFromParams } from "../utils/freelancerRouteParams";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { fontFamily } from "@/theme/fonts";
import { freelancerPortfolioAlbumHref } from "@/navigation/routes";
import { WOLT_PAGE_PADDING, woltFont } from "@/theme/woltHome";
import { colors, radii, spacing } from "@/theme/tokens";

const PREVIEW_SLOTS = GALLERY_ALBUM_VISIBLE_THUMB_SLOTS;

/**
 * Full portfolio: each album shows up to two previews; “+N” sits on the second
 * thumbnail when there are more items. Tap an image for full screen; tap + for the album.
 */
export function FreelancerPortfolioGalleryScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = freelancerIdFromParams(params.id);
  const { listing, loading } = useFreelancerListing(id);
  const { width: screenW } = useWindowDimensions();
  const inner = screenW - 2 * WOLT_PAGE_PADDING;
  const gap = spacing.sm;
  const colW = (inner - gap) / 2;

  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [videoViewer, setVideoViewer] = useState<{
    uri: string;
    posterUrl?: string;
  } | null>(null);

  const closeLightbox = useCallback(() => setLightboxUri(null), []);
  const closeVideo = useCallback(() => setVideoViewer(null), []);

  if (loading) {
    return (
      <CustomerAppChrome>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary} />
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
            description="Go back and open a profile from the feed."
          />
        </View>
      </CustomerAppChrome>
    );
  }

  const albums = getPortfolioAlbums(listing);

  const openAlbum = (album: PortfolioAlbum) => {
    router.push(freelancerPortfolioAlbumHref(listing.id, album.id));
  };

  const renderPreviewSlot = (
    album: PortfolioAlbum,
    slotIndex: number,
    item: PortfolioMediaItem,
  ) => {
    const cellStyle = { width: colW, marginBottom: 0 };
    const key = `${album.id}-slot-${slotIndex}`;
    const moreCount =
      slotIndex === PREVIEW_SLOTS - 1 && album.items.length > PREVIEW_SLOTS
        ? album.items.length - PREVIEW_SLOTS
        : 0;

    const badge =
      moreCount > 0 ? (
        <Pressable
          style={styles.moreBadge}
          onPress={() => openAlbum(album)}
          accessibilityRole="button"
          accessibilityLabel={`${moreCount} more in ${album.title}, open album`}
        >
          <Text style={styles.moreBadgeText}>+{moreCount}</Text>
        </Pressable>
      ) : null;

    if (item.type === "video") {
      return (
        <View key={key} style={[styles.slotWrap, { width: colW, marginBottom: gap }]}>
          <PortfolioMediaThumb
            item={item}
            cellStyle={cellStyle}
            onVideoOpen={() =>
              setVideoViewer({
                uri: item.url,
                posterUrl: item.posterUrl,
              })
            }
          />
          {badge}
        </View>
      );
    }

    return (
      <View key={key} style={[styles.slotWrap, { width: colW, marginBottom: gap }]}>
        <Pressable
          onPress={() => setLightboxUri(item.url)}
          accessibilityRole="button"
          accessibilityLabel="View photo full screen"
        >
          <PortfolioMediaThumb item={item} cellStyle={cellStyle} />
        </Pressable>
        {badge}
      </View>
    );
  };

  return (
    <CustomerAppChrome>
      <PortfolioImageLightbox
        visible={lightboxUri != null}
        imageUri={lightboxUri}
        onClose={closeLightbox}
      />
      <PortfolioVideoLightbox
        visible={videoViewer != null}
        videoUri={videoViewer?.uri ?? null}
        posterUri={videoViewer?.posterUrl}
        onClose={closeVideo}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <ScreenPageTitle padded style={styles.pageTitle}>
          Portfolio
        </ScreenPageTitle>
        <Text style={styles.subhead}>{listing.title}</Text>

        {albums.length === 0 ? (
          <Text style={styles.empty}>No albums yet.</Text>
        ) : (
          albums.map((album: PortfolioAlbum) => {
            const previewItems = album.items.slice(0, PREVIEW_SLOTS);

            return (
              <View key={album.id} style={styles.albumBlock}>
                <Pressable
                  onPress={() => openAlbum(album)}
                  accessibilityRole="button"
                  accessibilityLabel={`${album.title}, open album`}
                >
                  <Text style={styles.albumTitle}>{album.title}</Text>
                  <Text style={styles.albumMeta}>
                    {album.items.length}{" "}
                    {album.items.length === 1 ? "item" : "items"}
                  </Text>
                </Pressable>
                <View style={styles.grid}>
                  {previewItems.map((item, slotIndex) =>
                    renderPreviewSlot(album, slotIndex, item),
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: { paddingBottom: spacing.xxxl, paddingTop: spacing.xs },
  notFound: { flex: 1, paddingTop: spacing.xl, paddingHorizontal: WOLT_PAGE_PADDING },
  pageTitle: { marginBottom: spacing.xs },
  subhead: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textSecondary,
    paddingHorizontal: WOLT_PAGE_PADDING,
    marginBottom: spacing.lg,
  },
  empty: {
    paddingHorizontal: WOLT_PAGE_PADDING,
    color: colors.textSecondary,
    fontSize: 15,
  },
  albumBlock: {
    marginBottom: spacing.xl,
    paddingHorizontal: WOLT_PAGE_PADDING,
  },
  albumTitle: {
    fontFamily: fontFamily.bold,
    fontSize: woltFont.section.size,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  albumMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  slotWrap: {
    position: "relative",
    borderRadius: radii.card,
    overflow: "visible",
  },
  moreBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  moreBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    fontWeight: "700",
    color: colors.background,
    fontVariant: ["tabular-nums"],
  },
});
