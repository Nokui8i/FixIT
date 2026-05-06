import React, { useCallback } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NotificationListRow } from "@/features/notifications/components/NotificationListRow";
import { NotificationsEmptyState } from "@/features/notifications/components/NotificationsEmptyState";
import { useInAppNotifications } from "@/features/notifications/hooks/useInAppNotifications";
import { useLocalAccountProfile } from "@/features/account/hooks/useLocalAccountProfile";
import type { InAppNotification } from "@/features/notifications/types/inAppNotification";
import { rateBookingPath, routes } from "@/navigation/routes";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { colors, spacing } from "@/theme/tokens";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";

/**
 * Customer notification center. List is driven by `useInAppNotifications` (Firestore when wired).
 */
export function NotificationsScreen() {
  const { hydrated } = useLocalAccountProfile();
  const { items, hasUnread, markRead, dismiss, markAllRead } =
    useInAppNotifications({
      // In-app inbox must always show notifications; settings are for external push/email channels.
      serviceUpdatesEnabled: true,
      marketingEnabled: true,
    });

  const openNotification = useCallback(
    (item: InAppNotification) => {
      markRead(item.id);
      if (item.kind === "message") {
        router.push(routes.messages);
        return;
      }
      if (item.kind === "offer" || item.kind === "request") {
        router.push(routes.myRequests);
        return;
      }
      if (item.kind === "review_request" && item.bookingId) {
        const base = rateBookingPath(item.bookingId);
        router.push(item.proId ? `${base}?proId=${encodeURIComponent(item.proId)}` : base);
        return;
      }
      if (item.kind === "booking") {
        router.push(routes.myRequests);
        return;
      }
      if (item.kind === "payment_succeeded" || item.kind === "payment_failed") {
        router.push(routes.accountManagement);
      }
    },
    [markRead],
  );

  const headerRight = hasUnread ? (
    <Pressable onPress={markAllRead} hitSlop={8}>
      <Text style={styles.markAll}>Mark all</Text>
    </Pressable>
  ) : null;

  return (
    <CustomerAppChrome>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          items.length === 0 ? styles.scrollWhenEmpty : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {!hydrated ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading notifications…</Text>
          </View>
        ) : null}
        {hydrated && items.length > 0 ? (
          <View style={styles.titleRow}>
            <ScreenPageTitle
              padded={false}
              style={styles.screenTitle}
              numberOfLines={1}
            >
              Notifications
            </ScreenPageTitle>
            {headerRight}
          </View>
        ) : null}
        {hydrated && items.length === 0 ? (
          <NotificationsEmptyState />
        ) : hydrated ? (
          <View style={styles.list}>
            {items.map((item, index) => (
              <NotificationListRow
                key={item.id}
                item={item}
                isLast={index === items.length - 1}
                onDismiss={dismiss}
                onOpen={openNotification}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    alignItems: "stretch",
  },
  scrollWhenEmpty: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    flex: 1,
    marginBottom: 0,
    paddingRight: spacing.sm,
  },
  list: {
    width: "100%",
  },
  markAll: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  loadingWrap: {
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
