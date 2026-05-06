import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

type Props = {
  title: string;
  description: string;
};

/** Use when a list has no backend data yet or the query returned zero rows. */
export function EmptyState({ title, description }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
