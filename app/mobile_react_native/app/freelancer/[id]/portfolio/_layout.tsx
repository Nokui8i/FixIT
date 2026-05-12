import { Stack } from "expo-router";

/**
 * Stack for portfolio index + single-album screen (keeps back navigation consistent).
 */
export default function FreelancerPortfolioLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
