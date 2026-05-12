import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { routes } from "@/navigation/routes";

/**
 * When the user opens a notification from the system tray / banner,
 * navigate to the relevant in-app destination (uses `content.data.kind` set by backend).
 */
function notificationOpenedAtMs(notification: Notifications.Notification): number | null {
  const d = notification.date;
  if (typeof d !== "number" || !Number.isFinite(d)) return null;
  return d > 1e12 ? d : d * 1000;
}

export function useNotificationResponseNavigation() {
  const router = useRouter();

  useEffect(() => {
    const navigateIfKnown = (
      raw: Notifications.NotificationContent["data"] | Record<string, unknown> | undefined,
    ) => {
      if (!raw || typeof raw !== "object") return;
      const kind = (raw as { kind?: unknown }).kind;
      if (kind === "pro_approved") {
        router.push(routes.proIncoming);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateIfKnown(response.notification.request.content.data);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const openedMs = notificationOpenedAtMs(response.notification);
      if (openedMs === null || Date.now() - openedMs > 120_000) return;
      navigateIfKnown(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, [router]);
}
