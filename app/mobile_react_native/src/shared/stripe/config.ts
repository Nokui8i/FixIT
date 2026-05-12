import Constants from "expo-constants";

export function getStripePublishableKey(): string {
  const fromExtra = Constants.expoConfig?.extra?.stripe?.publishableKey;
  return typeof fromExtra === "string" ? fromExtra.trim() : "";
}
