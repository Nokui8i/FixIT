import { useLocalSearchParams } from "expo-router";
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
import { getPortfolioAlbumById } from "../utils/portfolioAlbums";
import {
  freelancerIdFromParams,
  portfolioAlbumIdFromParams,
} from "../utils/freelancerRouteParams";
import type { PortfolioMediaItem } from "../types/serviceListing";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";

/**
 * One album: all items in upload order (up to product max per album).
 */
export function FreelancerPortfolioAlbumScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    albumId?: string | string[];
  }>();
  const id = freelancerIdFromParams(params.id);
  const albumId = portfolioAlbumIdFromParams(params.albumId);
  const { listing, loading } = useFreelancerListing(id);
  const album =
    listing && albumId ? getPortfolioAlbumById(listing, albumId) : undefined;

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

  if (!albumId) {
    return (
      <CustomerAppChrome>
        <View style={styles.notFound}>
          <EmptyState
            title="Album not found"
            description="Go back and open a portfolio from the profile."
          />
        </View>
      </CustomerAppChrome>
    );
  }

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
            description="Go back and open this album from the profile."
          />
        </View>
      </CustomerAppChrome>
    );
  }

  if (!album) {
    return (
      <CustomerAppChrome>
        <View style={styles.notFound}>
          <EmptyState
            title="Album not found"
            description="This album may have been removed."
          />
        </View>
      </CustomerAppChrome>
    );
  }

  const renderItem = (item: PortfolioMediaItem, i: number) => {
    const cellStyle = {
      width: colW,
      marginBottom: gap,
    };

    if (item.type === "video") {
      return (
        <PortfolioMediaThumb
          key={`${album.id}-${i}`}
          item={item}
          cellStyle={cellStyle}
          onVideoOpen={() =>
            setVideoViewer({
              uri: item.url,
              posterUrl: item.posterUrl,
            })
          }
        />
      );
    }

    return (
      <Pressable
        key={`${album.id}-${i}`}
        onPress={() => setLightboxUri(item.url)}
        accessibilityRole="button"
        accessibilityLabel="View photo full screen"
      >
        <PortfolioMediaThumb item={item} cellStyle={cellStyle} />
      </Pressable>
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
          {album.title}
        </ScreenPageTitle>
        <Text style={styles.subhead}>{listing.title}</Text>
        <Text style={styles.meta}>
          {album.items.length}{" "}
          {album.items.length === 1 ? "item" : "items"}
        </Text>

        <View style={styles.grid}>
          {album.items.map((item, i) => renderItem(item, i))}
        </View>
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
    marginBottom: spacing.xs,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: WOLT_PAGE_PADDING,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: WOLT_PAGE_PADDING,
  },
});
