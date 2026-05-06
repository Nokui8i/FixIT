import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { notificationBadgeImages } from "@/features/notifications/assets/notificationBadgeImages";
import { useRelativeTime } from "@/features/notifications/hooks/useRelativeTime";
import type {
  InAppNotification,
  NotificationKind,
} from "@/features/notifications/types/inAppNotification";
import { colors, spacing } from "@/theme/tokens";

const APP_LOGO = require("../../../../assets/brand/fixit-app-logo.png");

function kindHeadline(kind: NotificationKind): string {
  switch (kind) {
    case "offer":
      return "New offer";
    case "message":
      return "Message";
    case "reminder":
      return "Reminder";
    case "payment_succeeded":
      return "Payment";
    case "payment_failed":
      return "Payment issue";
    case "request":
      return "Request update";
    case "booking":
      return "Booking";
    case "review_request":
      return "Rate service";
    default:
      return "Notification";
  }
}

function badgeA11yLabel(kind: NotificationKind): string {
  switch (kind) {
    case "offer":
      return "Offer";
    case "message":
      return "Message";
    case "reminder":
      return "Reminder";
    case "payment_succeeded":
      return "Payment succeeded";
    case "payment_failed":
      return "Payment failed";
    case "request":
      return "Request";
    case "booking":
      return "Booking";
    case "review_request":
      return "Rate service";
    default:
      return "Notification";
  }
}

function initialFromSender(item: InAppNotification): string {
  const t = (item.senderDisplayName ?? item.title).trim();
  return t.length > 0 ? t.charAt(0).toUpperCase() : "?";
}

function rowTitle(item: InAppNotification): string {
  if (item.kind === "offer") return "New Offer received";
  if (item.kind === "review_request") {
    return `Rate ${item.senderDisplayName?.trim() || "your pro"}`;
  }
  return item.title;
}

function proName(item: InAppNotification): string {
  return item.senderDisplayName?.trim() || "your pro";
}

function rowSubtitle(item: InAppNotification): string {
  if (item.kind === "offer") {
    return `You received an offer from ${proName(item)}.`;
  }
  if (item.kind === "booking") {
    return `Booking update from ${proName(item)}.`;
  }
  if (item.kind === "request") {
    return `Request update from ${proName(item)}.`;
  }
  if (item.kind === "review_request") {
    return `Please rate ${proName(item)}.`;
  }
  if (item.kind === "payment_succeeded") {
    return `Payment for ${proName(item)} was confirmed.`;
  }
  if (item.kind === "payment_failed") {
    return `Payment for ${proName(item)} needs attention.`;
  }
  return item.body;
}

function useAppLogoAvatar(item: InAppNotification): boolean {
  return item.kind === "system" || item.useAppLogoForAvatar === true;
}

type Props = {
  item: InAppNotification;
  isLast: boolean;
  onDismiss: (id: string) => void;
  onOpen: (item: InAppNotification) => void;
};

/**
 * Notification row: white background, hairline black divider, unread = small red dot only.
 */
export function NotificationListRow({
  item,
  isLast,
  onDismiss,
  onOpen,
}: Props) {
  const displayTime = useRelativeTime(item.createdAtMs, item.timeLabel);
  const badgeSource = notificationBadgeImages[item.kind];
  const showLogo = useAppLogoAvatar(item);
  const showSenderPhoto = !showLogo && Boolean(item.senderAvatarUrl);

  return (
    <View style={[styles.row, !isLast && styles.rowWithDivider]}>
      <View style={styles.rowInner}>
        <View style={styles.topRow}>
          <Text style={styles.topTitle}>{kindHeadline(item.kind)}</Text>
          <View style={styles.topRowEnd}>
            {!item.read ? (
              <View style={styles.unreadDot} accessibilityLabel="Unread" />
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closePressed]}
              onPress={() => onDismiss(item.id)}
              hitSlop={10}
              accessibilityLabel="Dismiss notification"
              accessibilityRole="button"
            >
              <Text style={styles.closeGlyph}>×</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.bodyRow}
          onPress={() => onOpen(item)}
          accessibilityRole="button"
          accessibilityLabel={`${rowTitle(item)}. ${rowSubtitle(item)}. ${displayTime}`}
        >
          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatar,
                showLogo && styles.avatarLogoPlate,
                showSenderPhoto && styles.avatarPhotoPlate,
              ]}
            >
              {showLogo ? (
                <Image
                  source={APP_LOGO}
                  style={styles.avatarPhoto}
                  resizeMode="cover"
                  accessibilityLabel="FixIT"
                />
              ) : showSenderPhoto && item.senderAvatarUrl ? (
                <Image
                  source={{ uri: item.senderAvatarUrl }}
                  style={styles.avatarPhoto}
                  resizeMode="cover"
                  accessibilityLabel={item.senderDisplayName ?? "Sender"}
                />
              ) : (
                <Text style={styles.avatarLetter}>{initialFromSender(item)}</Text>
              )}
            </View>
            <View style={styles.badge}>
              <Image
                source={badgeSource}
                style={styles.badgeImage}
                resizeMode="contain"
                accessibilityLabel={badgeA11yLabel(item.kind)}
              />
            </View>
          </View>
          <View style={styles.textCol}>
            <Text
              style={[styles.name, !item.read && styles.nameUnread]}
              numberOfLines={2}
            >
              {rowTitle(item)}
            </Text>
            <Text style={styles.subtitle} numberOfLines={3}>
              {rowSubtitle(item)}
            </Text>
            <Text style={styles.time}>{displayTime}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const AVATAR = 48;
const BADGE = 28;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: colors.background,
  },
  rowWithDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.listDivider,
  },
  rowInner: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  topTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  topRowEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  closePressed: {
    backgroundColor: colors.woltSeeAllBg,
  },
  closeGlyph: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.textSecondary,
    fontWeight: "300",
    marginTop: -2,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    marginRight: spacing.md,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLogoPlate: {
    backgroundColor: "#FFFFFF",
  },
  avatarPhotoPlate: {
    backgroundColor: colors.surface,
  },
  avatarPhoto: {
    width: "100%",
    height: "100%",
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  badge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: BADGE,
    height: BADGE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  badgeImage: {
    width: "100%",
    height: "100%",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  nameUnread: {
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    lineHeight: 20,
  },
  time: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
