import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { listenMyNotifications, markNotificationRead } from "@/data/repositories/notificationsRepository";
import { rateBookingPath } from "@/navigation/routes";

export function useReviewPromptPopup() {
  const router = useRouter();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let unsub: (() => void) | null = null;
    void (async () => {
      try {
        unsub = await listenMyNotifications((rows) => {
          const candidate = rows.find(
            (n) => !n.read && n.kind === "payment_succeeded" && !!n.bookingId,
          );
          if (!candidate || seenRef.current.has(candidate.id)) return;
          seenRef.current.add(candidate.id);
          Alert.alert(
            "Rate this job",
            "Payment is complete. Do you want to rate now?",
            [
              { text: "Later", style: "cancel" },
              {
                text: "Rate now",
                onPress: () => {
                  void markNotificationRead(candidate.id);
                  const target = rateBookingPath(candidate.bookingId!);
                  const withPro = candidate.proId
                    ? `${target}?proId=${encodeURIComponent(candidate.proId)}`
                    : target;
                  router.push(withPro);
                },
              },
            ],
          );
        });
      } catch {
        // User not signed-in yet; listener starts later.
      }
    })();
    return () => {
      unsub?.();
    };
  }, [router]);
}

