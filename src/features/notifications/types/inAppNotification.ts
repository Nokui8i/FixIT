/**
 * Drives list headline + avatar badge icon/color. Extend when adding new notification types.
 */
export type NotificationKind =
  | "offer"
  | "message"
  | "reminder"
  | "payment_succeeded"
  | "payment_failed"
  | "request"
  | "booking"
  | "marketing"
  | "review_request"
  | "system";

/**
 * In-app notification row. Production: load from Firestore `notifications` or merge with push payload.
 */
export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  /**
   * When set, the UI shows live-updating relative time from this epoch ms (refreshes every 30s).
   * When omitted, `timeLabel` is shown as static text.
   */
  createdAtMs?: number;
  /** Fallback copy when `createdAtMs` is not provided. */
  timeLabel: string;
  read: boolean;
  kind: NotificationKind;
  /** Profile image URL of the sender (pro or customer). Omitted for initials / logo fallbacks. */
  senderAvatarUrl?: string;
  /** Used for initials when `senderAvatarUrl` is missing (e.g. "Marco Silva"). */
  senderDisplayName?: string;
  bookingId?: string;
  proId?: string;
  /**
   * Platform-originated row: show bundled app mark instead of sender photo (e.g. payment receipt).
   * `kind: "system"` implies this unless you override with a sender photo.
   */
  useAppLogoForAvatar?: boolean;
};
