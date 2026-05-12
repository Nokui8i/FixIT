import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { CustomerAppChrome } from "@/shared/components/CustomerAppChrome";
import { colors, radii, shadows, spacing } from "@/theme/tokens";
import { loadMyServiceRequests, type MyServiceRequestRow } from "@/data/repositories/requestsRepository";
import { requestOffersPath } from "@/navigation/routes";

export function MyRequestsScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MyServiceRequestRow[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const rows = await loadMyServiceRequests();
        if (alive) setItems(rows);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <CustomerAppChrome>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>My requests</Text>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySub}>When you post a request it will appear here.</Text>
          </View>
        ) : (
          items.map((row) => (
            <Pressable
              key={row.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.push(requestOffersPath(row.id))}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{row.title}</Text>
                <Text style={styles.statusPill}>{row.status}</Text>
              </View>
              {row.details ? <Text style={styles.cardDetails}>{row.details}</Text> : null}
              <Text style={styles.cardMeta}>
                {row.urgency.toUpperCase()} {row.addressLine ? `• ${row.addressLine}` : ""}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </CustomerAppChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.lg,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  emptySub: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "#FAFAFA",
    padding: spacing.md,
    ...shadows.card,
  },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  statusPill: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    overflow: "hidden",
  },
  cardDetails: { marginTop: spacing.xs, fontSize: 13, color: colors.textSecondary },
  cardMeta: { marginTop: spacing.sm, fontSize: 12, color: colors.chevronMuted },
});
