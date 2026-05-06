import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useLocalAccountProfile } from "@/features/account/hooks/useLocalAccountProfile";
import { saveMyPushToken } from "@/data/repositories/userRepository";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  return token.data;
}

export function usePushNotificationRegistration() {
  const { profile } = useLocalAccountProfile();
  const busyRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile.pushNotificationsEnabled || busyRef.current) return;
    busyRef.current = true;
    void (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) {
          Alert.alert(
            "Push permission needed",
            "Enable notifications on your phone to receive updates when the app is closed.",
          );
          return;
        }
        if (lastTokenRef.current === token) return;
        lastTokenRef.current = token;
        await saveMyPushToken(token);
      } catch {
        // Keep silent in production UX.
      } finally {
        busyRef.current = false;
      }
    })();
  }, [profile.pushNotificationsEnabled]);
}

