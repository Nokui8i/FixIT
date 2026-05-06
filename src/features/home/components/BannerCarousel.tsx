import { Video, ResizeMode } from "expo-av";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  BANNER_ASPECT_WIDTH_OVER_HEIGHT,
  BANNER_SIDE_INSET,
  resolveBannerKind,
  type HomeBannerAd,
} from "../data/homeBanners";
import { colors, shadows, spacing } from "@/theme/tokens";
import { loadHomeBanners } from "@/data/repositories/bannersRepository";

type BannerSlideMediaProps = {
  ad: HomeBannerAd;
  width: number;
  height: number;
  isActive: boolean;
};

function BannerSlideMedia({ ad, width, height, isActive }: BannerSlideMediaProps) {
  const kind = resolveBannerKind(ad);
  const baseStyle = { width, height };

  if (kind === "video") {
    return (
      <Video
        source={{ uri: ad.mediaUrl }}
        style={baseStyle}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay={isActive}
        usePoster={Boolean(ad.posterUrl)}
        posterSource={ad.posterUrl ? { uri: ad.posterUrl } : undefined}
      />
    );
  }

  return (
    <Image
      source={{ uri: ad.mediaUrl }}
      style={baseStyle}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
}

export function BannerCarousel() {
  const { width: screenW } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  const [slides, setSlides] = useState<HomeBannerAd[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await loadHomeBanners();
      if (alive) setSlides(rows);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const innerW = Math.max(0, screenW - 2 * BANNER_SIDE_INSET);
  const innerH = Math.round(innerW / BANNER_ASPECT_WIDTH_OVER_HEIGHT);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const w = e.nativeEvent.layoutMeasurement.width;
      if (w <= 0) return;
      const i = Math.round(x / w);
      setPageIndex(Math.max(0, Math.min(i, slides.length - 1)));
    },
    [slides.length],
  );

  if (slides.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ width: screenW }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {slides.map((ad, index) => (
          <View
            key={ad.id}
            style={[styles.page, { width: screenW }]}
            accessibilityRole="image"
            accessibilityLabel={ad.accessibilityLabel ?? "Advertisement"}
          >
            <View
              style={[
                styles.card,
                {
                  width: innerW,
                  height: innerH,
                },
              ]}
            >
              <BannerSlideMedia
                ad={ad}
                width={innerW}
                height={innerH}
                isActive={pageIndex === index}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((ad, i) => (
            <View
              key={ad.id}
              style={[styles.dot, i === pageIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  page: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardStroke,
    backgroundColor: colors.surfaceSoft,
    ...shadows.card,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.textSecondary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
