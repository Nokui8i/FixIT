import type { InAppNotification } from "../types/inAppNotification";

/**
 * Sample rows for UI / QA. Set `USE_DEV_NOTIFICATION_SAMPLES` to `false` in
 * `useInAppNotifications.ts` when Firestore replaces this feed.
 */
export function getDemoNotifications(): InAppNotification[] {
  const now = Date.now();
  const MIN = 60 * 1000;
  const HR = 60 * MIN;
  const DAY = 24 * HR;

  return [
    {
      id: "demo-1",
      title: "New offer on your request",
      body: "Marco Silva sent a quote for your locksmith job.",
      createdAtMs: now - 12 * MIN,
      timeLabel: "Recently",
      read: false,
      kind: "offer",
      senderDisplayName: "Marco Silva",
      senderAvatarUrl: "https://i.pravatar.cc/200?img=12",
    },
    {
      id: "demo-2",
      title: "New message",
      body: "Are you home between 2 and 4 PM tomorrow?",
      createdAtMs: now - 1 * HR,
      timeLabel: "Recently",
      read: false,
      kind: "message",
      senderDisplayName: "Ana Petrova",
      senderAvatarUrl: "https://i.pravatar.cc/200?img=45",
    },
    {
      id: "demo-3",
      title: "Profile reminder",
      body: "Add a phone number so pros can reach you faster after you accept an offer.",
      createdAtMs: now - 1 * DAY,
      timeLabel: "Recently",
      read: true,
      kind: "system",
    },
    {
      id: "demo-4",
      title: "Reminder",
      body: "Your service window starts in 30 minutes.",
      createdAtMs: now - 2 * DAY,
      timeLabel: "Recently",
      read: true,
      kind: "reminder",
      senderDisplayName: "Marco Silva",
      senderAvatarUrl: "https://i.pravatar.cc/200?img=12",
    },
    {
      id: "demo-5",
      title: "Payment received",
      body: "We charged your card $65.00 for booking #4821.",
      createdAtMs: now - 3 * DAY,
      timeLabel: "Recently",
      read: true,
      kind: "payment_succeeded",
      useAppLogoForAvatar: true,
    },
    {
      id: "demo-6",
      title: "Payment could not be completed",
      body: "Your bank declined the charge. Update your payment method to keep the booking.",
      createdAtMs: now - 4 * DAY,
      timeLabel: "Recently",
      read: true,
      kind: "payment_failed",
      useAppLogoForAvatar: true,
    },
    {
      id: "demo-7",
      title: "Request is live",
      body: "Nearby pros can now see your request.",
      createdAtMs: now - 5 * DAY,
      timeLabel: "Recently",
      read: true,
      kind: "request",
      useAppLogoForAvatar: true,
    },
  ];
}
