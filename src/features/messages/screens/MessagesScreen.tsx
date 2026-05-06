import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ChatThreadRow } from "../types";
import { loadInboxThreads } from "@/data/repositories/messagesRepository";
import { freelancerChatHref } from "@/navigation/routes";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { EmptyState } from "@/shared/components/EmptyState";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { fontFamily } from "@/theme/fonts";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";
import { colors, spacing } from "@/theme/tokens";

function formatThreadTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Inbox of conversations with professionals (AsyncStorage until Firestore chat).
 */
export function MessagesScreen() {
  const [threads, setThreads] = useState<ChatThreadRow[]>([]);

  const reload = useCallback(() => {
    void (async () => {
      setThreads(await loadInboxThreads());
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const renderRow = ({ item }: { item: ChatThreadRow }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(freelancerChatHref(item.proId))}
      accessibilityRole="button"
      accessibilityLabel={`Open chat with ${item.proName}`}
    >
      {item.proImageUrl ? (
        <Image
          source={{ uri: item.proImageUrl }}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={24} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {item.proName}
          </Text>
          <Text style={styles.time}>{formatThreadTime(item.updatedAt)}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {item.lastPreview}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <CustomerAppChrome reserveHubTabBar>
      <ScreenPageTitle padded style={styles.title}>
        Messages
      </ScreenPageTitle>
      {threads.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No messages yet"
            description="Open a professional profile and tap Chat to start a conversation."
          />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.proId}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.sm },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: WOLT_PAGE_PADDING,
    paddingTop: spacing.xl,
  },
  list: {
    paddingBottom: spacing.xxxl,
    paddingHorizontal: WOLT_PAGE_PADDING,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowPressed: { opacity: 0.92 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  preview: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 52 + spacing.md,
  },
});
