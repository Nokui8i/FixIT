import { Tabs } from "expo-router";
import React from "react";
import { CustomerTabsBar } from "@/features/home/components/CustomerTabsBar";

/**
 * Main hub tabs — bottom bar is fixed; only the active tab panel swaps (no sliding chrome).
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomerTabsBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        /** Cross-fade tab panels — bar stays fixed; only the “page” changes. */
        animation: "fade",
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    />
  );
}
