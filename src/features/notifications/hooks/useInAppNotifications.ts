import { useCallback, useEffect, useMemo, useState } from "react";
import type { InAppNotification } from "@/features/notifications/types/inAppNotification";
import {
  dismissNotification,
  listenMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/data/repositories/notificationsRepository";

type UseInAppNotificationsOptions = {
  serviceUpdatesEnabled?: boolean;
  marketingEnabled?: boolean;
};

type ServiceUpdateKind =
  | "offer"
  | "request"
  | "booking"
  | "review_request"
  | "payment_succeeded"
  | "payment_failed"
  | "reminder";

const SERVICE_UPDATE_KINDS = new Set<ServiceUpdateKind>([
  "offer",
  "request",
  "booking",
  "review_request",
  "payment_succeeded",
  "payment_failed",
  "reminder",
] );

function isServiceUpdateKind(kind: InAppNotification["kind"]): boolean {
  return SERVICE_UPDATE_KINDS.has(kind as ServiceUpdateKind);
}

/**
 * Live notification list for the signed-in customer.
 *
 * **Wire Firestore here** (see project README):
 * - Collection e.g. `users/{uid}/notifications` or top-level `notifications` with `userId` + index.
 * - `onSnapshot` ordered by `createdAt` desc → map docs to `InAppNotification` (id, title, body,
 *   `createdAtMs` from Timestamp, `read`, `kind`, `senderAvatarUrl`, `senderDisplayName`,
 *   `useAppLogoForAvatar` for platform rows).
 * - `markRead` / `markAllRead`: `updateDoc` with `read: true` (and `readAt` if you track it).
 * - `dismiss`: `deleteDoc` or soft-archive field your product prefers.
 */
export function useInAppNotifications(options?: UseInAppNotificationsOptions) {
  const serviceUpdatesEnabled = options?.serviceUpdatesEnabled ?? true;
  const marketingEnabled = options?.marketingEnabled ?? true;
  const [items, setItems] = useState<InAppNotification[]>([]);

  useEffect(() => {
    if (!serviceUpdatesEnabled && !marketingEnabled) {
      setItems([]);
      return;
    }
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      unsubscribe = await listenMyNotifications(setItems);
    })();
    return () => {
      unsubscribe?.();
    };
  }, [marketingEnabled, serviceUpdatesEnabled]);

  const visibleItems = useMemo(
    () =>
      items.filter((n) => {
        if (n.kind === "message") {
          // Chat has its own dedicated inbox tab; keep this feed focused.
          return false;
        }
        if (isServiceUpdateKind(n.kind)) {
          return serviceUpdatesEnabled;
        }
        if (n.kind === "marketing") return marketingEnabled;
        // Keep system messages visible unless both channels are disabled.
        return serviceUpdatesEnabled || marketingEnabled;
      }),
    [items, marketingEnabled, serviceUpdatesEnabled],
  );

  const hasUnread = useMemo(() => visibleItems.some((n) => !n.read), [visibleItems]);

  const markRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    void markNotificationRead(id);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    void dismissNotification(id);
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const unreadIds = prev.filter((n) => !n.read).map((n) => n.id);
      void markAllNotificationsRead(unreadIds);
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, []);

  return { items: visibleItems, hasUnread, markRead, dismiss, markAllRead };
}
