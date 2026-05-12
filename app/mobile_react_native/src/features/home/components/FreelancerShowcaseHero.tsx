import Ionicons from "@expo/vector-icons/Ionicons";
import { ResizeMode, Video } from "expo-av";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { PortfolioVideoLightbox } from "./PortfolioVideoLightbox";
import type { ServiceListing } from "../types/serviceListing";
import type { ShowcaseSlide } from "../types/freelancerShowcase";
import { buildShowcaseSlidesFromListing } from "../utils/showcaseHeroFromListing";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  listing: ServiceListing;
  heroHeight: number;
};

type SlidePageProps = {
  item: ShowcaseSlide;
  active: boolean;
  width: number;
  height: number;
  onExpandVideo?: () => void;
};

function ShowcaseSlidePage({
  item,
  active,
  width,
  height,
  onExpandVideo,
}: SlidePageProps) {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (item.type !== "video") return;
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      void v.playAsync().catch(() => {});
    } else {
      void v.pauseAsync().catch(() => {});
      void v.setPositionAsync(0).catch(() => {});
    }
  }, [active, item.type]);

  if (item.type === "image") {
    return (
      <View style={{ width, height }}>
        <Image
          source={{ uri: item.uri }}
          style={styles.slideFill}
          contentFit="cover"
          accessibilityLabel="Showcase photo"
        />
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <Video
        ref={videoRef}
        source={{ uri: item.uri }}
        style={styles.slideFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay={active}
        useNativeControls={false}
        usePoster={Boolean(item.posterUri)}
        posterSource={item.posterUri ? { uri: item.posterUri } : undefined}
        posterStyle={styles.slideFill}
      />
      {onExpandVideo ? (
        <Pressable
          style={styles.expandVideo}
          onPress={onExpandVideo}
          accessibilityRole="button"
          accessibilityLabel="Open video full screen"
        >
          <Ionicons name="expand" size={20} color={colors.background} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Read-only hero carousel (up to 3 images + 1 video from `listing.showcaseHero`).
 * Media is attached when the freelancer publishes a job post from their profile (future), not here.
 */
export function FreelancerShowcaseHero({ listing, heroHeight }: Props) {
  const { width: screenW } = useWindowDimensions();
  const slides = useMemo(
    () => buildShowcaseSlidesFromListing(listing),
    [listing],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [lightboxPoster, setLightboxPoster] = useState<string | null>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const ix = viewableItems[0]?.index;
      if (typeof ix === "number") setActiveIndex(ix);
    },
  ).current;

  return (
    <View style={[styles.heroWrap, { height: heroHeight }]}>
      <FlatList
        data={slides}
        keyExtractor={(item, index) => `${item.type}-${item.uri}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 85 }}
        getItemLayout={(_, index) => ({
          length: screenW,
          offset: screenW * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <ShowcaseSlidePage
            item={item}
            active={index === activeIndex}
            width={screenW}
            height={heroHeight}
            onExpandVideo={
              item.type === "video" && index === activeIndex
                ? () => {
                    setLightboxPoster(item.posterUri ?? null);
                    setLightboxUri(item.uri);
                  }
                : undefined
            }
          />
        )}
      />

      {slides.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {slides.map((_, i) => (
            <View
              key={`dot-${i}`}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}

      <PortfolioVideoLightbox
        visible={lightboxUri != null}
        videoUri={lightboxUri}
        posterUri={lightboxPoster}
        onClose={() => {
          setLightboxUri(null);
          setLightboxPoster(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    width: "100%",
    backgroundColor: colors.surfaceSoft,
    position: "relative",
  },
  slideFill: {
    width: "100%",
    height: "100%",
  },
  dots: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    backgroundColor: colors.background,
    width: 18,
  },
  expandVideo: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
