import { Stack } from "expo-router";
import React from "react";
import { colors } from "@/theme/tokens";

/**
 * Pro (professional) area under `/pro/*`.
 * Separate from customer discovery so we can add auth guards later.
 */
export default function ProLayout() {
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
