import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryHeroRow } from "../components/CategoryHeroRow";
import { HomeStickyCategoryChips } from "../components/HomeStickyCategoryChips";
import {
  HomeBlurredTopBar,
  HOME_TOP_BAR_INNER_HEIGHT,
} from "../components/HomeBlurredTopBar";
import { LocationBottomSheet } from "../components/LocationBottomSheet";
import { HomeTopBar } from "../components/HomeTopBar";
import { BannerCarousel } from "../components/BannerCarousel";
import { HorizontalProsCarousel } from "../components/HorizontalProsCarousel";
import { NearbyFeaturedCarouselPanel } from "../components/NearbyFeaturedCarouselPanel";
import { SectionHeader } from "../components/SectionHeader";
import {
  type CategoryTile,
} from "../data/categoryCatalog";
import { useDiscoveryData } from "../hooks/useDiscoveryData";
import { shuffleCopy } from "../utils/shuffle";
import { EmptyState } from "@/shared/components/EmptyState";
import { customerTabBarMainInset } from "@/features/home/customerTabBar";
import { browseSectionPath, categoryBrowsePath, routes } from "@/navigation/routes";
import {
  getCategoryHeroBlockScrollExtent,
  useWoltHomeMetrics,
} from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";
import {
  listingsForBrowse,
  listingsForCategory,
} from "@/data/repositories/discoveryRepository";
import { useLocalAccountProfile } from "@/features/account/hooks/useLocalAccountProfile";

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const woltMetrics = useWoltHomeMetrics();
  const heroScrollExtent = getCategoryHeroBlockScrollExtent(woltMetrics.screenWidth);
  const scrollY = useSharedValue(0);
  const { profile, update } = useLocalAccountProfile();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { data: discoveryData } = useDiscoveryData();

  const topChromeHeight =
    insets.top + HOME_TOP_BAR_INNER_HEIGHT + spacing.sm;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const onSelectCategory = useCallback((tile: CategoryTile) => {
    router.push(categoryBrowsePath(tile.id));
  }, []);

  /** Same pool as `/browse/around-you` — single nearby surface on home (bubble carousel). */
  const shuffledNearby = useMemo(
    () => shuffleCopy(listingsForBrowse(discoveryData, "around-you")),
    [discoveryData],
  );
  const shuffledTopRated = useMemo(
    () => shuffleCopy(listingsForBrowse(discoveryData, "top-rated")),
    [discoveryData],
  );
  const shuffledByCategoryId = useMemo(() => {
    const map: Record<string, ReturnType<typeof listingsForCategory>> = {};
    for (const c of discoveryData.categories) {
      map[c.id] = shuffleCopy(listingsForCategory(discoveryData, c.id));
    }
    return map;
  }, [discoveryData]);

  return (
    <View style={styles.root}>
      <View style={[styles.mainColumn, { paddingTop: topChromeHeight }]}>
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: customerTabBarMainInset(insets.bottom) + spacing.xl },
          ]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <CategoryHeroRow
            tiles={discoveryData.categories}
            onSelectCategory={onSelectCategory}
          />
          <BannerCarousel />

          <SectionHeader
            largeTitle
            title="Top Rated in Your Area"
            onSeeAllPress={() => router.push(browseSectionPath("top-rated"))}
          />
          {shuffledTopRated.length === 0 ? (
            <EmptyState
              title="No listings to show"
              description="Add a sorted query (e.g. by rating + distance) against your pros index or Firestore composite index, then map to ServiceListing[]."
            />
          ) : (
            <HorizontalProsCarousel
              items={shuffledTopRated}
              onSeeMore={() => router.push(browseSectionPath("top-rated"))}
            />
          )}

          <NearbyFeaturedCarouselPanel
            items={shuffledNearby}
            onSeeMore={() => router.push(browseSectionPath("around-you"))}
          />

          {discoveryData.categories.map((cat) => {
            const items = shuffledByCategoryId[cat.id] ?? [];
            if (items.length === 0) return null;
            return (
              <React.Fragment key={cat.id}>
                <SectionHeader
                  largeTitle
                  title={cat.label}
                  onSeeAllPress={() => router.push(categoryBrowsePath(cat.id))}
                />
                <HorizontalProsCarousel
                  items={items}
                  onSeeMore={() => router.push(categoryBrowsePath(cat.id))}
                />
              </React.Fragment>
            );
          })}
        </Animated.ScrollView>
      </View>

      <HomeStickyCategoryChips
        scrollY={scrollY}
        heroScrollExtent={heroScrollExtent}
        topUnderHeader={topChromeHeight}
        tiles={discoveryData.categories}
        onSelectCategory={onSelectCategory}
      />

      <View
        style={[styles.headerShell, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <HomeBlurredTopBar scrollY={scrollY}>
          <HomeTopBar
            locationSummary={profile.addressLine || undefined}
            onNotificationsPress={() => router.push(routes.notifications)}
            onLocationPress={() => setLocationSheetOpen(true)}
            onProfilePress={() => router.push(routes.account)}
          />
        </HomeBlurredTopBar>
      </View>

      <LocationBottomSheet
        open={locationSheetOpen}
        country={profile.country}
        currentAddress={profile.addressLine}
        onClose={() => setLocationSheetOpen(false)}
        onApplyLocation={(label) => update({ addressLine: label })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainColumn: {
    flex: 1,
  },
  headerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {},
});
