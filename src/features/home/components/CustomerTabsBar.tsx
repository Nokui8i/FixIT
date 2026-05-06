import type {
  BottomTabBarProps,
  BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import type { ParamListBase } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TAB_BAR_PILL_HEIGHT,
  tabBarShellBottomPad,
} from "@/features/home/customerTabBar";
import { loadInboxThreads } from "@/data/repositories/messagesRepository";
import { colors, shadows, spacing } from "@/theme/tokens";

const ICON = 24;

/** Tab route names must match files under `app/(tabs)/`. */
const TABS: {
  name: string;
  accessibilityLabel: string;
  iconOutline: keyof typeof Ionicons.glyphMap;
  iconSolid: keyof typeof Ionicons.glyphMap;
  badge?: boolean;
}[] = [
  {
    name: "index",
    accessibilityLabel: "Home",
    iconOutline: "home-outline",
    iconSolid: "home",
  },
  {
    name: "messages",
    accessibilityLabel: "Messages",
    iconOutline: "mail-outline",
    iconSolid: "mail",
    badge: true,
  },
  {
    name: "search",
    accessibilityLabel: "Search",
    iconOutline: "search-outline",
    iconSolid: "search",
  },
  {
    name: "post",
    accessibilityLabel: "Post a request",
    iconOutline: "clipboard-outline",
    iconSolid: "clipboard",
  },
  {
    name: "account",
    accessibilityLabel: "Profile",
    iconOutline: "person-circle-outline",
    iconSolid: "person-circle",
  },
];

function TabSlot({
  focused,
  onPress,
  accessibilityLabel,
  iconOutline,
  iconSolid,
  badgeCount,
  showBadge,
}: {
  focused: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  iconOutline: keyof typeof Ionicons.glyphMap;
  iconSolid: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
  showBadge?: boolean;
}) {
  const ink = colors.textPrimary;
  const inkMuted = colors.textSecondary;
  const displayBadge =
    showBadge && typeof badgeCount === "number" && badgeCount > 0;
  const badgeText = badgeCount! > 9 ? "9+" : String(badgeCount);

  return (
    <Pressable
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconSlot, focused && styles.iconSlotActive]}>
        <Ionicons
          name={focused ? iconSolid : iconOutline}
          size={ICON}
          color={focused ? ink : inkMuted}
        />
        {displayBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Fixed bottom pill for the main tab navigator — only tab selection updates; chrome stays put.
 */
export function CustomerTabsBar({ state, navigation }: BottomTabBarProps) {
  const tabNav =
    navigation as unknown as BottomTabNavigationProp<ParamListBase>;
  const insets = useSafeAreaInsets();
  const bottomPad = tabBarShellBottomPad(insets.bottom);
  const [messageCount, setMessageCount] = useState(0);

  const refreshBadge = useCallback(() => {
    void (async () => {
      const threads = await loadInboxThreads();
      setMessageCount(threads.length);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshBadge();
    }, [refreshBadge]),
  );

  const activeName = state.routes[state.index]?.name;

  return (
    <View
      style={[styles.shell, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { minHeight: TAB_BAR_PILL_HEIGHT }]}>
        {TABS.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.name);
          if (!route) return null;
          const focused = activeName === tab.name;
          const onPress = () => {
            const e = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!e.defaultPrevented) {
              tabNav.navigate(route.name, route.params);
            }
          };

          return (
            <TabSlot
              key={tab.name}
              focused={focused}
              onPress={onPress}
              accessibilityLabel={tab.accessibilityLabel}
              iconOutline={tab.iconOutline}
              iconSolid={tab.iconSolid}
              badgeCount={messageCount}
              showBadge={tab.badge}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 420,
    paddingHorizontal: 4,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 0, 0, 0.08)",
    ...shadows.floating,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabPressed: { opacity: 0.85 },
  iconSlot: {
    position: "relative",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlotActive: {
    backgroundColor: "rgba(0, 0, 0, 0.07)",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: "800",
  },
});
