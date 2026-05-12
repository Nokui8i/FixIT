import { Stack } from "expo-router";
import React from "react";
import { colors } from "@/theme/tokens";

/**
 * Nested stack for everything under `/request/*`.
 * Keeps back navigation predictable between "new request" and "offers".
 */
export default function RequestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
