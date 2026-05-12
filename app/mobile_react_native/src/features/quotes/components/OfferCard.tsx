import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { QuoteOffer } from "@/features/quotes/types/quoteOffer";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

type Props = {
  offer: QuoteOffer;
  onAccept: (offer: QuoteOffer) => void;
  busy?: boolean;
};

export function OfferCard({ offer, onAccept, busy }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.proName}>{offer.proName}</Text>
        <Text style={styles.price}>{offer.price}</Text>
      </View>
      <Text style={styles.meta}>
        ⭐ {offer.rating} · {offer.eta} · {offer.distance}
      </Text>
      <Text style={styles.note}>{offer.note}</Text>
      <Pressable
        style={[styles.accept, busy && styles.acceptDisabled]}
        onPress={() => onAccept(offer)}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text style={styles.acceptText}>Accept</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  proName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  meta: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
  },
  note: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  accept: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: colors.woltSeeAllBg,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: radii.button,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  acceptDisabled: {
    opacity: 0.75,
  },
  acceptText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
});
