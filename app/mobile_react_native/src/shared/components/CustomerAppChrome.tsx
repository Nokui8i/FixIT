import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { customerTabBarMainInset } from "@/features/home/customerTabBar";
import {
  HomeBlurredTopBar,
  HOME_TOP_BAR_INNER_HEIGHT,
} from "@/features/home/components/HomeBlurredTopBar";
import { HomeTopBar } from "@/features/home/components/HomeTopBar";
import { LocationBottomSheet } from "@/features/home/components/LocationBottomSheet";
import { useLocalAccountProfile } from "@/features/account/hooks/useLocalAccountProfile";
import { routes } from "@/navigation/routes";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  children: React.ReactNode;
  /** Inner screens use back; home-like surfaces can use the bell. */
  leftAction?: "notifications" | "back";
  /** Wire to `Animated.ScrollView` / list scroll for glass blur; omit for static blur. */
  scrollY?: SharedValue<number>;
  /**
   * When true, reserves space at the bottom for the main hub tab bar
   * (`app/(tabs)/` + `CustomerTabsBar`). Omit on stack-only screens.
   */
  reserveHubTabBar?: boolean;
};

/**
 * Same top chrome as home: blurred bar + location + profile (+ bell or back).
 * Wrap customer stack screens so the app header is consistent everywhere.
 */
export function CustomerAppChrome({
  children,
  leftAction = "back",
  scrollY: scrollYProp,
  reserveHubTabBar = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const fallbackScroll = useSharedValue(0);
  const scrollY = scrollYProp ?? fallbackScroll;
  const { profile, update } = useLocalAccountProfile();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const topChromeHeight =
    insets.top + HOME_TOP_BAR_INNER_HEIGHT + spacing.sm;
  const bottomPad = reserveHubTabBar
    ? customerTabBarMainInset(insets.bottom)
    : 0;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.main,
          { paddingTop: topChromeHeight, paddingBottom: bottomPad },
        ]}
      >
        {children}
      </View>

      <View
        style={[styles.headerShell, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <HomeBlurredTopBar scrollY={scrollY}>
          <HomeTopBar
            leftAction={leftAction}
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
  main: {
    flex: 1,
  },
  headerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
