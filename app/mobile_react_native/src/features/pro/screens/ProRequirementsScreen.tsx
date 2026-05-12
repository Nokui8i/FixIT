import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { colors, radii, spacing } from "@/theme/tokens";

const beforeApproval = [
  "Identity + tax (Stripe)",
  "Background check when enabled",
  "Legal agreements accepted",
  "Admin approval (verification_status)",
];

const untilApproved = ["Quotes", "Customer discovery", "Unmasked contact"];

export function ProRequirementsScreen() {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Pro requirements" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Before approval</Text>
          {beforeApproval.map((item) => (
            <Text key={item} style={styles.item}>
              • {item}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Blocked until approved</Text>
          {untilApproved.map((item) => (
            <Text key={item} style={styles.item}>
              • {item}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  item: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
