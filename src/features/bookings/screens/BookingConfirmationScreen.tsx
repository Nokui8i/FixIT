import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { routes } from "@/navigation/routes";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { ScreenPageTitle } from "@/shared/components/ScreenPageTitle";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

/**
 * Shown after `acceptQuote` succeeds with a `bookingId`.
 * Until Firebase is wired, this route is mainly for layout and deep-link shape.
 */
export function BookingConfirmationScreen() {
  const { requestId, bookingId } = useLocalSearchParams<{
    requestId?: string | string[];
    bookingId?: string | string[];
  }>();
  const req =
    typeof requestId === "string"
      ? requestId
      : Array.isArray(requestId)
        ? requestId[0] ?? ""
        : "";
  const book =
    typeof bookingId === "string"
      ? bookingId
      : Array.isArray(bookingId)
        ? bookingId[0] ?? ""
        : "";

  return (
    <CustomerAppChrome>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenPageTitle padded={false}>Booking</ScreenPageTitle>
        <Text style={styles.lead}>
          When quote acceptance is implemented, this screen confirms the booking
          and guides payment and contact rules.
        </Text>

        {req ? (
          <View style={styles.block}>
            <Text style={styles.k}>Request</Text>
            <Text style={styles.mono}>{req}</Text>
          </View>
        ) : null}
        {book ? (
          <View style={styles.block}>
            <Text style={styles.k}>Booking</Text>
            <Text style={styles.mono}>{book}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            Open with query{" "}
            <Text style={styles.monoInline}>?bookingId=…</Text> after
            `acceptQuote` returns an id, or implement navigation from Offers.
          </Text>
        )}

        <View style={styles.checklist}>
          <Text style={styles.checkTitle}>Integration checklist</Text>
          <Text style={styles.checkItem}>
            • Stripe payment intent or capture-before-start policy
          </Text>
          <Text style={styles.checkItem}>
            • Firestore `bookings` read for status and pro contact rules
          </Text>
          <Text style={styles.checkItem}>
            • Push / in-app message when pro is on the way
          </Text>
        </View>

        <Pressable
          style={styles.primary}
          onPress={() => router.replace(routes.home)}
        >
          <Text style={styles.primaryText}>Back to home</Text>
        </Pressable>
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  block: {
    marginBottom: spacing.md,
  },
  k: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 14,
    color: colors.textPrimary,
  },
  monoInline: {
    fontFamily: "monospace",
    fontSize: 13,
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  checklist: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  checkTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  checkItem: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  primary: {
    backgroundColor: colors.woltSeeAllBg,
    borderRadius: radii.button,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
