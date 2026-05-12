import "react-native-reanimated";
import "react-native-gesture-handler";

import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_900Black,
  useFonts,
} from "@expo-google-fonts/nunito";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/theme/tokens";
import { fontFamily } from "@/theme/fonts";
import { useFirebaseAuthState } from "@/features/auth/hooks/useFirebaseAuthState";
import { useNotificationResponseNavigation } from "@/features/notifications/hooks/useNotificationResponseNavigation";
import { usePushNotificationRegistration } from "@/features/notifications/hooks/usePushNotificationRegistration";
import { useReviewPromptPopup } from "@/features/notifications/hooks/useReviewPromptPopup";
import { cleanupMyDemoConversation } from "@/data/repositories/chatRepository";

void SplashScreen.preventAutoHideAsync();

type ComponentWithDefaultStyle = {
  defaultProps?: {
    style?: unknown;
  };
};

/**
 * Root layout for the entire app.
 *
 * - File-based routes live under `app/` (Expo Router).
 * - Feature UI + business logic live under `src/features/` (imported by routes).
 * - Nunito is loaded here; brand colors are a **red platform** palette from `src/theme/tokens.ts`.
 */
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading: authLoading } = useFirebaseAuthState();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_900Black,
  });
  usePushNotificationRegistration();
  useNotificationResponseNavigation();
  useReviewPromptPopup();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded) return;
    const TextWithDefaults = Text as typeof Text & ComponentWithDefaultStyle;
    const TextInputWithDefaults = TextInput as typeof TextInput & ComponentWithDefaultStyle;
    TextWithDefaults.defaultProps = TextWithDefaults.defaultProps || {};
    TextWithDefaults.defaultProps.style = [
      { fontFamily: fontFamily.regular },
      TextWithDefaults.defaultProps.style,
    ];
    TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps || {};
    TextInputWithDefaults.defaultProps.style = [
      { fontFamily: fontFamily.regular },
      TextInputWithDefaults.defaultProps.style,
    ];
  }, [fontsLoaded]);

  useEffect(() => {
    if (authLoading) return;
    const inAuthGroup = segments[0] === "auth";
    if (!user && !inAuthGroup) {
      router.replace("/auth/sign-in");
      return;
    }
    if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [authLoading, user, segments, router]);

  useEffect(() => {
    if (!user) return;
    void cleanupMyDemoConversation();
  }, [user]);

  if ((!fontsLoaded && !fontError) || authLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </SafeAreaProvider>
  );
}
