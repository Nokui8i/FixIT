import type { ImageSourcePropType } from "react-native";
import type { NotificationKind } from "@/features/notifications/types/inAppNotification";

/**
 * Local PNG badges (see `assets/notifications/`). Bell is shared for reminder, request, booking, system.
 */
export const notificationBadgeImages: Record<
  NotificationKind,
  ImageSourcePropType
> = {
  offer: require("../../../../assets/notifications/offer.png"),
  message: require("../../../../assets/notifications/message.png"),
  reminder: require("../../../../assets/notifications/bell.png"),
  payment_succeeded: require("../../../../assets/notifications/payment_succeeded.png"),
  payment_failed: require("../../../../assets/notifications/payment_failed.png"),
  request: require("../../../../assets/notifications/bell.png"),
  booking: require("../../../../assets/notifications/bell.png"),
  marketing: require("../../../../assets/notifications/bell.png"),
  review_request: require("../../../../assets/notifications/bell.png"),
  pro_approved: require("../../../../assets/notifications/bell.png"),
  system: require("../../../../assets/notifications/bell.png"),
};
