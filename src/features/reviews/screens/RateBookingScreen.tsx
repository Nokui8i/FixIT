import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { submitMyReview } from "@/data/repositories/reviewsRepository";
import { routes } from "@/navigation/routes";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { colors, radii, spacing } from "@/theme/tokens";

export function RateBookingScreen() {
  const { bookingId, proId } = useLocalSearchParams<{
    bookingId?: string | string[];
    proId?: string | string[];
  }>();
  const booking = useMemo(
    () => (typeof bookingId === "string" ? bookingId : Array.isArray(bookingId) ? bookingId[0] ?? "" : ""),
    [bookingId],
  );
  const pro = useMemo(
    () => (typeof proId === "string" ? proId : Array.isArray(proId) ? proId[0] ?? "" : ""),
    [proId],
  );

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = () => {
    if (!booking || !pro) {
      Alert.alert("Missing review context", "Booking or pro id is missing.");
      return;
    }
    if (rating < 1) {
      Alert.alert("Select rating", "Please choose a star rating.");
      return;
    }
    setSaving(true);
    void (async () => {
      try {
        await submitMyReview({ bookingId: booking, proId: pro, rating, comment });
        Alert.alert("Thanks!", "Your rating was submitted.");
        router.replace(routes.account);
      } catch (e: unknown) {
        Alert.alert("Could not submit", e instanceof Error ? e.message : "Try again.");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <CustomerAppChrome>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rate completed work</Text>
        <Text style={styles.subtitle}>Your feedback is shared after successful payment.</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => setRating(value)} style={styles.starBtn}>
              <Text style={[styles.star, value <= rating && styles.starActive]}>★</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Write a short review (optional)"
          multiline
          style={styles.input}
        />

        <Pressable
          style={({ pressed }) => [styles.submit, pressed && styles.submitPressed, saving && styles.submitDisabled]}
          onPress={onSubmit}
          disabled={saving}
        >
          <Text style={styles.submitText}>{saving ? "Submitting..." : "Submit rating"}</Text>
        </Pressable>
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    fontSize: 14,
  },
  starsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  starBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  star: {
    fontSize: 36,
    color: "#D1D5DB",
  },
  starActive: {
    color: "#F59E0B",
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    padding: spacing.md,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
    color: colors.textPrimary,
  },
  submit: {
    backgroundColor: colors.textPrimary,
    borderRadius: radii.button,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  submitPressed: { opacity: 0.92 },
  submitDisabled: { opacity: 0.7 },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

